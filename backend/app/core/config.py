from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = Field(validation_alias="DATABASE_URL")
    frontend_url: str = Field(default="http://localhost:3000", validation_alias="FRONTEND_URL")
    internal_api_secret: str = Field(validation_alias="INTERNAL_API_SECRET")
    log_level: str = Field(default="INFO", validation_alias="LOG_LEVEL")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
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

@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
