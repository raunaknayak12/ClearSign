"""Document type classifier service.

Phase 6.3 — Classifies the document type from the first 2,000 characters
using the small Groq model. Result is injected into the breakdown prompt
to activate domain-specific knowledge (F04).
"""

import json
import logging

from ..models.response import DocumentTypeResult
from ..prompts.classifier import get_classifier_prompt
from ..services.groq_client import classify_document as groq_classify

logger = logging.getLogger(__name__)


async def classify_document(raw_text: str) -> DocumentTypeResult:
    """Classify the type of a legal document.

    Sends the first 2,000 characters to the small Groq model
    and parses the JSON response into a DocumentTypeResult.

    Args:
        raw_text: Full extracted document text.

    Returns:
        DocumentTypeResult with document_type, confidence, and excerpt.
    """
    # Take first 2,000 characters for classification
    excerpt = raw_text[:2000]

    # Build prompt and call Groq
    prompt = get_classifier_prompt(excerpt)
    response_text = await groq_classify(prompt)

    # Parse JSON response
    try:
        # Try to extract JSON from the response (model may include markdown)
        json_str = response_text.strip()
        if json_str.startswith("```"):
            # Remove markdown code fences
            lines = json_str.split("\n")
            json_str = "\n".join(
                line for line in lines
                if not line.strip().startswith("```")
            )

        result = json.loads(json_str)

        return DocumentTypeResult(
            document_type=result.get("document_type", "Legal Document"),
            confidence=float(result.get("confidence", 0.5)),
            first_2000_chars=excerpt,
        )
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        logger.warning("Failed to parse classifier response: %s", e)
        # Fallback to generic type
        return DocumentTypeResult(
            document_type="Legal Document",
            confidence=0.3,
            first_2000_chars=excerpt,
        )
