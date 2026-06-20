"""Tests for clause reconciliation in the analyse router."""

from app.services.clause_reconciler import parse_clauses_from_json, reconcile_clauses
from app.services.clause_segmenter import ClauseSegment


class TestReconcileClauses:
    """Tests for aligning LLM output to structural segments."""

    def _make_segments(self, count: int) -> list[ClauseSegment]:
        return [
            ClauseSegment(
                section_ref=str(i),
                title=f"Section {i}",
                text=f"Verbatim text for clause {i}.",
                start_pos=i * 10,
                end_pos=i * 10 + 5,
            )
            for i in range(1, count + 1)
        ]

    def test_reconcile_fills_missing_llm_clauses(self):
        """When LLM returns fewer clauses, structural segments still win."""
        segments = self._make_segments(5)
        llm = [{"clause_title": "A", "clause_type": "standard", "explanation": "Exp A"}]
        result = reconcile_clauses(segments, llm)
        assert len(result) == 5
        assert result[0]["original_text"] == segments[0].text
        assert result[4]["original_text"] == segments[4].text

    def test_reconcile_ignores_extra_llm_clauses(self):
        """When LLM returns more clauses, count stays at segment count."""
        segments = self._make_segments(3)
        llm = [
            {"clause_title": f"C{i}", "clause_type": "standard", "explanation": f"E{i}"}
            for i in range(6)
        ]
        result = reconcile_clauses(segments, llm)
        assert len(result) == 3

    def test_reconcile_preserves_structural_text(self):
        """Original text always comes from structural parsing, not LLM."""
        segments = self._make_segments(2)
        llm = [
            {
                "clause_title": "LLM Title",
                "original_text": "Hallucinated text",
                "clause_type": "confidentiality",
                "explanation": "Explanation",
            }
        ]
        result = reconcile_clauses(segments, llm)
        assert result[0]["original_text"] == segments[0].text
        assert "Hallucinated" not in result[0]["original_text"]


class TestParseClausesFromJson:
    """Tests for robust JSON parsing of LLM responses."""

    def test_parses_clean_array(self):
        raw = '[{"clause_title": "Test", "clause_type": "standard"}]'
        result = parse_clauses_from_json(raw)
        assert len(result) == 1
        assert result[0]["clause_title"] == "Test"

    def test_strips_markdown_fences(self):
        raw = '```json\n[{"clause_title": "Test", "clause_type": "standard"}]\n```'
        result = parse_clauses_from_json(raw)
        assert len(result) == 1

    def test_repairs_truncated_array(self):
        raw = '[{"clause_title": "A", "clause_type": "standard"}, {"clause_title": "B"'
        result = parse_clauses_from_json(raw)
        assert len(result) >= 1

    def test_empty_returns_empty_list(self):
        assert parse_clauses_from_json("") == []
        assert parse_clauses_from_json("not json") == []
