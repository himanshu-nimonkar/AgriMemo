"""
AgriMemo — Cloudflare Workers AI Structuring Engine
Converts transcripts into structured data using Schema A (predefined) and Schema B (dynamic).
Both approaches run concurrently via asyncio.gather.
"""
import asyncio
import json
from typing import Any, Dict, Optional, Tuple

import httpx
import structlog

from app.config import Settings

log = structlog.get_logger()

# ── Predefined Schemas (Approach A) ───────────────────────────────────────────

PREDEFINED_SCHEMAS: Dict[str, Dict[str, Any]] = {
    "task": {
        "type": "task",
        "title": "string — what needs to be done",
        "description": "string or null",
        "context": "string or null — background information",
        "scheduled_time": "ISO 8601 string or null",
        "due_date": "ISO 8601 string or null",
        "assignee": "string or null",
        "priority": "low | medium | high | urgent | null",
        "location": "string or null",
        "tags": "array of strings",
    },
    "observation": {
        "type": "observation",
        "location": "string or null",
        "crop": "string or null",
        "subject": "string or null",
        "condition": "string or null",
        "issue": "string or null",
        "severity": "none | low | medium | high | critical | null",
        "recommended_action": "string or null",
        "tags": "array of strings",
    },
    "reminder": {
        "type": "reminder",
        "title": "string — what to remember",
        "remind_at": "ISO 8601 string or null",
        "repeat": "string or null — e.g. daily, weekly",
        "notes": "string or null",
        "tags": "array of strings",
    },
    "scheduling": {
        "type": "scheduling",
        "event_title": "string",
        "participants": "array of strings",
        "start_time": "ISO 8601 string or null",
        "end_time": "ISO 8601 string or null",
        "location": "string or null",
        "notes": "string or null",
        "tags": "array of strings",
    },
    "field_observation": {
        "type": "field_observation",
        "field_id": "string or null",
        "block": "string or null",
        "crop": "string or null",
        "observation": "string — what was observed",
        "measurements": "object of key-value pairs or null",
        "weather": "string or null",
        "recommended_action": "string or null",
        "severity": "none | low | medium | high | critical | null",
        "tags": "array of strings",
    },
    "note": {
        "type": "note",
        "title": "string or null",
        "content": "string — full note content",
        "tags": "array of strings",
    },
}

# ── Prompts ────────────────────────────────────────────────────────────────────

SCHEMA_A_SYSTEM = """You are a voice note classifier for an agricultural field intelligence system.
Your job is to extract structured data from spoken voice notes recorded in the field.
You must return ONLY a valid JSON object — no markdown code fences, no explanation, no preamble.
Never invent information that is not present in the voice note.
Use null for fields you cannot determine.
If the voice note is clearly unrelated to agriculture, farming, field work, crops, livestock,
irigation, equipment, soil, weather, or any related topic, still classify it — use type 'note'
and set the content field to the raw transcript. Do not refuse or return an error."""

SCHEMA_A_USER_TEMPLATE = """Classify this voice note into one of these types:
task, observation, reminder, scheduling, field_observation, note

Then extract all relevant fields using the schema for that type.

Voice note: "{transcript}"

Available schemas:
{schemas_json}

Return the single best-matching JSON object with all available fields filled in.
Set fields to null if not mentioned in the note.
Never add fields that don't exist in the schema.
If the content is not agricultural in nature, use type 'note'."""

SCHEMA_B_SYSTEM = """You are a structured data extractor for an agricultural field intelligence system.
You must return ONLY a valid JSON object — no markdown, no explanation, no preamble.
Extract all useful information from the voice note into whatever structure makes the most sense."""

SCHEMA_B_USER_TEMPLATE = """Extract all structured information from this voice note.

Voice note: "{transcript}"

Return a JSON object with:
- "type": the category you infer from context (free choice of string)
- "agri_relevant": true if the note relates to agriculture, farming, crops, livestock, irrigation,
  equipment maintenance, soil, weather, field work, or any related topic. false otherwise.
- "rejection_reason": if agri_relevant is false, explain briefly why (e.g. 'personal note, no agricultural content'). null if agri_relevant is true.
- "entities": an object containing all named things: people, places, crops, equipment, times
- "intent": what the speaker wants to happen or has observed
- "urgency": "low", "medium", or "high"
- "confidence": your confidence in this analysis as a float 0.0 to 1.0
- Any other relevant fields that would be useful for a field worker

Return only the JSON object."""


# ── JSON Response Cleaner ──────────────────────────────────────────────────────


def clean_json_response(raw: str) -> dict:
    """
    Strips markdown fences, leading/trailing whitespace, then parses JSON.
    Raises json.JSONDecodeError if still invalid after cleaning.
    """
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(
            lines[1:-1] if lines[-1].strip() == "```" else lines[1:]
        )
    cleaned = cleaned.strip()
    return json.loads(cleaned)


# ── Service Class ──────────────────────────────────────────────────────────────


class StructuringEngine:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(settings.cf_ai_timeout_seconds)
        )

    async def _call_cloudflare(self, messages: list) -> str:
        """
        POST to Cloudflare Workers AI and return the raw response text.
        Raises httpx exceptions on network failure.
        """
        response = await self._client.post(
            self.settings.cloudflare_ai_url,
            json={
                "messages": messages,
                "max_tokens": self.settings.cf_ai_max_tokens,
                "temperature": self.settings.cf_ai_temperature,
            },
            headers={
                "Authorization": f"Bearer {self.settings.cloudflare_api_token}",
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["result"]["response"]

    async def _structure_approach_a(self, transcript: str) -> Optional[dict]:
        """
        Approach A: Classify transcript into a predefined schema.
        Returns parsed dict or None on failure.
        """
        messages = [
            {"role": "system", "content": SCHEMA_A_SYSTEM},
            {
                "role": "user",
                "content": SCHEMA_A_USER_TEMPLATE.format(
                    transcript=transcript,
                    schemas_json=json.dumps(PREDEFINED_SCHEMAS, indent=2),
                ),
            },
        ]

        raw = await self._call_cloudflare(messages)
        try:
            return clean_json_response(raw)
        except json.JSONDecodeError:
            # Retry once with an explicit JSON fix instruction
            log.warning("schema_a_json_parse_failed_retrying", raw=raw[:200])
            messages.append({"role": "assistant", "content": raw})
            messages.append(
                {
                    "role": "user",
                    "content": "You returned invalid JSON. Return ONLY a JSON object, nothing else.",
                }
            )
            raw2 = await self._call_cloudflare(messages)
            return clean_json_response(raw2)

    async def _structure_approach_b(self, transcript: str) -> Optional[dict]:
        """
        Approach B: Dynamic free-form extraction.
        Returns parsed dict or None on failure.
        """
        messages = [
            {"role": "system", "content": SCHEMA_B_SYSTEM},
            {
                "role": "user",
                "content": SCHEMA_B_USER_TEMPLATE.format(transcript=transcript),
            },
        ]

        raw = await self._call_cloudflare(messages)
        try:
            return clean_json_response(raw)
        except json.JSONDecodeError:
            log.warning("schema_b_json_parse_failed_retrying", raw=raw[:200])
            messages.append({"role": "assistant", "content": raw})
            messages.append(
                {
                    "role": "user",
                    "content": "You returned invalid JSON. Return ONLY a JSON object, nothing else.",
                }
            )
            raw2 = await self._call_cloudflare(messages)
            return clean_json_response(raw2)

    async def structure_both(
        self, transcript: str
    ) -> Tuple[Optional[dict], Optional[dict]]:
        """
        Runs Approach A and Approach B concurrently.
        Returns (schema_a_result, schema_b_result).
        Each can be None if that approach failed.
        Never raises — failures are logged and returned as None.
        """
        results = await asyncio.gather(
            self._structure_approach_a(transcript),
            self._structure_approach_b(transcript),
            return_exceptions=True,
        )

        schema_a = results[0] if not isinstance(results[0], BaseException) else None
        schema_b = results[1] if not isinstance(results[1], BaseException) else None

        if isinstance(results[0], BaseException):
            log.error("schema_a_failed", error=str(results[0]))
        if isinstance(results[1], BaseException):
            log.error("schema_b_failed", error=str(results[1]))

        return schema_a, schema_b

    async def health_check(self) -> bool:
        """Send a minimal prompt to verify Cloudflare AI is reachable."""
        try:
            raw = await self._call_cloudflare(
                [{"role": "user", "content": 'Reply with: {"ok": true}'}]
            )
            return bool(raw)
        except Exception:
            return False

    async def close(self) -> None:
        await self._client.aclose()
