from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# ============================================================
# ENV FILE PATHS
# ============================================================

_backend_env = (
    Path(__file__).resolve().parent.parent.parent / ".env"
)

_root_env = (
    Path(__file__).resolve().parent.parent.parent.parent / ".env"
)


# ============================================================
# SETTINGS
# ============================================================

class Settings(BaseSettings):

    # ========================================================
    # DATABASE
    # ========================================================

    database_url: str = Field(
        validation_alias="DATABASE_URL",
    )


    # ========================================================
    # APPLICATION
    # ========================================================

    frontend_url: str = Field(
        default="http://localhost:3000",
        validation_alias="FRONTEND_URL",
    )

    internal_api_secret: str = Field(
        validation_alias="INTERNAL_API_SECRET",
    )

    log_level: str = Field(
        default="INFO",
        validation_alias="LOG_LEVEL",
    )


    # ========================================================
    # NSDL
    # ========================================================

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


    # ========================================================
    # GEMINI / AI
    # ========================================================

    gemini_api_key: str = Field(
        default="",
        validation_alias="GEMINI_API_KEY",
    )

    gemini_model_fast: str = Field(
        default="gemini-3.6-flash",
        validation_alias="GEMINI_MODEL_FAST",
    )

    gemini_model_pro: str = Field(
        default="gemini-3.6-flash",
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


    # ========================================================
    # SETU ACCOUNT AGGREGATOR
    # ========================================================

    # Setu FIU client ID
    setu_client_id: str = Field(
        default="",
        validation_alias="SETU_CLIENT_ID",
    )

    # Setu FIU client secret
    setu_client_secret: str = Field(
        default="",
        validation_alias="SETU_CLIENT_SECRET",
    )

    # Setu product instance ID
    setu_product_instance_id: str = Field(
        default="",
        validation_alias="SETU_PRODUCT_INSTANCE_ID",
    )

    # sandbox / production
    setu_environment: str = Field(
        default="sandbox",
        validation_alias="SETU_ENVIRONMENT",
    )

    # Setu AA API
    setu_aa_base_url: str = Field(
        default="https://fiu-sandbox.setu.co",
        validation_alias="SETU_AA_BASE_URL",
    )

    # Setu OAuth token endpoint
    setu_token_url: str = Field(
        default="https://uat.setu.co/api/v2/auth/token",
        validation_alias="SETU_TOKEN_URL",
    )

    # Public endpoint where Setu sends webhook events
    setu_webhook_url: str = Field(
        default="",
        validation_alias="SETU_WEBHOOK_URL",
    )


    # ========================================================
    # ACCOUNT AGGREGATOR CONSENT SETTINGS
    # ========================================================

    # How long consent remains valid
    aa_consent_duration_value: int = Field(
        default=1,
        validation_alias="AA_CONSENT_DURATION_VALUE",
    )

    aa_consent_duration_unit: str = Field(
        default="YEAR",
        validation_alias="AA_CONSENT_DURATION_UNIT",
    )

    # ONETIME / PERIODIC
    aa_fetch_type: str = Field(
        default="ONETIME",
        validation_alias="AA_FETCH_TYPE",
    )

    # Setu purpose code
    aa_purpose_code: str = Field(
        default="101",
        validation_alias="AA_PURPOSE_CODE",
    )

    aa_purpose_ref_uri: str | None = Field(
        default=None,
        validation_alias="AA_PURPOSE_REF_URI",
    )

    aa_purpose_text: str = Field(
        default="Portfolio analysis and financial planning",
        validation_alias="AA_PURPOSE_TEXT",
    )

    # Disabled by default: a missing live configuration must never silently
    # turn a customer OTP journey into a fabricated portfolio import.
    nsdl_environment: str = Field(
        default="disabled",
        validation_alias="NSDL_ENVIRONMENT",
    )

    aa_requested_data_range_days: int = Field(
        default=90,
        validation_alias="AA_REQUESTED_DATA_RANGE_DAYS",
    )


    # ========================================================
    # PYDANTIC SETTINGS CONFIG
    # ========================================================

    model_config = SettingsConfigDict(
        env_file=(
            _backend_env,
            _root_env,
            ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )


# ============================================================
# SINGLE SETTINGS INSTANCE
# ============================================================

@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
