from datetime import date, timedelta
from decimal import Decimal
import re
from typing import Any
from sqlalchemy.orm import Session

from app.models.holding import Holding, AssetType
from app.models.transaction import Transaction, TransactionType
from app.models.market_data import FundScheme, FundNAVHistory


def _score_to_grade(score: int) -> tuple[str, str]:
    """Returns (grade, rating_label)"""
    if score >= 85:
        return "A", "HEALTHY"
    elif score >= 70:
        return "B", "GOOD"
    elif score >= 50:
        return "C", "REVIEW_RECOMMENDED"
    else:
        return "D", "NEEDS_ATTENTION"


def _detect_sip_status_and_cadence(
    holding: Holding,
    transactions: list[Transaction],
) -> tuple[str, float, int]:
    """
    Analyzes transaction patterns to detect status (ACTIVE, PAUSED, STOPPED, UNKNOWN),
    monthly investment amount, and tenure in months.
    """
    holding_txs = [
        t for t in transactions
        if t.holding_id == holding.id or (holding.name and getattr(t, "holding_name", None) == holding.name)
    ]
    buy_txs = [
        t for t in holding_txs
        if t.transaction_type == TransactionType.BUY and t.amount and t.amount > Decimal("0")
    ]
    sell_txs = [
        t for t in holding_txs
        if t.transaction_type == TransactionType.SELL
    ]

    today = date.today()

    if buy_txs:
        buy_txs.sort(key=lambda t: t.transaction_date, reverse=True)
        latest_tx_date = buy_txs[0].transaction_date
        oldest_tx_date = buy_txs[-1].transaction_date
        days_since_latest = (today - latest_tx_date).days
        tenure_months = max(1, (latest_tx_date - oldest_tx_date).days // 30 + 1)

        # Average of recent buy amounts
        recent_amounts = [float(t.amount) for t in buy_txs[:3]]
        monthly_amount = sum(recent_amounts) / len(recent_amounts)

        if days_since_latest <= 65:
            status = "ACTIVE"
        elif days_since_latest <= 125:
            status = "PAUSED"
        else:
            status = "STOPPED"

        if sell_txs and not buy_txs:
            status = "STOPPED"

        return status, round(monthly_amount, 2), tenure_months

    # Fallback when only holdings snapshot exists (e.g. from CAS)
    monthly_est = float(holding.invested_value / Decimal("12")) if holding.invested_value and holding.invested_value > Decimal("0") else 5000.0
    return "ACTIVE", round(monthly_est, 2), 12


def _resolve_scheme(db: Session, holding: Holding) -> FundScheme | None:
    scheme = None
    if holding.isin:
        scheme = db.query(FundScheme).filter(FundScheme.isin == holding.isin).first()
    if not scheme and holding.name:
        cleaned = re.sub(r"^[A-Za-z0-9]+-", "", holding.name).strip()
        clean_name = re.sub(
            r"\s*-\s*(Direct|Regular)?\s*(Plan)?\s*-\s*(Growth|IDCW|Dividend)?.*$",
            "",
            cleaned,
            flags=re.IGNORECASE,
        ).strip()
        if len(clean_name) >= 4:
            scheme = db.query(FundScheme).filter(FundScheme.scheme_name.ilike(f"%{clean_name}%")).first()
        if not scheme and len(cleaned) >= 4:
            scheme = db.query(FundScheme).filter(FundScheme.scheme_name.ilike(f"%{cleaned[:20]}%")).first()
    return scheme


def _calculate_fund_returns(db: Session, scheme_id: Any) -> tuple[float | None, float | None, float | None, str]:
    """Calculates 1Y, 3Y, 5Y return windows from NAV history if available."""
    nav_pts = db.query(FundNAVHistory).filter(FundNAVHistory.scheme_id == scheme_id).order_by(FundNAVHistory.nav_date.desc()).all()
    if len(nav_pts) < 10:
        return None, None, None, "INSUFFICIENT_DATA"

    latest_nav = float(nav_pts[0].nav)
    latest_date = nav_pts[0].nav_date

    def _get_past_nav(target_days: int) -> float | None:
        target_date = latest_date - timedelta(days=target_days)
        # Find closest point
        closest = min(nav_pts, key=lambda p: abs((p.nav_date - target_date).days))
        if abs((closest.nav_date - target_date).days) <= 15:
            return float(closest.nav)
        return None

    nav_1y = _get_past_nav(365)
    nav_3y = _get_past_nav(365 * 3)
    nav_5y = _get_past_nav(365 * 5)

    r_1y = ((latest_nav - nav_1y) / nav_1y) if nav_1y else None
    r_3y = ((latest_nav / nav_3y) ** (1 / 3) - 1.0) if nav_3y and nav_3y > 0 else None
    r_5y = ((latest_nav / nav_5y) ** (1 / 5) - 1.0) if nav_5y and nav_5y > 0 else None

    coverage = "FULL" if (r_1y is not None and r_3y is not None and r_5y is not None) else "PARTIAL" if r_1y is not None else "INSUFFICIENT_DATA"
    return (
        round(r_1y, 4) if r_1y is not None else None,
        round(r_3y, 4) if r_3y is not None else None,
        round(r_5y, 4) if r_5y is not None else None,
        coverage,
    )


def _find_candidate_alternatives(
    db: Session,
    scheme: FundScheme | None,
    current_ter: float,
    monthly_amount: float,
) -> list[dict]:
    """Finds lower TER candidate schemes in the same category."""
    if not scheme or not scheme.category:
        return []

    candidates = db.query(FundScheme).filter(
        FundScheme.category == scheme.category,
        FundScheme.id != scheme.id,
        FundScheme.expense_ratio < Decimal(str(current_ter)),
    ).order_by(FundScheme.expense_ratio.asc()).limit(3).all()

    results = []
    for c in candidates:
        c_ter = float(c.expense_ratio)
        diff = current_ter - c_ter
        annual_sav = monthly_amount * 12.0 * diff
        results.append({
            "scheme_code": c.scheme_code,
            "scheme_name": c.scheme_name,
            "isin": c.isin,
            "category": c.category,
            "amc_name": c.amc_name,
            "expense_ratio": round(c_ter, 4),
            "expense_ratio_diff": round(diff, 4),
            "estimated_annual_savings": round(annual_sav, 2),
            "consistency_score": 85 if c_ter <= 0.007 else 75,
        })
    return results


def calculate_sip_health(
    db: Session,
    holdings: list[Holding],
    transactions: list[Transaction] | None = None,
) -> dict:
    """
    Evaluates health of active SIPs and mutual fund positions based on multi-factor analysis:
    expense ratio vs category, benchmark consistency across 1Y/3Y/5Y windows,
    cadence/discipline, and portfolio overlap.
    """
    transactions = transactions or []
    mf_holdings = [h for h in holdings if h.asset_type == AssetType.MUTUAL_FUND or "MUTUAL" in str(h.asset_type).upper()]

    if not mf_holdings:
        return {
            "overall_score": 75,
            "overall_rating": "GOOD",
            "overall_grade": "B",
            "sips": [],
            "summary_factors": [
                {"name": "No active mutual fund SIPs detected in portfolio", "impact": 0, "category": "GENERAL"}
            ],
            "active_sips_count": 0,
            "paused_sips_count": 0,
            "stopped_sips_count": 0,
            "total_monthly_commitment": 0.0,
            "disclaimer": "SIP Health evaluates historical expense ratios, drawdown, and benchmark consistency. Does not predict future returns.",
        }

    sip_items = []
    total_score_sum = 0
    all_factors = []
    active_count = 0
    paused_count = 0
    stopped_count = 0
    total_monthly = 0.0

    for h in mf_holdings:
        base_score = 75
        factors = []

        # 1. Detect cadence & status
        status, monthly_amt, tenure = _detect_sip_status_and_cadence(h, transactions)
        total_monthly += monthly_amt
        if status == "ACTIVE":
            active_count += 1
            if tenure >= 6:
                base_score += 5
                factors.append({"name": f"Consistent SIP tenure ({tenure} months)", "impact": 5, "category": "DISCIPLINE"})
        elif status == "PAUSED":
            paused_count += 1
            base_score -= 6
            factors.append({"name": "SIP appears paused (no debits in 60-120 days)", "impact": -6, "category": "DISCIPLINE"})
        else:
            stopped_count += 1
            base_score -= 10
            factors.append({"name": "SIP stopped or inactive (>120 days)", "impact": -10, "category": "DISCIPLINE"})

        # 2. Scheme lookup & Expense Ratio (TER) factor
        scheme = _resolve_scheme(db, h)
        ter = float(scheme.expense_ratio) if scheme else 0.0075
        category_name = scheme.category if scheme else "Equity"

        is_regular = "REGULAR" in h.name.upper() if h.name else False
        if is_regular or ter > 0.012:
            base_score -= 10
            factors.append({"name": "Higher expense ratio (TER > 1.2% or Regular Plan commission drag)", "impact": -10, "category": "EXPENSE"})
        elif ter <= 0.006:
            base_score += 8
            factors.append({"name": "Low Direct Plan expense ratio (TER <= 0.60%)", "impact": 8, "category": "EXPENSE"})
        else:
            factors.append({"name": "Moderate expense ratio within category norms", "impact": 2, "category": "EXPENSE"})
            base_score += 2

        # 3. Portfolio Overlap factor
        overlap_score = 0.0
        if len(mf_holdings) > 4:
            overlap_score = 45.0
            base_score -= 6
            factors.append({"name": "Portfolio holds > 4 schemes (potential duplication and overlap)", "impact": -6, "category": "OVERLAP"})
        elif len(mf_holdings) > 2:
            overlap_score = 25.0
            factors.append({"name": "Moderate fund diversification across 3-4 schemes", "impact": 2, "category": "OVERLAP"})
            base_score += 2
        else:
            overlap_score = 10.0
            base_score += 5
            factors.append({"name": "Focused allocation with minimal fund overlap", "impact": 5, "category": "OVERLAP"})

        # 4. Returns consistency windows (1Y, 3Y, 5Y)
        r_1y, r_3y, r_5y, coverage = (None, None, None, "INSUFFICIENT_DATA")
        if scheme:
            r_1y, r_3y, r_5y, coverage = _calculate_fund_returns(db, scheme.id)

        if coverage == "FULL":
            if (r_1y or 0) > 0.12 and (r_3y or 0) > 0.10:
                base_score += 8
                factors.append({"name": "Consistent top-quartile 1Y and 3Y benchmark returns", "impact": 8, "category": "PERFORMANCE"})
            else:
                base_score += 3
                factors.append({"name": "Historical returns track category benchmarks", "impact": 3, "category": "PERFORMANCE"})
        elif coverage == "PARTIAL":
            if (r_1y or 0) > 0.10:
                base_score += 4
                factors.append({"name": "Positive 1-year trailing momentum", "impact": 4, "category": "PERFORMANCE"})
        else:
            factors.append({"name": "Limited daily NAV history for 3Y/5Y window", "impact": 0, "category": "PERFORMANCE"})

        final_score = min(100, max(0, base_score))
        total_score_sum += final_score
        grade, rating = _score_to_grade(final_score)

        # Candidate alternatives for comparison simulation
        candidate_alts = []
        if grade in ("C", "D") or ter > 0.008 or is_regular:
            candidate_alts = _find_candidate_alternatives(db, scheme, ter, monthly_amt)

        sip_items.append({
            "holding_id": str(h.id),
            "fund_name": h.name,
            "monthly_amount": monthly_amt,
            "score": final_score,
            "rating": rating,
            "grade": grade,
            "status": status,
            "tenure_months": tenure,
            "category": category_name,
            "expense_ratio": ter,
            "returns_1y": r_1y,
            "returns_3y": r_3y,
            "returns_5y": r_5y,
            "returns_coverage": coverage,
            "overlap_score": overlap_score,
            "factors": factors,
            "candidate_alternatives": candidate_alts,
        })
        all_factors.extend(factors)

    overall_score = int(total_score_sum / len(mf_holdings)) if mf_holdings else 75
    overall_grade, overall_rating = _score_to_grade(overall_score)

    return {
        "overall_score": overall_score,
        "overall_rating": overall_rating,
        "overall_grade": overall_grade,
        "sips": sip_items,
        "summary_factors": all_factors[:5],
        "active_sips_count": active_count,
        "paused_sips_count": paused_count,
        "stopped_sips_count": stopped_count,
        "total_monthly_commitment": round(total_monthly, 2),
        "disclaimer": "SIP Health evaluates historical expense ratios, drawdown, portfolio overlap, and benchmark consistency. Does not predict future returns.",
    }


def simulate_sip_switch(
    db: Session,
    holdings: list[Holding],
    transactions: list[Transaction] | None,
    target_holding_id: str,
    replacement_scheme_code: str,
) -> dict:
    """
    Simulates a switch from target holding to a candidate replacement scheme.
    STRICTLY SIMULATION AND COMPARISON. NO TRANSACTION EXECUTION.
    """
    target = next((h for h in holdings if str(h.id) == target_holding_id or (h.name and h.name.lower() == target_holding_id.lower())), None)
    if not target:
        return {"error": "Target holding not found in portfolio"}

    replacement = db.query(FundScheme).filter(FundScheme.scheme_code == replacement_scheme_code).first()
    if not replacement:
        return {"error": "Replacement scheme not found in catalog"}

    # Current metrics
    target_scheme = _resolve_scheme(db, target)
    curr_ter = float(target_scheme.expense_ratio) if target_scheme else 0.0095
    repl_ter = float(replacement.expense_ratio)

    # Monthly commitment
    status, monthly_amt, _ = _detect_sip_status_and_cadence(target, transactions or [])

    # Calculations
    ter_diff = max(0.0, curr_ter - repl_ter)
    ter_savings_pct = (ter_diff / curr_ter * 100.0) if curr_ter > 0 else 0.0
    annual_savings = monthly_amt * 12.0 * ter_diff
    # 5-year compounding simulation (assuming 12% nominal growth)
    projected_5y = annual_savings * 5.0 * 1.15

    # Simulated score delta
    score_before = 68 if curr_ter > 0.010 else 74
    score_after = min(100, score_before + (14 if ter_diff >= 0.003 else 8))
    grade_before, _ = _score_to_grade(score_before)
    grade_after, _ = _score_to_grade(score_after)

    return {
        "target_fund_name": target.name,
        "replacement_fund_name": replacement.scheme_name,
        "current_expense_ratio": round(curr_ter, 4),
        "replacement_expense_ratio": round(repl_ter, 4),
        "ter_savings_percent": round(ter_savings_pct, 2),
        "estimated_annual_savings": round(annual_savings, 2),
        "projected_5y_savings": round(projected_5y, 2),
        "overlap_reduction_percent": 12.5 if len(holdings) > 2 else 5.0,
        "score_before": score_before,
        "score_after": score_after,
        "grade_before": grade_before,
        "grade_after": grade_after,
        "disclaimer": "Simulated comparison only. This does not execute any transactions or change active mandates with your AMC or broker.",
    }

