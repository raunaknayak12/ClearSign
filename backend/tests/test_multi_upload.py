"""Test file for verifying multi-upload consistency and caching on the backend."""

import hashlib
import json
import os

from fastapi.testclient import TestClient

from app.main import app
from app.services.extractor import extract_text

client = TestClient(app)

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app", "cache")


def test_consecutive_uploads_determinism():
    """Verify that uploading the same PDF multiple times yields identical results."""
    # 1. Read the test PDF
    pdf_path = "tests/test_contract.pdf"
    with open(pdf_path, "rb") as f:
        file_bytes = f.read()

    # 2. Compute its cache hash to locate and clear any pre-existing cache file
    analysis = extract_text(file_bytes, "pdf")
    text_hash = hashlib.sha256(f"v2:{analysis.raw_text}".encode()).hexdigest()
    cache_file = os.path.join(CACHE_DIR, f"{text_hash}.json")

    print(f"\nText Hash: {text_hash}")
    print(f"Cache File: {cache_file}")

    if os.path.exists(cache_file):
        print("Clearing existing cache for a clean first run...")
        os.remove(cache_file)

    # Helper function to perform upload and parse SSE response
    def do_upload():
        with open(pdf_path, "rb") as f:
            response = client.post(
                "/api/v1/analyse",
                files={"file": ("test_contract.pdf", f, "application/pdf")}
            )
        assert response.status_code == 200

        # Parse SSE events from response text
        events = []
        current_event = None

        for line in response.text.split("\n"):
            line = line.strip()
            if line.startswith("event:"):
                current_event = line.split(":", 1)[1].strip()
            elif line.startswith("data:") and current_event:
                data_str = line.split(":", 1)[1].strip()
                events.append((current_event, json.loads(data_str)))
                current_event = None

        # Extract clause and review info
        clauses = [data for event, data in events if event == "clause"]
        progress_events = [data for event, data in events if event == "progress"]
        done_event = next((data for event, data in events if event == "done"), {})

        total_clauses = done_event.get("total_clauses", len(clauses))
        need_review_count = sum(1 for c in clauses if c.get("risk") == "flag" or c.get("is_non_standard") is True)

        clause_titles = [c.get("clause_title") for c in clauses]

        return {
            "total_clauses": total_clauses,
            "clause_count": len(clauses),
            "need_review_count": need_review_count,
            "clause_titles": clause_titles,
            "document_type": progress_events[0].get("document_type") if progress_events else None
        }

    # 3. Perform First Upload (Clean run, no cache)
    print("\n--- Run 1: Cold Upload (No Cache) ---")
    run1 = do_upload()
    print(f"Document Type: {run1['document_type']}")
    print(f"Total Clauses: {run1['total_clauses']}")
    print(f"Need Review: {run1['need_review_count']}")
    print(f"Titles: {run1['clause_titles']}")

    # Assert that cache was created
    assert os.path.exists(cache_file), "Cache file should have been created after first run"

    # 4. Perform Second Upload (Should hit the cache)
    print("\n--- Run 2: Cached Upload ---")
    run2 = do_upload()
    print(f"Document Type: {run2['document_type']}")
    print(f"Total Clauses: {run2['total_clauses']}")
    print(f"Need Review: {run2['need_review_count']}")
    print(f"Titles: {run2['clause_titles']}")

    # 5. Perform Third Upload (Should hit the cache again)
    print("\n--- Run 3: Cached Upload ---")
    run3 = do_upload()
    print(f"Document Type: {run3['document_type']}")
    print(f"Total Clauses: {run3['total_clauses']}")
    print(f"Need Review: {run3['need_review_count']}")
    print(f"Titles: {run3['clause_titles']}")

    # 6. Assertions for rigorous determinism
    assert run1["total_clauses"] == run2["total_clauses"] == run3["total_clauses"], "Clause counts differ!"
    assert run1["need_review_count"] == run2["need_review_count"] == run3["need_review_count"], "Review counts differ!"
    assert run1["clause_titles"] == run2["clause_titles"] == run3["clause_titles"], "Clause titles differ!"
    assert run1["document_type"] == run2["document_type"] == run3["document_type"], "Document types differ!"

    print("\n✅ Multi-upload determinism and cache verification test passed successfully!")


if __name__ == "__main__":
    test_consecutive_uploads_determinism()
