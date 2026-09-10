"""Small, source-preserving web research layer for portfolio chat.

This intentionally uses Google News' public RSS endpoint rather than inventing
facts or returning synthetic fallback data.  Portfolio numbers still come only
from deterministic tools; web results are supplementary context and are shown
to the model with their URLs so it can cite them.
"""

from __future__ import annotations

import html
import logging
import re
from dataclasses import dataclass
from urllib.parse import quote_plus
import xml.etree.ElementTree as ET

import httpx

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class WebResult:
    title: str
    url: str
    published: str | None
    snippet: str


_CURRENT_TERMS = (
    "news", "latest", "today", "recent", "current", "why", "falling",
    "rising", "outlook", "event", "results", "earnings", "regulatory",
    "sebi", "market", "impact", "should i buy", "should i sell",
    "analy", "tell me about", "what does", "outlook",
)


def _clean_query(value: str) -> str:
    # Keep searches short and prevent XML/URL control characters from leaking
    # into the upstream request.
    return re.sub(r"[^\w\s.&'-]", " ", value, flags=re.UNICODE).strip()[:180]


def should_search(question: str) -> bool:
    lowered = question.lower()
    return any(term in lowered for term in _CURRENT_TERMS)


def search_news(query: str, limit: int = 5) -> list[WebResult]:
    query = _clean_query(query)
    if not query:
        return []
    url = (
        "https://news.google.com/rss/search?q="
        f"{quote_plus(query)}&hl=en-IN&gl=IN&ceid=IN:en"
    )
    try:
        response = httpx.get(url, timeout=httpx.Timeout(6.0, connect=3.0), headers={"User-Agent": "NiveshLens/1.0"})
        response.raise_for_status()
        root = ET.fromstring(response.content)
    except (httpx.HTTPError, ET.ParseError, ValueError) as exc:
        logger.warning("Web research failed for query=%r: %s", query, exc)
        return []

    results: list[WebResult] = []
    for item in root.findall("./channel/item")[:limit]:
        title = html.unescape((item.findtext("title") or "").strip())
        link = (item.findtext("link") or "").strip()
        description = html.unescape(re.sub("<[^>]+>", " ", item.findtext("description") or ""))
        published = (item.findtext("pubDate") or "").strip() or None
        if title and link:
            results.append(WebResult(title=title, url=link, published=published, snippet=description[:500]))
    return results


def research_question(question: str, holding_names: list[str]) -> list[WebResult]:
    if not should_search(question):
        return []
    # Search the user's wording plus the relevant held names. Do not send the
    # full portfolio or personal data to the external service.
    terms = [name for name in holding_names if name and len(name) > 2][:4]
    suffix = " ".join(terms)
    query = f"{question} {suffix}".strip()
    return search_news(query)
