"""System prompt for document type classification.

Phase 6.2 — Classifies document type from the first 2,000 characters.

Model: llama3-8b-8192 via GROQ_MODEL_SMALL
Temperature: 0.1
max_tokens: 256
"""

CLASSIFIER_SYSTEM_PROMPT = (
    "You are a document classifier. "
    "Given the first section of a legal or formal document, "
    "identify the document type.\n"
    "\n"
    "Respond with ONLY a valid JSON object in this exact format:\n"
    "{{\n"
    '  "document_type": "the type of document",\n'
    '  "confidence": 0.95\n'
    "}}\n"
    "\n"
    "Common document types include (but are not limited to):\n"
    "- Rental Agreement\n"
    "- Employment Contract\n"
    "- Non-Disclosure Agreement (NDA)\n"
    "- Service Agreement\n"
    "- Sales Contract\n"
    "- Partnership Agreement\n"
    "- Loan Agreement\n"
    "- Terms of Service\n"
    "- Privacy Policy\n"
    "- Consulting Agreement\n"
    "- Lease Agreement\n"
    "- Freelance Contract\n"
    "\n"
    "Analyse this document excerpt:\n"
    "\n"
    "{text_excerpt}"
)


def get_classifier_prompt(text_excerpt: str) -> str:
    """Build the classifier prompt with document excerpt injected.

    Args:
        text_excerpt: First 2,000 characters of the extracted text.

    Returns:
        Complete prompt string ready for Groq API.
    """
    return CLASSIFIER_SYSTEM_PROMPT.format(text_excerpt=text_excerpt)
