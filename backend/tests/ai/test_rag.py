from app.services.ai.rag.knowledge_base import get_knowledge_store
from app.services.ai.rag.models import DocumentMetadata
from app.services.ai.rag.pipeline import query_rag
from app.services.ai.rag.store import KnowledgeVectorStore


def test_rag_knowledge_base_seeded():
    store = get_knowledge_store()
    assert len(store.chunks) > 0

    # Search for tax amendments
    res = store.search("capital gains tax LTCG exemption 125000", top_k=2)
    assert len(res) > 0
    assert any("BUDGET" in r.chunk.doc_id or "TAX" in r.chunk.metadata.topic for r in res)


def test_rag_metadata_filtering():
    store = get_knowledge_store()

    # Search strictly with topic='TAXATION'
    tax_res = store.search("tax", topic="TAXATION", top_k=5)
    for r in tax_res:
        assert r.chunk.metadata.topic == "TAXATION"

    # Search strictly with authority='SEBI'
    sebi_res = store.search("categorization", authority="SEBI", top_k=5)
    for r in sebi_res:
        assert r.chunk.metadata.authority == "SEBI"


def test_rag_pipeline_answer_citations():
    grounded = query_rag("What are the equity long term capital gains tax rates under Budget 2024?", topic="TAXATION")
    assert grounded is not None
    assert len(grounded.answer) > 0
    assert len(grounded.cited_sources) > 0
    assert grounded.cited_sources[0].source in ("MINISTRY_OF_FINANCE", "SEBI", "AMFI")
    assert grounded.confidence > 0.5
