"""Web search service using DuckDuckGo Lite search.

Phase 6.8 — Performs real-time web searches to augment Q&A context.
"""

import asyncio
import logging
from urllib.parse import parse_qs, quote, urlparse

import httpx
from lxml import html

logger = logging.getLogger(__name__)

# Highly trusted, reliable domains preferred for Q&A citations
TRUSTED_DOMAINS = [
    "lawinsider.com", "nolo.com", "findlaw.com", "legalmatch.com", "justia.com",
    "law.cornell.edu", "wikipedia.org", "investopedia.org", "thehindu.com",
    "theprint.in", "reuters.com", "bloomberg.com", "nytimes.com", "forbes.com",
    "economist.com", "bbc.com", "indianexpress.com"
]


def generate_chrome_text_fragment(snippet: str) -> str:
    """Generate a Chrome Scroll-To-Text fragment URL query from a snippet."""
    # Clean the snippet: remove ellipsis and split to words
    clean_snippet = snippet.replace("...", " ").replace("..", " ").strip()
    words = [w.strip() for w in clean_snippet.split() if w.strip()]
    if not words:
        return ""

    # Choose up to 6 continuous words
    num_words = min(6, len(words))
    phrase_words = words[:num_words]
    phrase = " ".join(phrase_words)

    # Clean characters that might cause matching issues in Text Fragments
    phrase = "".join(c for c in phrase if c.isalnum() or c.isspace())
    return quote(phrase.strip())


async def validate_result(result: dict) -> dict | None:
    """Verify that a search result URL is active, working, and not returning 404/errors.

    Appends Chrome Scroll-To-Text fragment query if valid.
    """
    url = result["url"]
    snippet = result["snippet"]
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": (
            "text/html,application/xhtml+xml,"
            "application/xml;q=0.9,image/webp,*/*;q=0.8"
        ),
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
    }

    try:
        async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
            # Try HEAD first for speed
            response = await client.head(url, headers=headers)
            if response.status_code != 200:
                # Some servers block HEAD; try GET
                response = await client.get(url, headers=headers)

            if response.status_code == 200:
                # Generate text fragment
                fragment = generate_chrome_text_fragment(snippet)
                if fragment:
                    if "#" in url:
                        result["url"] = f"{url}&:~:text={fragment}"
                    else:
                        result["url"] = f"{url}#:~:text={fragment}"
                return result
            else:
                logger.warning(
                    "URL %s returned status %d — filtering out",
                    url, response.status_code,
                )
    except Exception as e:
        logger.warning(
            "URL validation failed for %s: %s — filtering out",
            url, e,
        )

    return None


def score_result(result: dict) -> int:
    """Assign higher score to highly trusted domains to prioritize them in sorting."""
    url = result["url"].lower()
    for domain in TRUSTED_DOMAINS:
        if domain in url:
            return 1
    return 0


async def search_ddg(query: str, max_results: int = 4) -> list[dict[str, str]]:
    """Perform an async web search on DuckDuckGo Lite.

    Uses POST to prioritize and validate results.

    Args:
        query: The search query string.
        max_results: Maximum number of results to return.

    Returns:
        List of dicts with 'title', 'url', and 'snippet'
        containing verified active URLs.
    """
    url = "https://lite.duckduckgo.com/lite/"
    data = {"q": query}
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": (
            "text/html,application/xhtml+xml,"
            "application/xml;q=0.9,image/webp,"
            "image/apng,*/*;q=0.8,"
            "application/signed-exchange;v=b3;q=0.7"
        ),
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": "https://lite.duckduckgo.com",
        "Referer": "https://lite.duckduckgo.com/",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(url, data=data, headers=headers)

        if response.status_code != 200:
            logger.warning(
                "DuckDuckGo Lite search returned status code %d", response.status_code
            )
            return []

        tree = html.fromstring(response.content)
        raw_results = []
        links = tree.xpath('//a[@class="result-link"]')

        for link in links:
            title = "".join(link.itertext()).strip()
            href = link.get("href", "")

            if not href:
                continue

            # Parse out snippet
            tr_parent = link.xpath('./ancestor::tr')
            snippet = ""
            if tr_parent:
                snippet_xpath = (
                    './following-sibling::tr'
                    '//td[@class="result-snippet"]'
                )
                snippet_tds = tr_parent[0].xpath(snippet_xpath)
                if snippet_tds:
                    snippet = "".join(snippet_tds[0].itertext()).strip()

            if href.startswith("//"):
                href = "https:" + href
            elif href.startswith("/"):
                href = "https://duckduckgo.com" + href

            if "uddg=" in href:
                parsed = urlparse(href)
                qs = parse_qs(parsed.query)
                if "uddg" in qs and qs["uddg"]:
                    href = qs["uddg"][0]

            raw_results.append({
                "title": title,
                "url": href,
                "snippet": snippet,
            })

        # 1. Prioritize trusted domains by sorting them first
        raw_results.sort(key=score_result, reverse=True)

        # 2. Asynchronously validate raw results in parallel
        validation_tasks = [
            validate_result(r) for r in raw_results[:8]
        ]
        validated_results = await asyncio.gather(
            *validation_tasks, return_exceptions=True
        )

        # 3. Filter out non-working links and exceptions
        final_results = [
            r for r in validated_results
            if r is not None and not isinstance(r, BaseException)
        ]
        return final_results[:max_results]

    except Exception:
        logger.exception("Failed to perform web search for query: %s", query)
        return []


