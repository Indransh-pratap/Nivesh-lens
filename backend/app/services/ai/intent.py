from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class QueryIntent:
    name: str
    needs_web: bool = False
    clarification: str | None = None


def classify_query(question: str) -> QueryIntent:
    q = question.lower().strip()
    if any(x in q for x in ("which mutual fund", "what mutual fund", "fund should", "fund to invest", "invest in mutual", "best mutual")):
        return QueryIntent("MUTUAL_FUND_RECOMMENDATION", True)
    if any(x in q for x in ("wrong with my current mutual", "analyze my mutual", "mutual fund analysis", "mutual funds analysis")):
        return QueryIntent("MUTUAL_FUND_ANALYSIS", True)
    if any(x in q for x in ("duplicate", "overlap", "redundant", "same fund")):
        return QueryIntent("DUPLICATION")
    if any(x in q for x in ("stress", "nifty falls", "nifty drop", "crash", "drawdown")):
        return QueryIntent("STRESS_TEST")
    if any(x in q for x in ("indirect exposure", "true exposure", "look through", "look-through")):
        return QueryIntent("TRUE_EXPOSURE")
    if any(x in q for x in ("correlation", "move together", "co-movement")):
        return QueryIntent("CORRELATION")
    if any(x in q for x in ("nominee", "sebi compliance", "compliance")):
        return QueryIntent("SEBI_COMPLIANCE", True)
    if any(x in q for x in ("tax", "capital gains", "ltcg", "stcg")):
        return QueryIntent("TAX_GENERAL", True)
    if any(x in q for x in ("why is", "why does", "risky", "risk", "health", "diversif", "hhi")):
        return QueryIntent("PORTFOLIO_HEALTH")
    if any(x in q for x in ("what should i change", "how can i fix", "improve my portfolio", "rebalance")):
        return QueryIntent("ASSET_ALLOCATION")
    if any(x in q for x in ("total value", "portfolio value", "how much do i have", "portfolio overview", "explain my portfolio")):
        return QueryIntent("PORTFOLIO_OVERVIEW")
    if any(x in q for x in ("stock", "share", "company", "reliance", "hdfc", "tata", "infosys")):
        return QueryIntent("STOCK_ANALYSIS", True)
    return QueryIntent("GENERAL_FINANCE", True)
