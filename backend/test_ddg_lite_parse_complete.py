from urllib.parse import parse_qs, urlparse

import httpx
from lxml import html


def test_ddg_lite_parsing():
    url = "https://lite.duckduckgo.com/lite/"
    data = {"q": "rental counterparts breach consequence"}
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": "https://lite.duckduckgo.com",
        "Referer": "https://lite.duckduckgo.com/",
    }

    r = httpx.post(url, data=data, headers=headers, timeout=5.0)
    tree = html.fromstring(r.content)

    links = tree.xpath('//a[@class="result-link"]')
    results = []

    for link in links:
        title = "".join(link.itertext()).strip()
        href = link.get("href")

        # Parse out snippet
        tr_parent = link.xpath('./ancestor::tr')
        snippet = ""
        if tr_parent:
            snippet_tds = tr_parent[0].xpath('./following-sibling::tr//td[@class="result-snippet"]')
            if snippet_tds:
                snippet = "".join(snippet_tds[0].itertext()).strip()

        # Clean URL redirects
        if href.startswith("//"):
            href = "https:" + href
        elif href.startswith("/"):
            href = "https://duckduckgo.com" + href

        if "uddg=" in href:
            parsed = urlparse(href)
            qs = parse_qs(parsed.query)
            if "uddg" in qs:
                href = qs["uddg"][0]

        results.append({
            "title": title,
            "url": href,
            "snippet": snippet
        })

    return results

if __name__ == "__main__":
    res = test_ddg_lite_parsing()
    print(f"Parsed {len(res)} results successfully:")
    for i, r in enumerate(res[:3]):
        print(f"[{i}] Title:", r["title"])
        print("    URL:", r["url"])
        print("    Snippet:", r["snippet"])
