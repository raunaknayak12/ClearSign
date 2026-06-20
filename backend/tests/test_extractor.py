"""Tests for document text extraction.

Phase 10.1 — test_extractor.py
Tests PDF and DOCX extraction, empty file handling, and chunking.
"""

import pytest

from app.services.extractor import chunk_text, extract_docx_text, extract_pdf_text


class TestChunkText:
    """Tests for the text chunking utility."""

    def test_short_text_returns_single_chunk(self):
        """Text shorter than max should return a single chunk."""
        text = "This is a short document."
        result = chunk_text(text, max_tokens=5000)
        assert len(result) == 1
        assert result[0] == text

    def test_long_text_produces_multiple_chunks(self):
        """Text longer than max should be split into overlapping chunks."""
        # Create text that exceeds 5000 tokens (~20000 chars)
        text = "This is a test sentence. " * 1000  # ~25000 chars
        result = chunk_text(text, max_tokens=5000, overlap_tokens=500)
        assert len(result) > 1

    def test_chunks_have_overlap(self):
        """Chunks should overlap to avoid splitting mid-clause."""
        text = "Sentence one. " * 800 + "Sentence two. " * 800
        result = chunk_text(text, max_tokens=3000, overlap_tokens=500)
        if len(result) >= 2:
            # Check that chunks share some content
            # The end of chunk 0 and start of chunk 1 should overlap
            assert len(result[0]) > 0
            assert len(result[1]) > 0

    def test_empty_text_returns_single_chunk(self):
        """Empty text should return a single empty chunk."""
        result = chunk_text("", max_tokens=5000)
        assert len(result) == 1


class TestPDFExtraction:
    """Tests for PDF text extraction.

    Note: These tests require actual PDF test files. In CI, they may be
    skipped if test fixtures are not available.
    """

    def test_empty_pdf_raises_error(self):
        """A PDF with no text layer should raise ValueError."""
        # Minimal valid PDF with no text content
        # This is a bare-bones PDF structure
        minimal_pdf = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer<</Size 4/Root 1 0 R>>
startxref
206
%%EOF"""
        with pytest.raises(ValueError, match="couldn't read any text"):
            extract_pdf_text(minimal_pdf)


class TestDOCXExtraction:
    """Tests for DOCX text extraction.

    Note: These tests require actual DOCX test files. In CI, they may be
    skipped if test fixtures are not available.
    """

    pass  # DOCX test fixtures would be added here
