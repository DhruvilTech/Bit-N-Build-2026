"""Application configuration management using Pydantic Settings."""

import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    PORT: int = Field(default=8000, description="Port the FastAPI app listens on")
    HOST: str = Field(default="0.0.0.0", description="Host address")
    AI_SERVICE_NAME: str = "PS9-AI-Service"
    AI_SERVICE_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:5000,http://127.0.0.1:5173,http://127.0.0.1:5000"
    AI_MODEL_NAME: str = "emergency-classifier-v1"
    CONFIDENCE_THRESHOLD_LOW: float = 0.70

    @property
    def cors_origins(self) -> List[str]:
        if not self.ALLOWED_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
