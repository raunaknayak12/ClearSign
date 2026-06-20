"""Q&A router — POST /api/v1/qa.

Phase 6.5 — Clause-level Q&A endpoint.
Accepts a question + clause context, streams a grounded AI answer.
Returns answer_found=false if the answer cannot be grounded in clause text.
"""

import json
import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ..models.request import QARequest
from ..prompts.qa import GROUNDING_FALLBACK, get_qa_prompt
from ..services.groq_client import stream_qa

logger = logging.getLogger(__name__)

router = APIRouter()


def _format_sse(event: str, data: str, event_id: str | None = None) -> str:
    """Format a Server-Sent Event string."""
    lines = []
    if event_id:
        lines.append(f"id: {event_id}")
    lines.append(f"event: {event}")
    lines.append(f"data: {data}")
    lines.append("")
    return "\n".join(lines) + "\n"


@router.post("/qa")
async def ask_question(request: QARequest):
    """Answer a user's question about a specific clause.

    The AI response is grounded strictly in the provided clause text.
    If the answer cannot be found, returns answer_found=false with
    the standard grounding fallback message.

    Streams the response token-by-token via SSE for progressive
    rendering on the frontend.

    Args:
        request: QARequest with question, clause_text, clause_title, document_type.

    Returns:
        StreamingResponse with text/event-stream content type.
    """

    async def generate_sse():
        try:
            # Build prompt with clause context
            prompt = get_qa_prompt(
                question=request.question,
                clause_text=request.clause_text,
                clause_title=request.clause_title,
                document_type=request.document_type,
            )

            # Collect full response from streaming
            full_response = ""
            async for token in stream_qa(prompt):
                full_response += token

                # Stream tokens for progressive rendering
                yield _format_sse(
                    "token",
                    json.dumps({"token": token}),
                )

            # Parse the final JSON response
            try:
                # Clean up response
                json_str = full_response.strip()
                if json_str.startswith("```"):
                    lines = json_str.split("\n")
                    json_str = "\n".join(
                        line for line in lines
                        if not line.strip().startswith("```")
                    )

                result = json.loads(json_str.strip())
                answer = result.get("answer", GROUNDING_FALLBACK)
                answer_found = result.get("answer_found", False)
            except (json.JSONDecodeError, KeyError):
                # If we can't parse JSON, use the raw response as the answer
                answer = full_response.strip() if full_response.strip() else GROUNDING_FALLBACK
                answer_found = bool(full_response.strip())

            # Emit final answer event
            yield _format_sse(
                "answer",
                json.dumps({
                    "answer": answer,
                    "answer_found": answer_found,
                    "source_clause_id": "",
                }),
            )

            yield _format_sse("done", "{}")

        except Exception as e:
            logger.exception("Error during Q&A processing")
            yield _format_sse(
                "error",
                json.dumps({
                    "message": "Something went wrong while processing your question. Please try again.",
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
