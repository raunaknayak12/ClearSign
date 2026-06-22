"""Tests for API routers.

Phase 10.1 — test_routers.py
Tests health check, file validation (413, 415), and basic routing.
"""

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


class TestReportEndpoint:
    """Tests for POST /api/v1/report."""

    def test_generate_report_ok(self):
        """Generating a report with a valid payload should return 200 with PDF content."""
        response = client.post(
            "/api/v1/report",
            json={
                "document_type": "Rental Agreement",
                "clauses": [
                    {
                        "clause_id": "clause_1",
                        "clause_title": "Rent Payment",
                        "clause_type": "payment",
                        "original_text": "Tenant shall pay monthly rent of $2000.",
                        "explanation": "You must pay $2000 per month as rent.",
                        "is_non_standard": False,
                        "grounding_statement": "Found in Section 3."
                    }
                ]
            }
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert response.headers["content-disposition"] == "attachment; filename=clearsign-report.pdf"
        # PDF files start with %PDF header
        assert response.content.startswith(b"%PDF")


class TestSharedAnalysisEndpoint:
    """Tests for GET /api/v1/analysis/{text_hash}."""

    def test_get_analysis_not_found(self):
        """Requesting a non-existent hash should return 404."""
        response = client.get("/api/v1/analysis/nonexistenthash123")
        assert response.status_code == 404

    def test_get_analysis_ok(self):
        """Requesting a cached analysis should return 200 with data."""
        import json
        import os

        from app.routers.analyse import CACHE_DIR

        test_hash = "testdummyhash12345"
        cache_file = os.path.join(CACHE_DIR, f"{test_hash}.json")
        os.makedirs(CACHE_DIR, exist_ok=True)

        dummy_data = {
            "document_type": "Test Document",
            "confidence": 0.99,
            "clauses": [
                {
                    "clause_id": "c1",
                    "clause_title": "Test Title",
                    "clause_type": "standard",
                    "original_text": "Original text.",
                    "explanation": "Explanation.",
                    "is_non_standard": False,
                    "grounding_statement": None
                }
            ]
        }

        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(dummy_data, f)

        try:
            response = client.get(f"/api/v1/analysis/{test_hash}")
            assert response.status_code == 200
            data = response.json()
            assert data["document_type"] == "Test Document"
            assert data["clauses"][0]["clause_title"] == "Test Title"
        finally:
            if os.path.exists(cache_file):
                os.remove(cache_file)


