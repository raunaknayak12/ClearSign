"""Q&A router — POST /api/v1/qa.

Phase 6.5 — Clause-level Q&A endpoint.
Accepts a question + clause context, streams a grounded AI answer using search.
"""

import asyncio
import json
import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ..models.request import QARequest
from ..prompts.qa import GROUNDING_FALLBACK, get_qa_prompt
from ..services.groq_client import MODEL_SMALL, call_completion
from ..services.web_search import search_ddg

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

    Streams the response token-by-token via SSE for progressive
    rendering on the frontend.
    """

    async def generate_sse():
        try:
            # 1. Perform web search to gather real-time context
            if request.clause_title and request.clause_title.lower() != "general":
                search_query = f"{request.document_type} {request.clause_title} {request.question}"
            else:
                search_query = f"{request.document_type} {request.question}"

            if len(search_query) > 200:
                search_query = search_query[:200]

            logger.info("Performing web search for query: %s", search_query)
            search_results = await search_ddg(search_query, max_results=4)

            # 2. Format search results
            if search_results:
                formatted_parts = []
                for idx, r in enumerate(search_results, 1):
                    formatted_parts.append(
                        f"{idx}. Title: {r['title']}\n"
                        f"   URL: {r['url']}\n"
                        f"   Snippet: {r['snippet']}\n"
                    )
                search_results_str = "\n".join(formatted_parts)
            else:
                search_results_str = "No search results available."

            # 3. Build prompt with search results
            prompt = get_qa_prompt(
                question=request.question,
                clause_text=request.clause_text,
                clause_title=request.clause_title,
                document_type=request.document_type,
                search_results_str=search_results_str,
            )

            # 4. Call Groq model
            logger.info("Calling Groq completion for Q&A...")
            full_response = await call_completion(
                prompt=prompt,
                model=MODEL_SMALL,
                max_tokens=1024,
                temperature=0.1,
            )

            # 5. Parse response
            json_str = full_response.strip()
            if json_str.startswith("```"):
                lines = json_str.split("\n")
                json_str = "\n".join(
                    line for line in lines
                    if not line.strip().startswith("```")
                )

            try:
                result = json.loads(json_str.strip())
                answer = result.get("answer", GROUNDING_FALLBACK)
                answer_found = result.get("answer_found", False)
            except (json.JSONDecodeError, KeyError):
                answer = full_response.strip() if full_response.strip() else GROUNDING_FALLBACK
                answer_found = bool(full_response.strip())

            # 6. Stream the answer word by word to the user (simulating typing/tokens)
            words = answer.split(" ")
            for i, word in enumerate(words):
                token = word if i == 0 else " " + word
                yield _format_sse(
                    "token",
                    json.dumps({"token": token}),
                )
                await asyncio.sleep(0.02)  # Smooth simulated typing speed

            # 7. Emit final answer event
            yield _format_sse(
                "answer",
                json.dumps({
                    "answer": answer,
                    "answer_found": answer_found,
                    "source_clause_id": "",
                }),
            )

            yield _format_sse("done", "{}")

        except Exception:
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

