"""Enum definitions for ClearSign v1.0.

Per Backend Schema §3 — defines all enumerated types used across
request/response models and business logic.
"""

from enum import Enum


class ClauseType(str, Enum):
    """Classification categories for document clauses.

    Each clause is tagged with exactly one type, which determines
    the badge colour and label on the frontend ClauseCard component.
    """

    PAYMENT = "payment"
    TERMINATION = "termination"
    PENALTY_LIABILITY = "penalty_liability"
    NOTICE_PERIOD = "notice_period"
    CONFIDENTIALITY = "confidentiality"
    JURISDICTION = "jurisdiction"
    NON_STANDARD = "non_standard"
    STANDARD = "standard"


class FileType(str, Enum):
    """Supported upload file formats.

    Maps to MIME type validation and extraction method selection
    in extractor.py.
    """

    PDF = "pdf"
    DOCX = "docx"


class SSEEventType(str, Enum):
    """Server-Sent Event types emitted by the /api/v1/analyse endpoint.

    - clause:   A fully parsed ClauseCard JSON payload
    - progress: Percentage completion update
    - error:    Processing error (may be retryable)
    - done:     Stream complete — all clauses delivered
    """

    CLAUSE = "clause"
    PROGRESS = "progress"
    ERROR = "error"
    DONE = "done"
