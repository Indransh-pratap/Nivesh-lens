"""NAV correlation analysis with configurable lookback.

Methodology:
- Use daily percentage returns (NOT raw NAV levels)
- Pearson correlation on the intersected return series
- Lookback: 3M, 6M, 1Y, 3Y
- If insufficient data exists for a fund, it is excluded and reported
- We NEVER fabricate correlation values for missing data
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Iterable

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.holding import AssetType, Holding
from app.models.market_data import FundScheme, FundNAVHistory


# ============================================================
# Lookback window configuration
# ============================================================

LOOKBACK_WINDOWS: dict[str, int] = {
    "3M": 90,
    "6M": 180,
    "1Y": 365,
    "3Y": 365 * 3,
}

# Similarity thresholds (configurable via settings)
HIGH_CORRELATION_THRESHOLD = getattr(settings, "HIGH_CORRELATION_THRESHOLD", 0.85)
MEDIUM_CORRELATION_THRESHOLD = getattr(settings, "MEDIUM_CORRELATION_THRESHOLD", 0.65)

# Minimum number of daily return observations required to include a fund
MIN_OBSERVATIONS = 20


# ============================================================
# Math helpers
# ============================================================

def _returns_from_nav(points: list[tuple[date, Decimal]]) -> list[tuple[date, float]]:
    """Compute daily returns from sorted NAV points."""
    if len(points) < 2:
        return []
    out: list[tuple[date, float]] = []
    for i in range(1, len(points)):
        prev_dt, prev_val = points[i - 1]
        curr_dt, curr_val = points[i]
        if prev_val is None or curr_val is None or Decimal(prev_val) <= 0:
            continue
        try:
            r = float((Decimal(curr_val) - Decimal(prev_val)) / Decimal(prev_val))
        except Exception:
            continue
        if not math.isfinite(r):
            continue
        out.append((curr_dt, r))
    return out


def _pearson(x: list[float], y: list[float]) -> float:
    """Pearson correlation. Returns 0.0 if undefined."""
    n = len(x)
    if n < 2 or n != len(y):
        return 0.0
    mx = sum(x) / n
    my = sum(y) / n
    cov = sum((x[i] - mx) * (y[i] - my) for i in range(n))
    varx = sum((x[i] - mx) ** 2 for i in range(n))
    vary = sum((y[i] - my) ** 2 for i in range(n))
    if varx <= 0 or vary <= 0:
        return 0.0
    r = cov / math.sqrt(varx * vary)
    if not math.isfinite(r):
        return 0.0
    return max(-1.0, min(1.0, r))


def _classify_similarity(corr: float) -> str:
    if corr >= HIGH_CORRELATION_THRESHOLD:
        return "Very Similar Behaviour"
    if corr >= MEDIUM_CORRELATION_THRESHOLD:
        return "Similar"
    return "Lower Similarity"


# ============================================================
# Per-holding NAV retrieval
# ============================================================

@dataclass
class FundSeries:
    fund_id: str
    fund_name: str
    isin: str | None
    scheme_id: str | None
    scheme_name: str | None
    observations: int
    sufficient: bool
    skip_reason: str | None
    returns_by_date: dict[date, float]


def _fetch_fund_series(
    db: Session,
    holding: Holding,
    lookback_days: int,
    as_of: date,
) -> FundSeries:
    scheme = None
    if holding.isin:
        scheme = (
            db.query(FundScheme)
            .filter(FundScheme.isin == holding.isin.strip().upper())
            .first()
        )
    if scheme is None and holding.name:
        scheme = (
            db.query(FundScheme)
            .filter(FundScheme.scheme_name.ilike(f"%{holding.name[:15]}%"))
            .first()
        )

    if scheme is None:
        return FundSeries(
            fund_id=str(holding.id),
            fund_name=holding.name,
            isin=holding.isin,
            scheme_id=None,
            scheme_name=None,
            observations=0,
            sufficient=False,
            skip_reason="No matching scheme in fund universe",
            returns_by_date={},
        )

    cutoff = as_of - timedelta(days=lookback_days)
    history = (
        db.query(FundNAVHistory)
        .filter(
            FundNAVHistory.scheme_id == scheme.id,
            FundNAVHistory.nav_date >= cutoff,
            FundNAVHistory.nav_date <= as_of,
        )
        .order_by(FundNAVHistory.nav_date.asc())
        .all()
    )

    # Deduplicate by date (keep last)
    by_date: dict[date, Decimal] = {}
    for p in history:
        by_date[p.nav_date] = p.nav
    sorted_points = sorted(by_date.items())

    rets = _returns_from_nav(sorted_points)
    sufficient = len(rets) >= MIN_OBSERVATIONS
    skip_reason = None if sufficient else (
        f"Only {len(rets)} daily returns available; "
        f"need at least {MIN_OBSERVATIONS} for the selected lookback."
    )

    return FundSeries(
        fund_id=str(holding.id),
        fund_name=holding.name,
        isin=holding.isin,
        scheme_id=str(scheme.id),
        scheme_name=scheme.scheme_name,
        observations=len(rets),
        sufficient=sufficient,
        skip_reason=skip_reason,
        returns_by_date={dt: r for dt, r in rets},
    )


# ============================================================
# Main entry point
# ============================================================

def calculate_nav_correlation_matrix(
    db: Session,
    holdings: Iterable[Holding],
    lookback: str = "1Y",
    as_of: date | None = None,
) -> dict:
    """Computes a Pearson correlation matrix of mutual-fund daily returns.

    Args:
        db: DB session
        holdings: list of Holding objects
        lookback: one of "3M" / "6M" / "1Y" / "3Y"
        as_of: reference date (defaults to today)

    Returns:
        dict with funds, matrix, pairs, thresholds, lookback, insufficient_funds
    """
    lookback_days = LOOKBACK_WINDOWS.get(lookback)
    if lookback_days is None:
        lookback_days = LOOKBACK_WINDOWS["1Y"]
        lookback = "1Y"

    if as_of is None:
        as_of = date.today()

    mf_holdings = [h for h in holdings if h.asset_type == AssetType.MUTUAL_FUND]

    series_list: list[FundSeries] = []
    for h in mf_holdings:
        series_list.append(_fetch_fund_series(db, h, lookback_days, as_of))

    sufficient_series = [s for s in series_list if s.sufficient]
    insufficient = [
        {
            "fund_id": s.fund_id,
            "fund_name": s.fund_name,
            "observations": s.observations,
            "reason": s.skip_reason,
        }
        for s in series_list
        if not s.sufficient
    ]

    fund_names = [s.fund_name for s in sufficient_series]
    n = len(sufficient_series)

    if n < 2:
        return {
            "lookback": lookback,
            "as_of": as_of.isoformat(),
            "funds": fund_names,
            "matrix": [],
            "pairs": [],
            "thresholds": {
                "high": HIGH_CORRELATION_THRESHOLD,
                "medium": MEDIUM_CORRELATION_THRESHOLD,
            },
            "insufficient_funds": insufficient,
            "disclaimer": (
                "Insufficient historical data. "
                "Correlation matrix requires at least 2 funds with "
                f"{MIN_OBSERVATIONS}+ daily returns over the selected lookback."
            ),
        }

    # Intersect dates across all sufficient series
    common_dates = set.intersection(*(set(s.returns_by_date.keys()) for s in sufficient_series))
    sorted_dates = sorted(common_dates)

    if len(sorted_dates) < MIN_OBSERVATIONS:
        return {
            "lookback": lookback,
            "as_of": as_of.isoformat(),
            "funds": fund_names,
            "matrix": [],
            "pairs": [],
            "thresholds": {
                "high": HIGH_CORRELATION_THRESHOLD,
                "medium": MEDIUM_CORRELATION_THRESHOLD,
            },
            "insufficient_funds": insufficient,
            "disclaimer": (
                f"Only {len(sorted_dates)} common daily returns available across the "
                f"{n} funds; need at least {MIN_OBSERVATIONS} for a reliable correlation."
            ),
        }

    matrix: list[list[float]] = [[0.0] * n for _ in range(n)]
    pairs: list[dict] = []

    for i in range(n):
        matrix[i][i] = 1.0
        si = [sufficient_series[i].returns_by_date[d] for d in sorted_dates]
        for j in range(i + 1, n):
            sj = [sufficient_series[j].returns_by_date[d] for d in sorted_dates]
            corr = _pearson(si, sj)
            corr = round(corr, 4)
            matrix[i][j] = corr
            matrix[j][i] = corr
            pairs.append({
                "fund_a": fund_names[i],
                "fund_b": fund_names[j],
                "correlation": corr,
                "classification": _classify_similarity(corr),
            })

    # Sort pairs by correlation desc for UI clarity
    pairs.sort(key=lambda p: p["correlation"], reverse=True)

    return {
        "lookback": lookback,
        "as_of": as_of.isoformat(),
        "methodology": (
            "Pearson correlation of daily NAV percentage returns over the selected lookback. "
            "Returns are computed on intersected dates only. "
            "Correlation is historical and can change over time."
        ),
        "funds": fund_names,
        "matrix": matrix,
        "pairs": pairs,
        "thresholds": {
            "high": HIGH_CORRELATION_THRESHOLD,
            "medium": MEDIUM_CORRELATION_THRESHOLD,
        },
        "insufficient_funds": insufficient,
        "disclaimer": (
            "Correlation is historical and does not guarantee identical future performance. "
            "Funds with similar price movement can have different underlying holdings. "
            "These metrics are educational, not investment advice."
        ),
    }
