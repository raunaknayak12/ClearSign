"""Deterministic clause segmentation for legal documents.

Identifies clause boundaries from document structure (numbered sections,
articles, clauses) so the same extracted text always yields the same
clause count — independent of LLM variability.
"""

import re
from dataclasses import dataclass

# Page markers inserted by PDF extraction — not clause boundaries.
_PAGE_MARKER_RE = re.compile(r"^--- PAGE \d+ ---$")

# Line-start patterns for legal clause headers (order: more specific first).
_HEADER_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (
        re.compile(
            r"^(?:Section|SECTION)\s+(\d+(?:\.\d+)*)\s*[.:]?\s*(.*)$",
            re.IGNORECASE,
        ),
        "section",
    ),
    (
        re.compile(
            r"^(?:Article|ARTICLE)\s+([IVXLC]+|\d+(?:\.\d+)*)\s*[.:]?\s*(.*)$",
            re.IGNORECASE,
        ),
        "article",
    ),
    (
        re.compile(
            r"^(?:Clause|CLAUSE)\s+(\d+(?:\.\d+)*)\s*[.:]?\s*(.*)$",
            re.IGNORECASE,
        ),
        "clause",
    ),
    (
        re.compile(r"^(\d+\.\d+(?:\.\d+)*)\s+(.+)$"),
        "numbered_sub",
    ),
    (
        re.compile(r"^(\d+)\.\s+([A-Z\u00C0-\u024F].+)$"),
        "numbered",
    ),
    (
        re.compile(r"^(\d+)\)\s+(.+)$"),
        "numbered_paren",
    ),
]


@dataclass(frozen=True)
class ClauseSegment:
    """A single clause identified by structural parsing."""

    section_ref: str
    title: str
    text: str
    start_pos: int
    end_pos: int


@dataclass
class _HeaderMatch:
    pos: int
    ref: str
    title: str
    pattern: str
    line: str


def _normalise_ref(ref: str) -> str:
    return ref.strip().rstrip(".")


def _ref_depth(ref: str) -> int:
    """Depth of a numeric reference: '1' -> 1, '1.2' -> 2."""
    if re.fullmatch(r"[IVXLC]+", ref, re.IGNORECASE):
        return 1
    return ref.count(".") + 1


def _find_headers(text: str) -> list[_HeaderMatch]:
    """Scan document lines and collect clause header candidates."""
    headers: list[_HeaderMatch] = []
    pos = 0

    for line in text.split("\n"):
        stripped = line.strip()
        line_len = len(line) + 1

        if not stripped or _PAGE_MARKER_RE.match(stripped):
            pos += line_len
            continue

        for pattern, pattern_name in _HEADER_PATTERNS:
            match = pattern.match(stripped)
            if match:
                ref = _normalise_ref(match.group(1))
                title = match.group(2).strip() if match.lastindex and match.lastindex >= 2 else ""
                # Skip bare numbers that look like dates or page numbers
                if pattern_name == "numbered" and ref.isdigit() and int(ref) > 50:
                    break
                headers.append(
                    _HeaderMatch(
                        pos=pos,
                        ref=ref,
                        title=title,
                        pattern=pattern_name,
                        line=stripped,
                    )
                )
                break

        pos += line_len

    return headers


def _select_header_set(headers: list[_HeaderMatch]) -> list[_HeaderMatch]:
    """Pick the most consistent header pattern/depth for this document."""
    if not headers:
        return []

    # Group by pattern type
    by_pattern: dict[str, list[_HeaderMatch]] = {}
    for h in headers:
        by_pattern.setdefault(h.pattern, []).append(h)

    best: list[_HeaderMatch] = []

    for pattern_headers in by_pattern.values():
        # Within each pattern, try each depth level
        depths = {_ref_depth(h.ref) for h in pattern_headers}
        for depth in sorted(depths):
            filtered = [h for h in pattern_headers if _ref_depth(h.ref) == depth]
            if len(filtered) > len(best):
                best = filtered

    # Prefer finer granularity when top-level sections have many sub-clauses
    section_headers = by_pattern.get("section", [])
    sub_numbered = [h for h in headers if h.pattern == "numbered_sub"]
    if section_headers and sub_numbered and len(sub_numbered) > len(section_headers):
        if len(sub_numbered) >= len(best):
            best = sub_numbered

    numbered = by_pattern.get("numbered", [])
    if numbered and sub_numbered and len(sub_numbered) > len(numbered):
        if len(sub_numbered) >= len(best):
            best = sub_numbered

    # Sort by document position and deduplicate by ref
    best.sort(key=lambda h: h.pos)
    seen_refs: set[str] = set()
    unique: list[_HeaderMatch] = []
    for h in best:
        key = h.ref.lower()
        if key not in seen_refs:
            seen_refs.add(key)
            unique.append(h)

    return unique


def _split_paragraphs(text: str) -> list[ClauseSegment]:
    """Fallback: split on blank lines for documents without numbered sections."""
    blocks = re.split(r"\n\s*\n", text.strip())
    segments: list[ClauseSegment] = []

    pos = 0
    for idx, block in enumerate(blocks, start=1):
        block = block.strip()
        if not block or _PAGE_MARKER_RE.match(block):
            continue
        if len(block) < 40:
            continue

        # Use first line as title when short enough
        lines = block.split("\n", 1)
        title = lines[0][:80].strip()
        if len(title) > 60:
            title = f"Paragraph {idx}"

        start = text.find(block, pos)
        if start == -1:
            start = pos
        end = start + len(block)

        segments.append(
            ClauseSegment(
                section_ref=str(idx),
                title=title,
                text=block,
                start_pos=start,
                end_pos=end,
            )
        )
        pos = end

    return segments


def segment_clauses(raw_text: str) -> list[ClauseSegment]:
    """Segment document text into clauses using structural rules.

    The same input text always produces the same segments in the same order.

    Args:
        raw_text: Full extracted document text.

    Returns:
        Ordered list of clause segments with verbatim text.
    """
    text = raw_text.strip()
    if not text:
        return []

    headers = _find_headers(text)
    selected = _select_header_set(headers)

    if len(selected) < 2:
        return _split_paragraphs(text)

    segments: list[ClauseSegment] = []
    for idx, header in enumerate(selected):
        end_pos = selected[idx + 1].pos if idx + 1 < len(selected) else len(text)
        clause_text = text[header.pos:end_pos].strip()

        title = header.title
        if not title:
            # Derive title from first line after the reference
            first_line = clause_text.split("\n", 1)[0].strip()
            title = first_line[:80] if first_line else f"Section {header.ref}"
        if len(title) > 100:
            title = title[:97] + "..."

        segments.append(
            ClauseSegment(
                section_ref=header.ref,
                title=title,
                text=clause_text,
                start_pos=header.pos,
                end_pos=end_pos,
            )
        )

    return segments


def chunk_segments(
    segments: list[ClauseSegment],
    max_tokens: int = 5000,
) -> list[list[ClauseSegment]]:
    """Group clause segments into token-bounded chunks without splitting clauses.

    Unlike character-based chunking, this never duplicates clauses across chunks.

    Args:
        segments: Ordered clause segments.
        max_tokens: Maximum tokens per chunk (1 token ≈ 4 chars).

    Returns:
        List of segment groups, each fitting within the token budget.
    """
    if not segments:
        return []

    max_chars = max_tokens * 4
    chunks: list[list[ClauseSegment]] = []
    current: list[ClauseSegment] = []
    current_chars = 0

    for segment in segments:
        seg_chars = len(segment.text)
        if current and current_chars + seg_chars > max_chars:
            chunks.append(current)
            current = []
            current_chars = 0
        current.append(segment)
        current_chars += seg_chars

    if current:
        chunks.append(current)

    return chunks
