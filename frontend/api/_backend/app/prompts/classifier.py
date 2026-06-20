"""System prompt for document type classification.

Phase 6.2 — Classifies document type from the first 2,000 characters.

Model: llama3-8b-8192 via GROQ_MODEL_SMALL
Temperature: 0.1
max_tokens: 256
"""

CLASSIFIER_SYSTEM_PROMPT = """You are a document classifier. Given the first section of a legal or formal document, identify the document type.

Respond with ONLY a valid JSON object in this exact format:
{{
  "document_type": "the type of document",
  "confidence": 0.95
}}

Common document types include (but are not limited to):
- Rental Agreement
- Employment Contract
- Non-Disclosure Agreement (NDA)
- Service Agreement
- Sales Contract
- Partnership Agreement
- Loan Agreement
- Terms of Service
- Privacy Policy
- Consulting Agreement
- Lease Agreement
- Freelance Contract

Analyse this document excerpt:

{text_excerpt}"""


def get_classifier_prompt(text_excerpt: str) -> str:
    """Build the classifier prompt with document excerpt injected.

    Args:
        text_excerpt: First 2,000 characters of the extracted text.

    Returns:
        Complete prompt string ready for Groq API.
    """
    return CLASSIFIER_SYSTEM_PROMPT.format(text_excerpt=text_excerpt)
