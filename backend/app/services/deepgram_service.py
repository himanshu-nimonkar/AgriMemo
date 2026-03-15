"""
AgriMemo — Deepgram Speech-to-Text Service
Nova-2 model with retry logic via tenacity.
"""
import logging
from dataclasses import dataclass
from typing import Optional

import httpx
import structlog
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential_jitter,
)

from app.config import Settings

log = structlog.get_logger()


# ── Custom Exceptions ──────────────────────────────────────────────────────────


class DeepgramError(Exception):
    pass


class DeepgramAuthError(DeepgramError):
    pass


class DeepgramBadRequestError(DeepgramError):
    pass


class AllRetriesExhaustedError(DeepgramError):
    pass


# ── Result Dataclass ───────────────────────────────────────────────────────────


@dataclass
class TranscriptionResult:
    transcript: str
    confidence: Optional[float]
    duration_seconds: float
    attempt_count: int = 1


# ── Service Class ──────────────────────────────────────────────────────────────


class DeepgramService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(settings.stt_timeout_seconds)
        )
        self._attempt_count = 0

    def _make_retry_decorator(self):
        """Build tenacity retry decorator from settings."""
        return retry(
            stop=stop_after_attempt(self.settings.stt_max_retries),
            wait=wait_exponential_jitter(
                initial=self.settings.stt_retry_base_seconds,
                max=60,
                jitter=1,
            ),
            retry=retry_if_exception_type(
                (
                    httpx.TimeoutException,
                    httpx.NetworkError,
                    httpx.RemoteProtocolError,
                )
            ),
            before_sleep=before_sleep_log(log, logging.WARNING),  # type: ignore[arg-type]
            reraise=True,
        )

    async def _call_deepgram(self, audio_bytes: bytes, input_format: str = "wav") -> dict:
        """
        Internal method: single HTTP call to Deepgram.
        Raises DeepgramAuthError / DeepgramBadRequestError without retrying.
        Raises httpx exceptions for retryable failures.
        """
        self._attempt_count += 1
        response = await self._client.post(
            "https://api.deepgram.com/v1/listen",
            params={
                "model": self.settings.deepgram_model,
                "language": self.settings.deepgram_language,
                "smart_format": str(self.settings.deepgram_smart_format).lower(),
                "punctuate": str(self.settings.deepgram_punctuate).lower(),
            },
            content=audio_bytes,
            headers={
                "Authorization": f"Token {self.settings.deepgram_api_key}",
                "Content-Type": f"audio/{input_format.lower()}",
            },
        )

        if response.status_code == 401:
            raise DeepgramAuthError("Invalid Deepgram API key — check DEEPGRAM_API_KEY")
        if response.status_code == 400:
            raise DeepgramBadRequestError(response.text)
        if response.status_code == 429:
            # Treated as retryable via RemoteProtocolError pattern
            raise httpx.RemoteProtocolError(  # type: ignore[call-arg]
                "Rate limited by Deepgram", request=response.request
            )
        response.raise_for_status()
        return response.json()

    async def transcribe(self, audio_bytes: bytes, input_format: str = "wav") -> TranscriptionResult:
        """
        Public method. Calls Deepgram with retry, parses result.
        Raises AllRetriesExhaustedError if tenacity exhausts retries.
        Raises DeepgramAuthError immediately on 401.
        """
        self._attempt_count = 0
        retry_decorated = self._make_retry_decorator()(self._call_deepgram)

        try:
            data = await retry_decorated(audio_bytes, input_format)
        except DeepgramAuthError:
            raise
        except DeepgramBadRequestError:
            raise
        except Exception as e:
            raise AllRetriesExhaustedError(
                f"Deepgram failed after {self._attempt_count} attempt(s): {e}"
            ) from e

        try:
            alt = data["results"]["channels"][0]["alternatives"][0]
        except (KeyError, IndexError) as e:
            raise AllRetriesExhaustedError(
                f"Unexpected Deepgram response structure: {e}"
            ) from e

        transcript = alt.get("transcript", "").strip()
        confidence = alt.get("confidence")
        
        # Deepgram includes duration in metadata
        duration = data.get("metadata", {}).get("duration", 0.0)

        return TranscriptionResult(
            transcript=transcript,
            confidence=confidence,
            duration_seconds=duration,
            attempt_count=self._attempt_count,
        )

    async def health_check(self) -> bool:
        """
        Send a minimal request to verify Deepgram is reachable and key is valid.
        Expects 400 (bad audio) = healthy; 401 = unhealthy; timeout = unhealthy.
        """
        try:
            response = await self._client.post(
                "https://api.deepgram.com/v1/listen",
                content=b"",
                headers={
                    "Authorization": f"Token {self.settings.deepgram_api_key}",
                    "Content-Type": "audio/wav",
                },
                timeout=5.0,
            )
            # 400 = bad audio = API reachable and key valid
            # 401 = auth failure = unhealthy
            return response.status_code != 401
        except Exception:
            return False

    async def close(self) -> None:
        await self._client.aclose()
