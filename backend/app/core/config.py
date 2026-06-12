from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    APP_NAME: str = "Universal FastAPI Backend"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: Literal["local", "development", "staging", "production"] = "local"
    DEBUG: bool = True

    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/app"
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    AUTO_CREATE_DATABASE: bool = False

    SECRET_KEY: str = "change-this-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    BOOTSTRAP_ADMIN_ENABLED: bool = False

    BACKEND_CORS_ORIGINS: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    TRUSTED_HOSTS: list[str] = Field(default_factory=lambda: ["*"])

    LOG_LEVEL: str = "INFO"
    LOG_JSON: bool = True

    MCP_AUTH_ENABLED: bool = True

    @field_validator("API_V1_PREFIX")
    @classmethod
    def normalize_api_prefix(cls, value: str) -> str:
        if not value.startswith("/"):
            value = f"/{value}"
        return value.rstrip("/") or "/api/v1"

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.ENVIRONMENT == "production":
            if self.DEBUG:
                raise ValueError("DEBUG must be false in production")
            if self.SECRET_KEY == "change-this-secret-in-production":
                raise ValueError("SECRET_KEY must be changed in production")
            if "*" in self.TRUSTED_HOSTS:
                raise ValueError("TRUSTED_HOSTS must be restricted in production")
            if self.BOOTSTRAP_ADMIN_ENABLED:
                raise ValueError("BOOTSTRAP_ADMIN_ENABLED must be false in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
