"""Request models for ClearSign API endpoints.

Per Backend Schema §2 — Pydantic v2 models for incoming API payloads.
"""

from pydantic import BaseModel, Field

from .response import ClauseCard


class QARequest(BaseModel):
    """Payload for POST /api/v1/qa — clause-level Q&A.

    The frontend sends the user's question along with the specific
    clause context so the AI can ground its answer in the document.
    """

    question: str = Field(
        ...,
        max_length=500,
        description="User's question about a specific clause (max 500 characters).",
    )
    clause_text: str = Field(
        ...,
        description="The original text of the clause being questioned.",
    )
    clause_title: str = Field(
        ...,
        description="Title of the clause being questioned.",
    )
    document_type: str = Field(
        ...,
        description="Detected document type (e.g. 'Rental Agreement', 'NDA').",
    )


class ReportRequest(BaseModel):
    """Payload for POST /api/v1/report — PDF report generation.

    Accepts the document type and the list of analyzed clauses.
    """

    document_type: str = Field(..., description="Detected document type.")
    clauses: list[ClauseCard] = Field(..., description="List of analysed clauses.")

