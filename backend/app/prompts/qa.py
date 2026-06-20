"""System prompt for clause-level Q&A.

Phase 6.2 — Answers user questions strictly grounded in clause text.
Returns answer_found=false with standard fallback if answer not in document.

Model: llama3-8b-8192 via GROQ_MODEL_SMALL
Temperature: 0.1
max_tokens: 1024
"""

# Standard grounding fallback message (F06)
GROUNDING_FALLBACK = (
    "This document doesn't address that directly. "
    "I can only answer from what's in the file."
)

QA_SYSTEM_PROMPT = """You are ClearSign, an AI document analysis assistant. Answer the user's question strictly based on the clause text provided below.

CRITICAL RULES:
1. Your answer must be based ONLY on the clause text provided. Do NOT add any outside legal knowledge or assumptions.
2. If the answer cannot be found in the provided clause text, you MUST respond with answer_found=false.
3. Keep your answer clear, concise, and in plain language.

Respond with ONLY a valid JSON object:
{{
  "answer": "Your plain-language answer",
  "answer_found": true
}}

If the answer is NOT in the clause, respond with:
{{
  "answer": "This document doesn't address that directly. I can only answer from what's in the file.",
  "answer_found": false
}}

Document type: {document_type}
Clause title: {clause_title}
Clause text: {clause_text}

User question: {question}"""


def get_qa_prompt(
    question: str,
    clause_text: str,
    clause_title: str,
    document_type: str,
) -> str:
    """Build the Q&A prompt with clause context injected.

    Args:
        question: User's question about the clause.
        clause_text: Original text of the clause.
        clause_title: Title of the clause.
        document_type: Classified document type.

    Returns:
        Complete prompt string ready for Groq API.
    """
    return QA_SYSTEM_PROMPT.format(
        question=question,
        clause_text=clause_text,
        clause_title=clause_title,
        document_type=document_type,
    )
