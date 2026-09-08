from datetime import date, datetime
from typing import Any, Literal
from pydantic import BaseModel, Field


class DocumentMetadata(BaseModel):
    source: str = Field(..., description="Entity or origin: SEBI, AMFI, CBDT, NSE, AMC")
    title: str = Field(..., description="Official title of circular, guideline, or prospectus")
    url_or_reference: str = Field(..., description="Circular number, gazette notification, or official URL")
    publication_date: str = Field(..., description="Date published (YYYY-MM-DD)")
    effective_date: str = Field(..., description="Date circular or law takes effect (YYYY-MM-DD)")
    retrieved_date: str = Field(..., description="Date ingested into system (YYYY-MM-DD)")
    document_version: str = Field(default="1.0")
    document_type: Literal[
        "REGULATION", "CIRCULAR", "TAX_STATUTE", "SID", "FACTSHEET", "PROSPECTUS", "FILING"
    ]
    authority: str = Field(..., description="SEBI, AMFI, CBDT, MINISTRY_OF_FINANCE, MCA")
    topic: str = Field(..., description="CATEGORIZATION, TAXATION, EXPENSES, NOMINEE, IPO, GOVERNANCE")
    company: str | None = None
    fund: str | None = None
    is_superseded: bool = False


class DocumentChunk(BaseModel):
    chunk_id: str
    doc_id: str
    content: str
    metadata: DocumentMetadata
    embedding: list[float] | None = None


class RetrievedChunk(BaseModel):
    chunk: DocumentChunk
    similarity_score: float


class GroundedAnswer(BaseModel):
    query: str
    answer: str
    cited_sources: list[DocumentMetadata] = Field(default_factory=list)
    confidence: float = 1.0
    effective_as_of: str
