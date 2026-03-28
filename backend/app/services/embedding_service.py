from sentence_transformers import SentenceTransformer

# Singleton model instance
_model = None


def _get_model() -> SentenceTransformer:
    """Load the embedding model (singleton pattern to avoid reloading)."""
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed_chunks(chunks: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of text chunks.

    Returns a list of 384-dimensional vectors.
    """
    model = _get_model()
    embeddings = model.encode(chunks, show_progress_bar=False, normalize_embeddings=True)
    return embeddings.tolist()


def embed_query(query: str) -> list[float]:
    """Generate an embedding for a single query string."""
    model = _get_model()
    embedding = model.encode([query], show_progress_bar=False, normalize_embeddings=True)
    return embedding[0].tolist()
