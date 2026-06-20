"""Tests for deterministic clause segmentation.

Ensures the same document text always produces the same clause count.
"""

from app.services.clause_segmenter import chunk_segments, segment_clauses

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


class TestClauseSegmenter:
    """Tests for structural clause segmentation."""

    def test_same_text_produces_same_count(self):
        """Identical input must always yield identical clause counts."""
        result_a = segment_clauses(SAMPLE_NDA)
        result_b = segment_clauses(SAMPLE_NDA)
        assert len(result_a) == len(result_b)
        assert len(result_a) > 0

    def test_same_text_produces_same_refs(self):
        """Section references must be stable across repeated parsing."""
        first = segment_clauses(SAMPLE_NDA)
        second = segment_clauses(SAMPLE_NDA)
        refs_a = [s.section_ref for s in first]
        refs_b = [s.section_ref for s in second]
        assert refs_a == refs_b

    def test_nda_subsections_detected(self):
        """NDA with numbered subsections should find all sub-clauses."""
        segments = segment_clauses(SAMPLE_NDA)
        # 8 top-level sections with subsections = more than 8 clauses
        assert len(segments) >= 14

    def test_segments_contain_verbatim_text(self):
        """Each segment must contain non-empty verbatim text."""
        segments = segment_clauses(SAMPLE_NDA)
        for seg in segments:
            assert len(seg.text) > 0
            assert seg.section_ref

    def test_empty_text_returns_empty(self):
        """Empty input returns no segments."""
        assert segment_clauses("") == []
        assert segment_clauses("   ") == []

    def test_chunk_segments_never_splits_clause(self):
        """Clause-based chunking keeps whole clauses together."""
        segments = segment_clauses(SAMPLE_NDA)
        chunks = chunk_segments(segments, max_tokens=100)
        total_in_chunks = sum(len(c) for c in chunks)
        assert total_in_chunks == len(segments)

    def test_chunk_segments_deterministic(self):
        """Chunking must be deterministic for the same segments."""
        segments = segment_clauses(SAMPLE_NDA)
        chunks_a = chunk_segments(segments, max_tokens=200)
        chunks_b = chunk_segments(segments, max_tokens=200)
        assert [len(c) for c in chunks_a] == [len(c) for c in chunks_b]

    def test_section_headers_detected(self):
        """Documents with Section headers are segmented correctly."""
        text = """
Section 1. Introduction
This is the introduction text for the agreement.

Section 2. Payment Terms
The tenant shall pay rent monthly.

Section 3. Termination
Either party may terminate with notice.
"""
        segments = segment_clauses(text)
        assert len(segments) == 3
        assert segments[0].section_ref == "1"
        assert segments[1].section_ref == "2"

    def test_paragraph_fallback_for_unstructured(self):
        """Documents without numbering fall back to paragraph splitting."""
        text = (
            "This is the first substantial paragraph of an agreement. "
            "It contains enough text to be considered a clause segment.\n\n"
            "This is the second substantial paragraph of the agreement. "
            "It also contains enough text to be considered a clause segment.\n\n"
            "This is the third substantial paragraph of the agreement. "
            "It also contains enough text to be considered a clause segment."
        )
        segments = segment_clauses(text)
        assert len(segments) >= 2
