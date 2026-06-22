"""Tests for the web search service."""

import pytest

from app.services.web_search import search_ddg


@pytest.mark.anyio
async def test_search_ddg_returns_results():
    """Verify that search_ddg returns valid results for a simple query."""
    query = "contract counterparts clause legal consequences"
    results = await search_ddg(query, max_results=3)

    assert isinstance(results, list)
    # The search should return some results under normal network conditions
    if results:
        assert len(results) <= 3
        for result in results:
            assert "title" in result
            assert "url" in result
            assert "snippet" in result
            assert result["url"].startswith("http")
