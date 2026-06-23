# ruff: noqa: E402
from dotenv import load_dotenv
load_dotenv()

import asyncio
import io
import json
import os
import sys
import time
from typing import Any

from app.services.clause_segmenter import segment_clauses
from app.services.extractor import extract_pdf_text
from app.services.groq_client import classify_document, get_client, stream_breakdown
from app.services.pdf_generator import generate_report_pdf

# Define a stable sample text for segmentation tests
SAMPLE_NDA = """
NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of the date last signed below.

1. Definitions
1.1 "Confidential Information" means any information disclosed by either party.
1.2 "Disclosing Party" means the party disclosing Confidential Information.
1.3 "Receiving Party" means the party receiving Confidential Information.

2. Obligations of Receiving Party
2.1 The Receiving Party shall hold Confidential Information in strict confidence.
2.2 The Receiving Party shall not disclose Confidential Information to third parties.
2.3 The Receiving Party shall use Confidential Information solely for the permitted purpose.

3. Exclusions
3.1 Information that is publicly available is not Confidential Information.
3.2 Information independently developed is not Confidential Information.

4. Term
4.1 This Agreement shall remain in effect for a period of two years.
4.2 Either party may terminate with thirty days written notice.

5. Return of Materials
5.1 Upon request, the Receiving Party shall return all Confidential Information.

6. No License
6.1 Nothing in this Agreement grants any license or rights to intellectual property.

7. Governing Law
7.1 This Agreement shall be governed by the laws of the State of Delaware.

8. Entire Agreement
8.1 This Agreement constitutes the entire agreement between the parties.
"""


def run_local_benchmarks() -> dict[str, Any]:
    """Run local sync offline benchmarks."""
    print("\n" + "=" * 60)
    print("      RUNNING LOCAL COMPONENT BENCHMARKS (100% OFFLINE)")
    print("=" * 60)

    # 1. PDF Text Extraction Benchmark
    pdf_path = "tests/test_contract.pdf"
    avg_extract_time = None
    if os.path.exists(pdf_path):
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        print(f"[*] Benchmarking PDF extraction (file size: {len(pdf_bytes)} bytes)...")
        start_time = time.perf_counter()
        iterations = 100
        for _ in range(iterations):
            extract_pdf_text(pdf_bytes)
        end_time = time.perf_counter()
        avg_extract_time = (end_time - start_time) / iterations * 1000  # in ms
        print(f"    -> PDF Extraction Average: {avg_extract_time:.2f} ms per file")
    else:
        print("[!] Warning: tests/test_contract.pdf not found, skipping PDF extraction benchmark.")

    # 2. Clause Segmentation Benchmark
    print("[*] Benchmarking Clause Segmentation (1000 runs)...")
    start_time = time.perf_counter()
    iterations_seg = 1000
    for _ in range(iterations_seg):
        segment_clauses(SAMPLE_NDA)
    end_time = time.perf_counter()
    avg_seg_time = (end_time - start_time) / iterations_seg * 1000  # in ms
    segments_count = len(segment_clauses(SAMPLE_NDA))
    print(f"    -> Clause Segmentation Average: {avg_seg_time:.3f} ms (Found {segments_count} clauses)")

    # 3. PDF Report Generation Benchmark
    dummy_clauses = [
        {
            "clause_id": f"clause_{i}",
            "clause_title": f"Test Clause {i}",
            "clause_type": "standard" if i % 2 == 0 else "payment",
            "original_text": f"This is section {i}. The parties agree to behave properly and make payments.",
            "explanation": f"This is plain English explanation for clause {i}. It clarifies rights and obligations.",
            "is_non_standard": i % 3 == 0,
            "grounding_statement": f"Based on paragraph {i}.",
        }
        for i in range(1, 11)
    ]
    report_data = {
        "document_type": "Mutual Nondisclosure Agreement",
        "clauses": dummy_clauses,
    }

    print("[*] Benchmarking PDF Report Generation (100 runs)...")
    start_time = time.perf_counter()
    iterations_pdf = 100
    for _ in range(iterations_pdf):
        buffer = io.BytesIO()
        generate_report_pdf(report_data, buffer)
        buffer.close()
    end_time = time.perf_counter()
    avg_pdf_time = (end_time - start_time) / iterations_pdf * 1000  # in ms
    print(f"    -> PDF Report Generation Average: {avg_pdf_time:.2f} ms for 10-clause document")

    return {
        "pdf_extraction_ms": avg_extract_time,
        "segmentation_ms": avg_seg_time,
        "report_generation_ms": avg_pdf_time,
        "segment_count": segments_count,
    }


async def run_api_benchmarks() -> dict[str, Any] | None:
    """Run live API benchmarks asynchronously."""
    print("\n" + "=" * 60)
    print("      RUNNING LIVE GROQ API BENCHMARKS (ONLINE)")
    print("=" * 60)

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("[!] GROQ_API_KEY is not set. Skipping API benchmarks.")
        return None

    try:
        # Check if the client is valid
        get_client()
    except Exception as e:
        print(f"[!] Failed to initialize Groq client: {e}. Skipping API benchmarks.")
        return None

    # 1. Document Classification API Benchmark
    classifier_prompt = (
        "Classify this document type (e.g. NDA, Rental Agreement, Employment Agreement, "
        "Service Agreement, or Other). Return JSON only with 'document_type' and 'confidence'.\n\n"
        "NDA Sample text."
    )
    print("[*] Benchmarking Document Classification (small model: llama-3.1-8b-instant)...")
    start_time = time.perf_counter()
    try:
        classification_json = await classify_document(classifier_prompt)
        end_time = time.perf_counter()
        classification_time = end_time - start_time
        print(f"    -> Classification Time: {classification_time:.2f} seconds")
        print(f"    -> Result: {classification_json.strip()}")
    except Exception as e:
        print(f"    [!] Classification failed: {e}")
        classification_time = None

    # 2. Clause Breakdown Streaming API Benchmark
    breakdown_prompt = (
        "Extract, categorize, and explain each clause from this text. "
        "Format as JSON array of objects with keys: clause_title, clause_type, "
        "original_text, explanation, is_non_standard, grounding_statement.\n\n"
        f"Text:\n{SAMPLE_NDA}"
    )
    print("[*] Benchmarking Clause Breakdown Streaming (large model: llama-3.3-70b-versatile)...")

    start_time = time.perf_counter()
    first_token_time = None
    tokens_received = 0
    full_response = ""

    try:
        async for token in stream_breakdown(breakdown_prompt):
            if first_token_time is None:
                first_token_time = time.perf_counter() - start_time
                print(f"    -> Time to First Token (TTFT): {first_token_time:.2f} seconds")

            full_response += token
            tokens_received += len(token.split())  # Rough approximation of tokens

        end_time = time.perf_counter()
        total_time = end_time - start_time
        if total_time > (first_token_time or 0):
            stream_throughput = tokens_received / (total_time - (first_token_time or 0))
        else:
            stream_throughput = 0.0

        print(f"    -> Total Streaming time: {total_time:.2f} seconds")
        print(f"    -> Estimated throughput: {stream_throughput:.2f} words/sec")
        print(f"    -> Response length: {len(full_response)} characters")
    except Exception as e:
        print(f"    [!] Streaming failed: {e}")
        first_token_time = None
        total_time = None
        stream_throughput = None

    return {
        "classification_sec": classification_time,
        "breakdown_ttft_sec": first_token_time,
        "breakdown_total_sec": total_time,
        "throughput_words_sec": stream_throughput,
    }


def save_report(report: dict[str, Any]) -> None:
    """Save the final benchmark report to a JSON file."""
    with open("benchmark_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)


async def main() -> None:
    """Main execution function."""
    local_results = run_local_benchmarks()
    api_results = await run_api_benchmarks()

    print("\n" + "=" * 60)
    print("                    BENCHMARK SUMMARY REPORT")
    print("=" * 60)

    report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "hardware_os": sys.platform,
        "python_version": sys.version.split()[0],
        "local_performance": local_results,
        "api_performance": api_results,
    }

    print(json.dumps(report, indent=2))
    save_report(report)
    print("\n[+] Benchmark results successfully saved to 'backend/benchmark_report.json'")


if __name__ == "__main__":
    asyncio.run(main())
