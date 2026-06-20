"""Tests for API routers.

Phase 10.1 — test_routers.py
Tests health check, file validation (413, 415), and basic routing.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestHealthCheck:
    """Tests for GET /health endpoint."""

    def test_health_returns_ok(self):
        """Health check should return 200 with status and version."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["version"] == "1.0"


class TestAnalyseEndpoint:
    """Tests for POST /api/v1/analyse."""

    def test_unsupported_mime_returns_415(self):
        """Uploading a non-PDF/DOCX file should return 415."""
        response = client.post(
            "/api/v1/analyse",
            files={"file": ("test.jpg", b"fake image data", "image/jpeg")},
        )
        assert response.status_code == 415

    def test_oversized_file_returns_413(self):
        """Uploading a file over 10 MB should return 413."""
        # Create a file just over 10 MB with valid PDF header
        large_content = b"%PDF" + b"\x00" * (11 * 1024 * 1024)
        response = client.post(
            "/api/v1/analyse",
            files={"file": ("test.pdf", large_content, "application/pdf")},
        )
        assert response.status_code == 413


class TestQAEndpoint:
    """Tests for POST /api/v1/qa."""

    def test_question_too_long_returns_422(self):
        """Question exceeding 500 characters should be rejected."""
        response = client.post(
            "/api/v1/qa",
            json={
                "question": "x" * 501,
                "clause_text": "Some clause text",
                "clause_title": "Test Clause",
                "document_type": "Rental Agreement",
            },
        )
        assert response.status_code == 422

    def test_valid_qa_request_accepted(self):
        """A valid QA request should not return 422 (validation pass)."""
        # Note: This will fail at the Groq API level without a valid key,
        # but it should pass Pydantic validation (not 422)
        response = client.post(
            "/api/v1/qa",
            json={
                "question": "What does this clause mean?",
                "clause_text": "The tenant shall pay rent on the first of each month.",
                "clause_title": "Payment Terms",
                "document_type": "Rental Agreement",
            },
        )
        # Should not be a validation error
        assert response.status_code != 422
