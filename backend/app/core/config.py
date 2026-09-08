from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_backend_env = Path(__file__).resolve().parent.parent.parent / ".env"
_root_env = Path(__file__).resolve().parent.parent.parent.parent / ".env"


class Settings(BaseSettings):
    database_url: str = Field(validation_alias="DATABASE_URL")
    frontend_url: str = Field(default="http://localhost:3000", validation_alias="FRONTEND_URL")
    internal_api_secret: str = Field(validation_alias="INTERNAL_API_SECRET")
    log_level: str = Field(default="INFO", validation_alias="LOG_LEVEL")

    model_config = SettingsConfigDict(
        env_file=(_backend_env, _root_env, ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )
    nsdl_base_url: str = Field(
        default="",
        validation_alias="NSDL_BASE_URL",
    )
    nsdl_api_key: str = Field(
        default="",
        validation_alias="NSDL_API_KEY",
    )
    nsdl_timeout: float = Field(
        default=15.0,
        validation_alias="NSDL_TIMEOUT",
    )
    gemini_api_key: str = Field(
        default="",
        validation_alias="GEMINI_API_KEY",
    )
    gemini_model_fast: str = Field(
        default="gemini-3.5-flash",
        validation_alias="GEMINI_MODEL_FAST",
    )
    gemini_model_pro: str = Field(
        default="gemini-3.5-flash",
        validation_alias="GEMINI_MODEL_PRO",
    )
    gemini_timeout_seconds: float = Field(
        default=30.0,
        validation_alias="GEMINI_TIMEOUT_SECONDS",
    )
    gemini_max_retries: int = Field(
        default=2,
        validation_alias="GEMINI_MAX_RETRIES",
    )
    ai_enabled: bool = Field(
        default=True,
        validation_alias="AI_ENABLED",
    )
    mock_ai: bool = Field(
        default=False,
        validation_alias="MOCK_AI",
    )



@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
