"""Document analysis router — POST /api/v1/analyse.

Phase 6.4 — SSE streaming endpoint that:
1. Receives file upload (multipart/form-data)
2. Validates file (type, size, magic bytes)
3. Extracts text (PDF/DOCX)
4. Classifies document type
5. Segments clauses structurally (deterministic)
6. Streams clause-by-clause breakdown via SSE

All processing is in-memory. No file content is persisted.
"""

import asyncio
import hashlib
import json
import logging
import os

from fastapi import APIRouter, File, UploadFile
from fastapi.responses import StreamingResponse

from ..middleware.file_validation import validate_upload
from ..models.enums import ClauseType
from ..models.response import ClauseCard
from ..prompts.breakdown import get_breakdown_prompt
from ..services.classifier import classify_document
from ..services.clause_reconciler import parse_clauses_from_json, reconcile_clauses
from ..services.clause_segmenter import chunk_segments, segment_clauses
from ..services.extractor import extract_text
from ..services.groq_client import stream_breakdown

logger = logging.getLogger(__name__)

def _default_cache_dir() -> str:
    """Use /tmp on serverless (Vercel); local cache dir otherwise."""
    if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        return os.path.join("/tmp", "clearsign-cache")
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cache")


CACHE_DIR = os.getenv("CACHE_DIR", _default_cache_dir())
# Bump when segmentation or reconciliation logic changes to invalidate stale caches.
CACHE_VERSION = "v2"


def get_cached_analysis(text_hash: str) -> dict | None:
    cache_file = os.path.join(CACHE_DIR, f"{text_hash}.json")
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning("Failed to read analysis cache: %s", e)
            return None
    return None


def set_cached_analysis(text_hash: str, data: dict) -> None:
    try:
        os.makedirs(CACHE_DIR, exist_ok=True)
        cache_file = os.path.join(CACHE_DIR, f"{text_hash}.json")
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning("Failed to write analysis cache: %s", e)

router = APIRouter()


def _validate_clause_type(clause_type_str: str) -> str:
    """Validate and normalise clause type string against the enum."""
    try:
        return ClauseType(clause_type_str.lower()).value
    except ValueError:
        return ClauseType.STANDARD.value


def _format_sse(event: str, data: str, event_id: str | None = None) -> str:
    """Format a Server-Sent Event string."""
    lines = []
    if event_id:
        lines.append(f"id: {event_id}")
    lines.append(f"event: {event}")
    lines.append(f"data: {data}")
    lines.append("")
    return "\n".join(lines) + "\n"


@router.post("/analyse")
async def analyse_document(file: UploadFile = File(...)):
    """Analyse an uploaded document and stream clause breakdown via SSE."""
    file_bytes, file_type = await validate_upload(file)

    async def generate_sse():
        try:
            try:
                analysis = extract_text(file_bytes, file_type)
            except ValueError as e:
                yield _format_sse("error", json.dumps({"message": str(e)}))
                yield _format_sse("done", "{}")
                return

            text_hash = hashlib.md5(
                f"{CACHE_VERSION}:{analysis.raw_text}".encode("utf-8")
            ).hexdigest()
            cached_data = get_cached_analysis(text_hash)
            if cached_data:
                yield _format_sse(
                    "progress",
                    json.dumps({
                        "percent": 5,
                        "message": "Document classified",
                        "document_type": cached_data["document_type"],
                        "confidence": cached_data["confidence"],
                    }),
                )

                cached_clauses = cached_data.get("clauses", [])
                for idx, clause_dict in enumerate(cached_clauses):
                    clause = ClauseCard(**clause_dict)
                    yield _format_sse(
                        "clause",
                        clause.model_dump_json(),
                        event_id=clause.clause_id,
                    )

                    clause_counter = idx + 1
                    estimated_total = max(clause_counter + 2, 10)
                    progress_percent = min(
                        int(10 + (clause_counter / estimated_total) * 85),
                        95,
                    )
                    yield _format_sse(
                        "progress",
                        json.dumps({
                            "percent": progress_percent,
                            "clauses_received": clause_counter,
                        }),
                    )
                    await asyncio.sleep(0.05)

                final_count = len(cached_clauses)
                yield _format_sse(
                    "progress",
                    json.dumps({
                        "percent": 100,
                        "clauses_received": final_count,
                        "message": f"Analysis complete — {final_count} clauses covered",
                    }),
                )
                yield _format_sse("done", json.dumps({"total_clauses": final_count}))
                return

            doc_type_result = await classify_document(analysis.raw_text)

            yield _format_sse(
                "progress",
                json.dumps({
                    "percent": 5,
                    "message": "Document classified",
                    "document_type": doc_type_result.document_type,
                    "confidence": doc_type_result.confidence,
                }),
            )

            # Deterministic structural segmentation — same text always yields same count
            segments = segment_clauses(analysis.raw_text)
            if not segments:
                yield _format_sse(
                    "error",
                    json.dumps({
                        "message": "We couldn't identify any clauses in this document. Please check the file format."
                    }),
                )
                yield _format_sse("done", "{}")
                return

            logger.info(
                "Structurally segmented %d clauses from document (%d chars)",
                len(segments),
                analysis.char_count,
            )

            segment_chunks = chunk_segments(segments)
            total_chunks = len(segment_chunks)
            final_clauses: list[ClauseCard] = []
            clause_counter = 0
            total_segments = len(segments)

            for chunk_idx, chunk_segments_list in enumerate(segment_chunks):
                if total_chunks > 1:
                    yield _format_sse(
                        "progress",
                        json.dumps({
                            "percent": int(10 + (chunk_idx / total_chunks) * 80),
                            "message": f"Processing section {chunk_idx + 1} of {total_chunks}...",
                        }),
                    )

                prompt = get_breakdown_prompt(chunk_segments_list, doc_type_result.document_type)

                full_response = ""
                async for token in stream_breakdown(prompt):
                    full_response += token

                llm_clauses = parse_clauses_from_json(full_response)
                reconciled = reconcile_clauses(chunk_segments_list, llm_clauses)

                if len(llm_clauses) != len(chunk_segments_list):
                    logger.warning(
                        "LLM returned %d clauses for %d segments in chunk %d — reconciled to structural count",
                        len(llm_clauses),
                        len(chunk_segments_list),
                        chunk_idx + 1,
                    )

                for clause_data in reconciled:
                    clause_counter += 1
                    clause_id = f"clause_{clause_counter}"

                    clause = ClauseCard(
                        clause_id=clause_id,
                        clause_title=clause_data.get("clause_title", f"Clause {clause_counter}"),
                        clause_type=_validate_clause_type(
                            clause_data.get("clause_type", "standard")
                        ),
                        original_text=clause_data.get("original_text", ""),
                        explanation=clause_data.get("explanation", ""),
                        is_non_standard=clause_data.get("is_non_standard", False),
                        grounding_statement=clause_data.get("grounding_statement"),
                    )

                    yield _format_sse(
                        "clause",
                        clause.model_dump_json(),
                        event_id=clause_id,
                    )

                    progress_percent = min(
                        int(10 + (clause_counter / total_segments) * 85),
                        95,
                    )
                    yield _format_sse(
                        "progress",
                        json.dumps({
                            "percent": progress_percent,
                            "clauses_received": clause_counter,
                        }),
                    )

                    final_clauses.append(clause)

            final_count = len(final_clauses)

            new_cache_data = {
                "document_type": doc_type_result.document_type,
                "confidence": doc_type_result.confidence,
                "clauses": [c.model_dump() for c in final_clauses],
            }
            set_cached_analysis(text_hash, new_cache_data)

            yield _format_sse(
                "progress",
                json.dumps({
                    "percent": 100,
                    "clauses_received": final_count,
                    "message": f"Analysis complete — {final_count} clauses covered",
                }),
            )
            yield _format_sse("done", json.dumps({"total_clauses": final_count}))

        except Exception:
            logger.exception("Error during document analysis")
            yield _format_sse(
                "error",
                json.dumps({
                    "message": "Something went wrong while reading your document. Please try again."
                }),
            )
            yield _format_sse("done", "{}")

    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
