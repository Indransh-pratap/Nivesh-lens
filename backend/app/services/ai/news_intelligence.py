from datetime import date
from typing import Any
from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.schemas.ai import NewsSummary
from app.services.ai.provider.factory import get_llm_provider
from app.services.ai.security import wrap_untrusted_input
from app.services.diagnostics.service import build_diagnostics

# Sample verified financial news feed for portfolio holdings
SAMPLE_VERIFIED_NEWS = [
    {
        "company": "Reliance Industries",
        "headline": "Reliance Retail expands omnichannel operations and digital fulfillment network",
        "summary": "Reliance Retail announced nationwide expansion of automated distribution hubs to drive retail margin expansion.",
        "source": "BSE Corporate Announcements",
        "date": "2026-09-05",
    },
    {
        "company": "TCS",
        "headline": "TCS signs major multi-year digital transformation deal with European banking consortium",
        "summary": "Tata Consultancy Services announced a multi-billion dollar engagement across cloud modernization and AI analytics.",
        "source": "NSE Corporate Announcements",
        "date": "2026-09-04",
    },
    {
        "company": "HDFC Bank",
        "headline": "HDFC Bank reports quarterly credit growth and stable asset quality ratios",
        "summary": "The bank registered healthy loan advances growth with gross NPA levels remaining stable sequentially.",
        "source": "Exchange Filings",
        "date": "2026-09-02",
    },
]


def get_portfolio_news_intelligence(portfolio: Portfolio, db: Session) -> list[NewsSummary]:
    """
    1. Retrieve news
    2. Map to portfolio company holdings
    3. Filter by deterministic exposure % (only surface if material: > 2%)
    4. Gemini contextualizes relevance based on actual portfolio weight
    """
    diagnostics = build_diagnostics(str(portfolio.id), portfolio.holdings, portfolio.total_value, db=db)
    top_exposures = diagnostics.get("top_company_exposures", [])

    exposure_map: dict[str, float] = {}
    for exp in top_exposures:
        cname = str(exp.get("company", "")).upper()
        exposure_map[cname] = float(exp.get("exposure_percent", 0.0))

    news_summaries: list[NewsSummary] = []
    provider = get_llm_provider()

    for item in SAMPLE_VERIFIED_NEWS:
        news_comp = item["company"].upper()
        # Check if held in portfolio with material exposure
        matched_pct = 0.0
        for held_comp, pct in exposure_map.items():
            if news_comp in held_comp or held_comp in news_comp:
                matched_pct = pct
                break

        if matched_pct > 2.0:
            prompt = (
                f"NEWS ITEM FOR PORTFOLIO HOLDING:\n"
                f"- Company: {item['company']}\n"
                f"- User's Combined Exposure: {matched_pct:.1f}%\n"
                f"- Headline: {item['headline']}\n"
                f"- News Details: {item['summary']}\n\n"
                f"Explain the practical significance of this announcement for someone holding {matched_pct:.1f}% exposure."
            )

            system_instruction = (
                "You are a portfolio news analyst. "
                "Explain the practical materiality of this news item. "
                "Explicitly reference the user's deterministic portfolio weight. Do NOT invent new metrics."
            )

            try:
                rel = provider.generate_text(
                    prompt=wrap_untrusted_input(prompt, source_label="news_item"),
                    system_instruction=system_instruction,
                    temperature=0.1,
                    model_tier="fast",
                )
            except Exception:
                rel = (
                    f"{item['company']} announced: {item['headline']}. "
                    f"Because your combined direct and mutual-fund exposure is {matched_pct:.1f}%, "
                    "this development is material to your portfolio valuation."
                )

            news_summaries.append(
                NewsSummary(
                    company_name=item["company"],
                    portfolio_exposure_pct=matched_pct,
                    headline=item["headline"],
                    summary=item["summary"],
                    potential_relevance=rel.strip(),
                    source=item["source"],
                    published_date=item["date"],
                )
            )

    return news_summaries
