"""Response models for ClearSign API endpoints.

Per Backend Schema §2 — Pydantic v2 models for all API responses
and internal data structures. ClearSign v1.0 is fully stateless;
these models exist in-memory only.
"""

from typing import Literal

from pydantic import BaseModel, Field

from .enums import ClauseType, SSEEventType


class DocumentAnalysis(BaseModel):
    """Result of text extraction from an uploaded document.

    Produced by extractor.py after PDF/DOCX parsing.
    Contains the full raw text and metadata for downstream AI processing.
    """

    raw_text: str = Field(..., description="Full extracted text content.")
    char_count: int = Field(..., description="Total character count of extracted text.")
    page_count: int | None = Field(
        None, description="Page count (PDF only; None for DOCX)."
    )
    file_type: Literal["pdf", "docx"] = Field(
        ..., description="Source file format."
    )


class DocumentTypeResult(BaseModel):
    """Result of AI document type classification.

    Produced by classifier.py using the first 2,000 characters
    of the extracted text.
    """

    document_type: str = Field(
        ...,
        description="Detected document type (e.g. 'Rental Agreement', 'NDA', 'Employment Contract').",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Classification confidence score (0.0–1.0).",
    )
    first_2000_chars: str = Field(
        ...,
        description="First 2,000 characters sent to the classifier.",
    )


class ClauseCard(BaseModel):
    """A single clause extracted and explained by the AI.

    This is the primary data unit displayed on the /analyse page.
    Each clause gets its own card with a type badge, plain-language
    explanation, and grounding statement.
    """

    clause_id: str = Field(
        ..., description="Unique identifier for this clause (e.g. 'clause_1')."
    )
    clause_title: str = Field(
        ..., description="Short descriptive title for the clause."
    )
    clause_type: ClauseType = Field(
        ..., description="Classification category determining badge colour."
    )
    original_text: str = Field(
        ..., description="Verbatim clause text from the document."
    )
    explanation: str = Field(
        ..., description="Plain-language explanation of what this clause means."
    )
    is_non_standard: bool = Field(
        False, description="Whether this clause is flagged as non-standard/unusual."
    )
    grounding_statement: str | None = Field(
        None,
        description="Statement grounding the explanation in document text (if applicable).",
    )


class QAResponse(BaseModel):
    """Response from the clause-level Q&A endpoint.

    Grounded strictly in the clause text provided in the request.
    If the answer cannot be found, answer_found=False and the
    standard grounding fallback message is returned.
    """

    answer: str = Field(..., description="AI-generated answer to the user's question.")
    answer_found: bool = Field(
        ...,
        description="Whether the answer was found in the clause text.",
    )
    source_clause_id: str = Field(
        ...,
        description="ID of the clause this answer references.",
    )


class SSEEvent(BaseModel):
    """Envelope for Server-Sent Events emitted during document analysis.

    Events are streamed to the frontend via FastAPI StreamingResponse.
    The frontend useSSE hook parses each event by type.
    """

    event: SSEEventType = Field(
        ..., description="Event type: clause, progress, error, or done."
    )
    data: str = Field(
        ..., description="JSON-serialised event payload."
    )
    id: str | None = Field(
        None, description="Optional event ID (clause_id) for SSE reconnection."
    )
