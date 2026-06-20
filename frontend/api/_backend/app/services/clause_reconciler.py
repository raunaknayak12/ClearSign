"""Reconcile LLM clause output with structural segments and parse JSON responses."""

import json
import re

from .clause_segmenter import ClauseSegment


def parse_clauses_from_json(json_text: str) -> list[dict]:
    """Parse clause data from AI-generated JSON response."""
    text = json_text.strip()

    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(
            line for line in lines if not line.strip().startswith("```")
        )
        text = text.strip()

    for candidate in (text, _repair_json_array(text)):
        if not candidate:
            continue
        try:
            result = json.loads(candidate)
            if isinstance(result, list):
                return [item for item in result if isinstance(item, dict)]
            if isinstance(result, dict):
                return [result]
        except json.JSONDecodeError:
            continue

    objects = re.findall(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", text, re.DOTALL)
    parsed: list[dict] = []
    for obj_str in objects:
        try:
            obj = json.loads(obj_str)
            if isinstance(obj, dict) and "clause_title" in obj:
                parsed.append(obj)
        except json.JSONDecodeError:
            continue
    return parsed


def _repair_json_array(text: str) -> str | None:
    """Attempt to repair truncated or malformed JSON arrays."""
    start = text.find("[")
    if start == -1:
        return None
    fragment = text[start:]
    fragment = re.sub(r",\s*$", "", fragment.rstrip())
    if not fragment.endswith("]"):
        fragment += "]"
    return fragment


def reconcile_clauses(
    segments: list[ClauseSegment],
    llm_clauses: list[dict],
) -> list[dict]:
    """Align LLM output to structurally parsed segments.

    Structural segments define the authoritative clause count and text.
    """
    reconciled: list[dict] = []

    for idx, segment in enumerate(segments):
        llm = llm_clauses[idx] if idx < len(llm_clauses) else {}

        reconciled.append({
            "clause_title": llm.get("clause_title") or segment.title or f"Section {segment.section_ref}",
            "clause_type": llm.get("clause_type", "standard"),
            "original_text": segment.text,
            "explanation": llm.get("explanation", "This clause is part of the agreement."),
            "is_non_standard": bool(llm.get("is_non_standard", False)),
            "grounding_statement": llm.get(
                "grounding_statement",
                f"This is based on section {segment.section_ref} of the document.",
            ),
        })

    return reconciled
