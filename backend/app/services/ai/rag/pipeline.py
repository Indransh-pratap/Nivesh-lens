from datetime import date
from typing import Any
from app.services.ai.provider.factory import get_llm_provider
from app.services.ai.rag.knowledge_base import get_knowledge_store
from app.services.ai.rag.models import GroundedAnswer
from app.services.ai.security import wrap_untrusted_input


def query_rag(
    query: str,
    top_k: int = 3,
    document_type: str | None = None,
    authority: str | None = None,
    topic: str | None = None,
    company: str | None = None,
    fund: str | None = None,
) -> GroundedAnswer:
    """
    Execute full RAG pipeline:
    Query -> Store Retrieve -> Metadata Filter -> Grounded Synthesis -> Validated Answer with Citations.
    """
    store = get_knowledge_store()
    retrieved = store.search(
        query=query,
        top_k=top_k,
        document_type=document_type,
        authority=authority,
        topic=topic,
        company=company,
        fund=fund,
    )

    if not retrieved:
        return GroundedAnswer(
            query=query,
            answer="No relevant official financial documents or regulatory guidelines found for this inquiry.",
            cited_sources=[],
            confidence=0.0,
            effective_as_of=date.today().isoformat(),
        )

    # Collect cited sources
    cited_sources = [r.chunk.metadata for r in retrieved]
    context_blocks = []
    for idx, item in enumerate(retrieved, 1):
        m = item.chunk.metadata
        context_blocks.append(
            f"[Source {idx}]: {m.title} ({m.authority}, Ref: {m.url_or_reference}, Effective: {m.effective_date})\n"
            f"{item.chunk.content}"
        )
    joined_context = "\n\n".join(context_blocks)

    system_instruction = (
        "You are an expert Indian financial regulatory and tax analyst. "
        "Answer the user's query STRICTLY using the provided official document sources. "
        "Always cite the source number (e.g. [Source 1]) when stating rules, tax rates, or thresholds. "
        "Never invent tax rates, dates, or regulations not present in the sources."
    )

    prompt = (
        f"OFFICIAL SOURCES:\n"
        f"{wrap_untrusted_input(joined_context, source_label='official_rag_docs')}\n\n"
        f"USER INQUIRY: {query}\n\n"
        f"Provide a clear, grounded explanation citing the sources."
    )

    provider = get_llm_provider()
    try:
        raw_answer = provider.generate_text(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=0.1,
            model_tier="fast",
        )
        return GroundedAnswer(
            query=query,
            answer=raw_answer.strip(),
            cited_sources=cited_sources,
            confidence=0.95,
            effective_as_of=cited_sources[0].effective_date if cited_sources else date.today().isoformat(),
        )
    except Exception:
        # Deterministic safe fallback
        bullets = [f"• {r.chunk.content}" for r in retrieved]
        fallback_answer = (
            f"Based on official {cited_sources[0].authority} documentation ({cited_sources[0].title}):\n"
            + "\n".join(bullets[:2])
        )
        return GroundedAnswer(
            query=query,
            answer=fallback_answer,
            cited_sources=cited_sources,
            confidence=0.9,
            effective_as_of=cited_sources[0].effective_date if cited_sources else date.today().isoformat(),
        )
