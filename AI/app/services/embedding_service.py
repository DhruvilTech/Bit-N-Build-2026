"""Sentence embedding service using pretrained Sentence Transformers.

Loads a pretrained sentence-transformers model (default: all-MiniLM-L6-v2) once
at application startup and provides methods to encode incident text into dense
vector embeddings for semantic similarity computation.
"""

import numpy as np
from typing import List, Optional, Union
from app.config import settings
from app.utils.logger import logger


class EmbeddingService:
    """Singleton service that manages a Sentence Transformer model for text embeddings."""

    _instance: Optional["EmbeddingService"] = None
    _model = None
    _model_name: str = ""
    _embedding_dim: int = 0
    _is_loaded: bool = False

    def __new__(cls) -> "EmbeddingService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def load_model(self, model_name: Optional[str] = None) -> None:
        """Load the sentence-transformers model into memory.

        This should be called once during application startup (lifespan).
        Subsequent calls are no-ops if the model is already loaded.

        Args:
            model_name: Override model name. Defaults to settings.EMBEDDING_MODEL_NAME.
        """
        if self._is_loaded:
            logger.info(f"Embedding model '{self._model_name}' already loaded, skipping.")
            return

        target_model = model_name or settings.EMBEDDING_MODEL_NAME
        logger.info(f"Loading sentence-transformers model: '{target_model}'...")

        try:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer(target_model)
            self._model_name = target_model
            # Determine embedding dimensionality from a probe encode
            probe = self._model.encode(["probe"], convert_to_numpy=True)
            self._embedding_dim = probe.shape[1]
            self._is_loaded = True
            logger.info(
                f"Embedding model '{target_model}' loaded successfully. "
                f"Embedding dimension: {self._embedding_dim}"
            )
        except Exception as e:
            logger.error(f"Failed to load embedding model '{target_model}': {e}", exc_info=True)
            self._is_loaded = False
            raise RuntimeError(
                f"Could not load sentence-transformers model '{target_model}'. "
                f"Ensure 'sentence-transformers' is installed and the model name is valid. "
                f"Error: {e}"
            )

    @property
    def is_loaded(self) -> bool:
        """Whether the embedding model is loaded and ready for inference."""
        return self._is_loaded

    @property
    def model_name(self) -> str:
        """Name of the loaded model."""
        return self._model_name

    @property
    def embedding_dim(self) -> int:
        """Dimensionality of the embeddings produced by the loaded model."""
        return self._embedding_dim

    def encode(self, text: str) -> np.ndarray:
        """Encode a single text string into a dense embedding vector.

        Args:
            text: Input text to encode.

        Returns:
            1-D numpy array of shape (embedding_dim,).

        Raises:
            RuntimeError: If the model is not loaded.
        """
        if not self._is_loaded or self._model is None:
            raise RuntimeError(
                "Embedding model not loaded. Call load_model() during app startup."
            )

        if not text or not text.strip():
            # Return zero vector for empty/whitespace-only input
            logger.warning("Empty text passed to encode(), returning zero vector.")
            return np.zeros(self._embedding_dim, dtype=np.float32)

        embedding = self._model.encode(
            [text.strip()],
            convert_to_numpy=True,
            normalize_embeddings=True,  # L2 normalize for cosine similarity via dot product
        )
        return embedding[0]

    def encode_batch(self, texts: List[str]) -> np.ndarray:
        """Encode a batch of text strings into dense embedding vectors.

        Args:
            texts: List of input texts to encode.

        Returns:
            2-D numpy array of shape (len(texts), embedding_dim).

        Raises:
            RuntimeError: If the model is not loaded.
        """
        if not self._is_loaded or self._model is None:
            raise RuntimeError(
                "Embedding model not loaded. Call load_model() during app startup."
            )

        if not texts:
            return np.zeros((0, self._embedding_dim), dtype=np.float32)

        # Replace empty strings with a placeholder to avoid encoding errors
        cleaned = []
        empty_indices = []
        for i, t in enumerate(texts):
            stripped = t.strip() if t else ""
            if not stripped:
                cleaned.append("empty")
                empty_indices.append(i)
            else:
                cleaned.append(stripped)

        embeddings = self._model.encode(
            cleaned,
            convert_to_numpy=True,
            normalize_embeddings=True,
            batch_size=32,
            show_progress_bar=False,
        )

        # Zero out embeddings for empty inputs
        for idx in empty_indices:
            embeddings[idx] = np.zeros(self._embedding_dim, dtype=np.float32)

        return embeddings


# Module-level singleton
embedding_service = EmbeddingService()
