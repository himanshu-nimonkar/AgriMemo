"""
AgriMemo — Application Configuration
Uses pydantic-settings to load all config from environment variables.
"""
import json
from functools import lru_cache
from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Application ──────────────────────────────────────────────────────────
    app_env: str = Field(default="development", alias="APP_ENV")
    app_name: str = Field(default="AgriMemo", alias="APP_NAME")
    app_version: str = Field(default="1.0.0", alias="APP_VERSION")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    allowed_origins: List[str] = Field(
        default=["http://localhost:5173", "http://localhost:3000"],
        alias="ALLOWED_ORIGINS",
    )

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v) -> List[str]:
        """Accept comma-separated string or JSON list from env var."""
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                return json.loads(v)
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    max_audio_file_size_mb: int = Field(default=25, alias="MAX_AUDIO_FILE_SIZE_MB")
    audio_temp_dir: str = Field(default="/tmp/agrimemo_audio", alias="AUDIO_TEMP_DIR")
    audio_storage_dir: str = Field(default="./data/audio", alias="AUDIO_STORAGE_DIR")

    # ── Deepgram ──────────────────────────────────────────────────────────────
    deepgram_api_key: str = Field(alias="DEEPGRAM_API_KEY")
    deepgram_model: str = Field(default="nova-2", alias="DEEPGRAM_MODEL")
    deepgram_language: str = Field(default="en-US", alias="DEEPGRAM_LANGUAGE")
    deepgram_smart_format: bool = Field(default=True, alias="DEEPGRAM_SMART_FORMAT")
    deepgram_punctuate: bool = Field(default=True, alias="DEEPGRAM_PUNCTUATE")
    stt_max_retries: int = Field(default=3, alias="STT_MAX_RETRIES")
    stt_retry_base_seconds: int = Field(default=2, alias="STT_RETRY_BASE_SECONDS")
    stt_timeout_seconds: int = Field(default=60, alias="STT_TIMEOUT_SECONDS")
    stt_confidence_threshold: float = Field(
        default=0.75, alias="STT_CONFIDENCE_THRESHOLD"
    )

    # ── Cloudflare Workers AI ─────────────────────────────────────────────────
    cloudflare_api_token: str = Field(alias="CLOUDFLARE_API_TOKEN")
    cloudflare_account_id: str = Field(alias="CLOUDFLARE_ACCOUNT_ID")
    cloudflare_ai_model: str = Field(
        default="@cf/meta/llama-3.1-8b-instruct", alias="CLOUDFLARE_AI_MODEL"
    )
    cloudflare_ai_gateway_name: str = Field(
        default="", alias="CLOUDFLARE_AI_GATEWAY_NAME"
    )
    cf_ai_max_retries: int = Field(default=2, alias="CF_AI_MAX_RETRIES")
    cf_ai_timeout_seconds: int = Field(default=30, alias="CF_AI_TIMEOUT_SECONDS")
    cf_ai_max_tokens: int = Field(default=1024, alias="CF_AI_MAX_TOKENS")
    cf_ai_temperature: float = Field(default=0.1, alias="CF_AI_TEMPERATURE")

    # ── Storage ───────────────────────────────────────────────────────────────
    json_store_path: str = Field(default="./data/notes.json", alias="JSON_STORE_PATH")
    event_log_path: str = Field(
        default="./data/events.jsonl", alias="EVENT_LOG_PATH"
    )

    # ── Deduplication ─────────────────────────────────────────────────────────
    dedup_enabled: bool = Field(default=True, alias="DEDUP_ENABLED")
    dedup_similarity_threshold: float = Field(
        default=0.88, alias="DEDUP_SIMILARITY_THRESHOLD"
    )
    dedup_window_minutes: int = Field(default=5, alias="DEDUP_WINDOW_MINUTES")

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    rate_limit_per_minute: int = Field(default=20, alias="RATE_LIMIT_PER_MINUTE")
    rate_limit_per_hour: int = Field(default=150, alias="RATE_LIMIT_PER_HOUR")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "populate_by_name": True,
        "extra": "ignore",
    }

    @property
    def cloudflare_ai_url(self) -> str:
        """Returns the correct AI endpoint, routing through AI Gateway if configured."""
        if self.cloudflare_ai_gateway_name:
            return (
                f"https://gateway.ai.cloudflare.com/v1/"
                f"{self.cloudflare_account_id}/"
                f"{self.cloudflare_ai_gateway_name}/"
                f"workers-ai/"
                f"{self.cloudflare_ai_model}"
            )
        return (
            f"https://api.cloudflare.com/client/v4/accounts/"
            f"{self.cloudflare_account_id}/ai/run/"
            f"{self.cloudflare_ai_model}"
        )

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def max_file_bytes(self) -> int:
        return self.max_audio_file_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
