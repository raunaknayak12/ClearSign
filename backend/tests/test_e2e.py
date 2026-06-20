"""End-to-end test: Upload PDF → SSE stream → Clause breakdown → Q&A."""

import json
import httpx
import sys


def test_analyse():
    """Test the full analysis pipeline with a real PDF."""
    print("=" * 60)
    print("TEST 1: Full Analysis Pipeline (POST /api/v1/analyse)")
    print("=" * 60)

    with open("tests/test_contract.pdf", "rb") as f:
        files = {"file": ("test_contract.pdf", f, "application/pdf")}
        with httpx.Client(timeout=120.0) as client:
            with client.stream(
                "POST", "http://127.0.0.1:8000/api/v1/analyse", files=files
            ) as response:
                print(f"Status: {response.status_code}")
                content_type = response.headers.get("content-type", "unknown")
                print(f"Content-Type: {content_type}")
                assert response.status_code == 200, f"Expected 200, got {response.status_code}"
                assert "text/event-stream" in content_type, f"Expected SSE, got {content_type}"
                print("---")

                event_type = ""
                event_count = 0
                clause_count = 0
                clauses = []
                doc_type = ""
                errors = []

                for line in response.iter_lines():
                    if line.startswith("event:"):
                        event_type = line.split(":", 1)[1].strip()
                        event_count += 1
                    elif line.startswith("data:"):
                        data_str = line.split(":", 1)[1].strip()
                        try:
                            data = json.loads(data_str)
                        except json.JSONDecodeError:
                            data = {}

                        if event_type == "progress":
                            pct = data.get("percent", "?")
                            msg = data.get("message", "")
                            dt = data.get("document_type", "")
                            if dt:
                                doc_type = dt
                            print(f"  PROGRESS [{pct}%]: {msg or 'streaming...'}")
                        elif event_type == "clause":
                            clause_count += 1
                            ct = data.get("clause_type", "?")
                            title = data.get("clause_title", "?")
                            expl = data.get("explanation", "")[:100]
                            ns = data.get("is_non_standard", False)
                            clauses.append(data)
                            print(f"  CLAUSE #{clause_count}: [{ct}] {title}")
                            print(f"    Explanation: {expl}...")
                            print(f"    Non-standard: {ns}")
                        elif event_type == "done":
                            total = data.get("total_clauses", 0)
                            print(f"  DONE: {total} clauses total")
                        elif event_type == "error":
                            msg = data.get("message", "unknown error")
                            errors.append(msg)
                            print(f"  ERROR: {msg}")

                print("---")
                print(f"Document type: {doc_type}")
                print(f"Total SSE events: {event_count}")
                print(f"Clauses received: {clause_count}")
                print(f"Errors: {len(errors)}")

                # Assertions
                assert clause_count > 0, "Expected at least 1 clause"
                assert len(errors) == 0, f"Got errors: {errors}"
                assert doc_type, "Expected document type classification"
                print("\n✅ TEST 1 PASSED\n")

                return clauses, doc_type


def test_qa(clauses, doc_type):
    """Test Q&A on a clause from the analysis results."""
    print("=" * 60)
    print("TEST 2: Clause Q&A (POST /api/v1/qa)")
    print("=" * 60)

    if not clauses:
        print("⚠️  No clauses to test Q&A with, skipping")
        return

    # Pick the first clause
    clause = clauses[0]
    question = "What does this mean for me in simple terms?"

    print(f"Clause: {clause.get('clause_title', '?')}")
    print(f"Question: {question}")
    print("---")

    payload = {
        "question": question,
        "clause_text": clause.get("original_text", ""),
        "clause_title": clause.get("clause_title", ""),
        "document_type": doc_type,
    }

    with httpx.Client(timeout=60.0) as client:
        with client.stream(
            "POST", "http://127.0.0.1:8000/api/v1/qa", json=payload
        ) as response:
            print(f"Status: {response.status_code}")
            assert response.status_code == 200

            event_type = ""
            tokens = []
            answer = ""
            answer_found = None

            for line in response.iter_lines():
                if line.startswith("event:"):
                    event_type = line.split(":", 1)[1].strip()
                elif line.startswith("data:"):
                    data_str = line.split(":", 1)[1].strip()
                    try:
                        data = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue

                    if event_type == "token":
                        tokens.append(data.get("token", ""))
                    elif event_type == "answer":
                        answer = data.get("answer", "")
                        answer_found = data.get("answer_found", None)
                    elif event_type == "error":
                        print(f"  ERROR: {data.get('message', '')}")

            print(f"Tokens streamed: {len(tokens)}")
            print(f"Answer found: {answer_found}")
            print(f"Answer: {answer[:200]}...")
            assert answer, "Expected a non-empty answer"
            print("\n✅ TEST 2 PASSED\n")


def test_validation_415():
    """Test that non-PDF/DOCX files get rejected with 415."""
    print("=" * 60)
    print("TEST 3: File Validation — 415 Unsupported Type")
    print("=" * 60)

    with httpx.Client(timeout=10.0) as client:
        files = {"file": ("test.jpg", b"fake image data", "image/jpeg")}
        response = client.post("http://127.0.0.1:8000/api/v1/analyse", files=files)
        print(f"Status: {response.status_code}")
        assert response.status_code == 415, f"Expected 415, got {response.status_code}"
        print("✅ TEST 3 PASSED\n")


def test_validation_413():
    """Test that oversized files get rejected with 413."""
    print("=" * 60)
    print("TEST 4: File Validation — 413 File Too Large")
    print("=" * 60)

    large_content = b"%PDF-1.4" + b"\x00" * (11 * 1024 * 1024)
    with httpx.Client(timeout=30.0) as client:
        files = {"file": ("big.pdf", large_content, "application/pdf")}
        response = client.post("http://127.0.0.1:8000/api/v1/analyse", files=files)
        print(f"Status: {response.status_code}")
        assert response.status_code == 413, f"Expected 413, got {response.status_code}"
        print("✅ TEST 4 PASSED\n")


def test_qa_validation():
    """Test that Q&A rejects questions over 500 chars."""
    print("=" * 60)
    print("TEST 5: Q&A Validation — 422 Question Too Long")
    print("=" * 60)

    with httpx.Client(timeout=10.0) as client:
        payload = {
            "question": "x" * 501,
            "clause_text": "Some text",
            "clause_title": "Test",
            "document_type": "Contract",
        }
        response = client.post("http://127.0.0.1:8000/api/v1/qa", json=payload)
        print(f"Status: {response.status_code}")
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✅ TEST 5 PASSED\n")


if __name__ == "__main__":
    print("\n🔍 ClearSign v1.0 — Rigorous End-to-End Testing\n")

    # Validation tests (fast)
    test_validation_415()
    test_validation_413()
    test_qa_validation()

    # Full pipeline test (uses Groq API)
    clauses, doc_type = test_analyse()

    # Q&A test (uses Groq API)
    test_qa(clauses, doc_type)

    print("=" * 60)
    print("🎉 ALL 5 TESTS PASSED")
    print("=" * 60)
