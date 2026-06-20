"""File validation middleware for ClearSign uploads.

Phase 4.1 — Enforces:
- 10 MB hard cap (TRD §8.3)
- MIME type allowlist (PDF, DOCX only)
- Magic bytes verification (prevents MIME spoofing)

Never logs file contents. Logs only validation outcome and MIME type.
"""

import os

from fastapi import HTTPException, UploadFile

# Maximum file size in bytes (from env or default 10 MB)
MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_FILE_SIZE_MB", "10")) * 1024 * 1024

# Allowed MIME types
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

# Magic bytes signatures
MAGIC_BYTES = {
    "pdf": b"%PDF",  # hex 25 50 44 46
    "docx": b"PK\x03\x04",  # hex 50 4B 03 04 (ZIP archive)
}


async def validate_upload(file: UploadFile) -> tuple[bytes, str]:
    """Validate an uploaded file for type and size constraints.

    Args:
        file: The uploaded file from the request.

    Returns:
        Tuple of (file_bytes, file_type) where file_type is 'pdf' or 'docx'.

    Raises:
        HTTPException 413: File exceeds 10 MB limit.
        HTTPException 415: File is not a valid PDF or DOCX.
    """
    # Read file bytes into memory
    file_bytes = await file.read()

    # ── Size check ──
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File too large. Maximum size is 10 MB.",
        )

    # ── MIME type check ──
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Only PDF and DOCX files are accepted.",
        )

    # ── Magic bytes check ──
    # Read first 8 bytes to verify file signature matches declared type
    header = file_bytes[:8]

    if content_type == "application/pdf":
        if not header[:4] == MAGIC_BYTES["pdf"]:
            raise HTTPException(
                status_code=415,
                detail="Only PDF and DOCX files are accepted.",
            )
        file_type = "pdf"
    else:
        if not header[:4] == MAGIC_BYTES["docx"]:
            raise HTTPException(
                status_code=415,
                detail="Only PDF and DOCX files are accepted.",
            )
        file_type = "docx"

    return file_bytes, file_type
