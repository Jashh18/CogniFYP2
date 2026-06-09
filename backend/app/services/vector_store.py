import os
try:
    from pinecone import Pinecone
except ImportError:
    Pinecone = None
    print("[WARN] pinecone is not installed. Vector store functionality will be unavailable.")

_client = None
_index = None


def _get_index():
    """Get the Pinecone index (singleton)."""
    global _client, _index
    if Pinecone is None:
        raise ImportError("pinecone package is required for vector store but is not installed.")
    
    if _index is None:
        _client = Pinecone(api_key=os.getenv("PINECONE_API_KEY", ""))
        index_name = os.getenv("PINECONE_INDEX_NAME", "cogni-embeddings")
        _index = _client.Index(index_name)
    return _index


def upsert_vectors(
    doc_id: str,
    chunks: list[str] | list[dict],
    embeddings: list[list[float]],
) -> int:
    """Store chunk embeddings in Pinecone with metadata.

    Each vector ID is formatted as '{doc_id}_{chunk_index}'.
    Metadata includes: doc_id, chunk_index, text, page_number, token_count.

    `chunks` can be either:
      - list[str]  (plain text, backward compatible)
      - list[dict] (page-aware chunks from chunk_text_with_pages)
    """
    index = _get_index()

    vectors = []
    # Explicitly cast to the correct list type if known, or iterate safely
    for i in range(len(embeddings)):
        chunk = chunks[i] if i < len(chunks) else "" # type: ignore
        embedding = embeddings[i]
        
        vector_id = f"{doc_id}_{i}"

        # Support both plain strings and page-aware dicts
        if isinstance(chunk, dict):
            text = str(chunk.get("text", ""))
            page_number = int(chunk.get("page_number", 1))
            token_count = int(chunk.get("token_count", 0))
        else:
            text = str(chunk)
            page_number = 1
            token_count = 0

        metadata = {
            "doc_id": str(doc_id),
            "chunk_index": i,
            "text": str(text)[:3800],
            "page_number": page_number,
            "token_count": token_count,
        }
        vectors.append({"id": vector_id, "values": embedding, "metadata": metadata})

    # Upsert in batches of 100
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i : i + batch_size] # type: ignore
        index.upsert(vectors=batch)

    return len(vectors)


def query_vectors(
    query_embedding: list[float], doc_id: str, top_k: int = 5, min_score: float = 0.35
) -> list[dict]:
    """Query Pinecone for the top-k most similar chunks for a given document.

    Returns a list of dicts with 'text', 'score', 'chunk_index',
    'page_number', and 'token_count'.
    """
    index = _get_index()

    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True,
        filter={"doc_id": {"$eq": str(doc_id)}}, # type: ignore
    )

    matches = []
    response_matches = getattr(results, "matches", [])
    for match in response_matches:
        # Pydantic models in v3+ use attribute access, but backwards compatible dict access is sometimes supported.
        # It's safer to use attribute access if it's an object, or dict access if it's still a dict.
        score = match.score if hasattr(match, "score") else match.get("score", 0)
        metadata = match.metadata if hasattr(match, "metadata") else match.get("metadata", {})
        
        if score >= min_score:
            matches.append(
                {
                    "text": metadata.get("text", ""),
                    "score": score,
                    "chunk_index": metadata.get("chunk_index", 0),
                    "page_number": metadata.get("page_number", 1),
                    "token_count": metadata.get("token_count", 0),
                }
            )

    return matches


def get_evenly_spaced_chunks(doc_id: str, chunk_count: int, num_samples: int = 8) -> list[dict]:
    """Fetch evenly spaced chunks from the document to capture the full narrative arc."""
    if chunk_count == 0:
        return []
        
    indices = []
    if chunk_count <= num_samples:
        indices = list(range(chunk_count))
    else:
        step = (chunk_count - 1) / (num_samples - 1)
        indices = [int(round(i * step)) for i in range(num_samples)]
        
    indices = sorted(list(set(indices)))
    ids_to_fetch = [f"{doc_id}_{i}" for i in indices]
    
    index = _get_index()
    fetch_response = index.fetch(ids=ids_to_fetch)
    
    matches = []
    vectors_dict = getattr(fetch_response, "vectors", {}) if hasattr(fetch_response, "vectors") else fetch_response.get("vectors", {})
    
    # We want them in order of indices
    for i in indices:
        vector_id = f"{doc_id}_{i}"
        if vector_id in vectors_dict:
            vec = vectors_dict[vector_id]
            metadata = vec.metadata if hasattr(vec, "metadata") else vec.get("metadata", {})
            matches.append({
                "text": metadata.get("text", ""),
                "score": 1.0,  # mock score
                "chunk_index": metadata.get("chunk_index", 0),
                "page_number": metadata.get("page_number", 1),
                "token_count": metadata.get("token_count", 0),
            })
            
    return matches


def delete_vectors(doc_id: str, chunk_count: int) -> None:
    """Delete all vectors for a given document."""
    index = _get_index()
    ids = [f"{doc_id}_{i}" for i in range(chunk_count)]
    # Delete in batches
    batch_size = 100
    for i in range(0, len(ids), batch_size):
        batch = ids[i : i + batch_size] # type: ignore
        index.delete(ids=batch)
