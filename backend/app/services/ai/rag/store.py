import math
import re
from typing import Any, Callable
from app.services.ai.rag.models import DocumentChunk, DocumentMetadata, RetrievedChunk

# Stopwords for lightweight deterministic embedding
_STOPWORDS = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with",
    "by", "is", "are", "was", "were", "be", "been", "this", "that", "which", "as"
}


def _tokenize(text: str) -> list[str]:
    words = re.findall(r"\b[a-zA-Z0-9_\-]{2,}\b", text.lower())
    return [w for w in words if w not in _STOPWORDS]


def _compute_vector(tokens: list[str], dim: int = 128) -> list[float]:
    """Compute a deterministic normalized term-frequency hashed vector."""
    if not tokens:
        return [0.0] * dim
    vec = [0.0] * dim
    for t in tokens:
        idx = hash(t) % dim
        vec[idx] += 1.0
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
    return vec


def _cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    return sum(a * b for a, b in zip(vec1, vec2))


class KnowledgeVectorStore:
    """
    High-performance, dependency-free in-memory vector store for official financial knowledge.
    Supports chunking with overlap, metadata filtering, and cosine similarity ranking.
    """

    def __init__(self, vector_dim: int = 128):
        self.vector_dim = vector_dim
        self.chunks: list[DocumentChunk] = []

    def add_document(
        self,
        doc_id: str,
        text: str,
        metadata: DocumentMetadata,
        chunk_size: int = 500,
        chunk_overlap: int = 100,
    ) -> list[DocumentChunk]:
        """Split document text into overlapping chunks, compute embeddings, and store."""
        raw_chunks = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = min(start + chunk_size, text_len)
            chunk_text = text[start:end].strip()
            if chunk_text:
                raw_chunks.append(chunk_text)
            if end >= text_len:
                break
            start += chunk_size - chunk_overlap

        added_chunks = []
        for i, ctext in enumerate(raw_chunks):
            tokens = _tokenize(ctext + " " + metadata.title + " " + metadata.topic)
            embedding = _compute_vector(tokens, dim=self.vector_dim)
            chunk = DocumentChunk(
                chunk_id=f"{doc_id}_chk_{i}",
                doc_id=doc_id,
                content=ctext,
                metadata=metadata,
                embedding=embedding,
            )
            self.chunks.append(chunk)
            added_chunks.append(chunk)

        return added_chunks

    def search(
        self,
        query: str,
        top_k: int = 3,
        document_type: str | None = None,
        authority: str | None = None,
        topic: str | None = None,
        company: str | None = None,
        fund: str | None = None,
        include_superseded: bool = False,
    ) -> list[RetrievedChunk]:
        """
        Query vector store with cosine similarity and strict metadata filters.
        """
        query_tokens = _tokenize(query)
        if not query_tokens:
            return []

        query_vec = _compute_vector(query_tokens, dim=self.vector_dim)
        results: list[RetrievedChunk] = []

        for chunk in self.chunks:
            meta = chunk.metadata

            if not include_superseded and meta.is_superseded:
                continue
            if document_type and meta.document_type != document_type:
                continue
            if authority and meta.authority.upper() != authority.upper():
                continue
            if topic and meta.topic.upper() != topic.upper():
                continue
            if company and (not meta.company or company.upper() not in meta.company.upper()):
                continue
            if fund and (not meta.fund or fund.upper() not in meta.fund.upper()):
                continue

            if chunk.embedding:
                score = _cosine_similarity(query_vec, chunk.embedding)
            else:
                score = 0.0

            # Boost if query keyword appears directly in document title or content
            text_lower = chunk.content.lower()
            title_lower = meta.title.lower()
            keyword_matches = sum(1 for q in query_tokens if q in text_lower or q in title_lower)
            adjusted_score = score + (0.1 * keyword_matches)

            if adjusted_score > 0.05:
                results.append(RetrievedChunk(chunk=chunk, similarity_score=adjusted_score))

        # Rank by score descending
        results.sort(key=lambda x: x.similarity_score, reverse=True)
        return results[:top_k]
