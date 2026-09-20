"""Application configuration management using Pydantic Settings."""

import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    PORT: int = Field(default=8000, description="Port the FastAPI app listens on")
    HOST: str = Field(default="0.0.0.0", description="Host address")
    AI_SERVICE_NAME: str = "PS9-AI-Service"
    AI_SERVICE_VERSION: str = "1.1.0"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:5000,http://127.0.0.1:5173,http://127.0.0.1:5000"
    AI_MODEL_NAME: str = "emergency-classifier-v1"
    CONFIDENCE_THRESHOLD_LOW: float = 0.70

    # Duplicate Detection Configuration
    EMBEDDING_MODEL_NAME: str = Field(
        default="all-MiniLM-L6-v2",
        description="Sentence-transformers model for semantic embeddings",
    )
    DUPLICATE_THRESHOLD: float = Field(
        default=0.80,
        description="Combined similarity threshold to classify as DUPLICATE",
    )
    RELATED_THRESHOLD: float = Field(
        default=0.55,
        description="Combined similarity threshold to classify as RELATED",
    )
    GEO_RADIUS_KM: float = Field(
        default=5.0,
        description="Geographic radius (km) for exponential decay similarity",
    )
    TEMPORAL_WINDOW_HOURS: float = Field(
        default=24.0,
        description="Temporal window (hours) for exponential decay similarity",
    )
    SIMILARITY_WEIGHT_SEMANTIC: float = Field(
        default=0.55,
        description="Weight for semantic similarity in combined score",
    )
    SIMILARITY_WEIGHT_GEO: float = Field(
        default=0.25,
        description="Weight for geographic similarity in combined score",
    )
    SIMILARITY_WEIGHT_TEMPORAL: float = Field(
        default=0.20,
        description="Weight for temporal similarity in combined score",
    )
    MODELS_DIR: str = Field(
        default="models",
        description="Directory for trained model artifacts (relative to AI root)",
    )

    # Mistral LLM Configuration
    MISTRAL_API_KEY: str = Field(
        default="",
        description="Mistral AI API Key for Emergency Summaries and Operational Command Copilot",
    )
    MISTRAL_MODEL: str = Field(
        default="ministral-8b-latest",
        description="Primary Mistral model identifier",
    )
    MISTRAL_FALLBACK_MODEL: str = Field(
        default="ministral-3b-latest",
        description="Fallback Mistral model identifier if primary is rate limited",
    )

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

