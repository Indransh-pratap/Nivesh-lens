from datetime import date, timedelta
from decimal import Decimal
import re
from typing import Any
from sqlalchemy.orm import Session

from app.models.holding import Holding, AssetType
from app.models.transaction import Transaction, TransactionType
from app.models.market_data import FundScheme, FundNAVHistory, SchemeHolding
from app.services.market_data.seed_data import seed_market_baseline


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
    If no ledger transactions exist, dynamically estimates monthly investment amount
    and tenure proportional to the holding valuation and standard Indian SIP denominations.
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

    # Dynamic estimation when only holdings snapshot exists (e.g. from CAS import)
    val = float(holding.invested_value) if holding.invested_value and holding.invested_value > Decimal("0") else float(holding.current_value or 0)
    if val <= 0:
        return "ACTIVE", 2500.0, 12

    # Standard Indian SIP bracket denominations (₹500 to ₹25,000)
    sip_brackets = [500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 7500, 8000, 10000, 12500, 15000, 20000, 25000]
    rough_monthly = val / 14.0
    monthly_est = min(sip_brackets, key=lambda b: abs(b - rough_monthly))
    tenure_est = max(6, min(48, int(round(val / monthly_est))))

    return "ACTIVE", float(monthly_est), tenure_est


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
        clean_name = re.sub(r"^\s*<br\s*/?>\s*", "", clean_name, flags=re.IGNORECASE).strip()
        clean_name = re.sub(r"^[A-Z0-9]{2,6}\s+", "", clean_name).strip()

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
        closest = min(nav_pts, key=lambda p: abs((p.nav_date - target_date).days))
        if abs((closest.nav_date - target_date).days) <= 25:
            return float(closest.nav)
        return None

    nav_1y = _get_past_nav(365)
    nav_3y = _get_past_nav(365 * 3)
    nav_5y = _get_past_nav(365 * 5)

    r_1y = ((latest_nav - nav_1y) / nav_1y) if nav_1y and nav_1y > 0 else None
    r_3y = ((latest_nav / nav_3y) ** (1 / 3) - 1.0) if nav_3y and nav_3y > 0 else None
    r_5y = ((latest_nav / nav_5y) ** (1 / 5) - 1.0) if nav_5y and nav_5y > 0 else None

    coverage = "FULL" if (r_1y is not None and r_3y is not None) else "PARTIAL" if (r_1y is not None or r_3y is not None) else "INSUFFICIENT_DATA"
    return (
        round(r_1y, 4) if r_1y is not None else None,
        round(r_3y, 4) if r_3y is not None else None,
        round(r_5y, 4) if r_5y is not None else None,
        coverage,
    )


def _calculate_fund_overlap(
    db: Session,
    target_scheme: FundScheme | None,
    other_schemes: list[FundScheme],
) -> tuple[float, list[str]]:
    """
    Computes true stock-level look-through portfolio overlap percentage between
    target_scheme and all other mutual funds held in the portfolio.
    Returns (overlap_percentage, top_overlapping_stocks).
    """
    if not target_scheme or not other_schemes:
        return 0.0, []

    target_holdings = db.query(SchemeHolding).filter(SchemeHolding.scheme_id == target_scheme.id).all()
    if not target_holdings:
        return 0.0, []

    target_weights: dict[str, float] = {}
    for th in target_holdings:
        key = (th.company_isin or th.company_name).strip().upper()
        target_weights[key] = float(th.weight_percentage)

    other_ids = [s.id for s in other_schemes if s.id != target_scheme.id]
    if not other_ids:
        return 0.0, []

    other_holdings = db.query(SchemeHolding).filter(SchemeHolding.scheme_id.in_(other_ids)).all()
    if not other_holdings:
        return 0.0, []

    other_by_key: dict[str, list[float]] = {}
    name_by_key: dict[str, str] = {}
    for oh in other_holdings:
        key = (oh.company_isin or oh.company_name).strip().upper()
        other_by_key.setdefault(key, []).append(float(oh.weight_percentage))
        name_by_key[key] = oh.company_name

    overlap_weight_sum = 0.0
    overlapping_items: list[tuple[str, float]] = []

    for key, t_w in target_weights.items():
        if key in other_by_key:
            peer_weights = other_by_key[key]
            max_peer_w = max(peer_weights)
            intersection = min(t_w, max_peer_w)
            overlap_weight_sum += intersection
            overlapping_items.append((name_by_key.get(key, key), intersection))

    overlapping_items.sort(key=lambda x: x[1], reverse=True)
    top_stocks = [x[0] for x in overlapping_items[:3]]
    return round(min(100.0, overlap_weight_sum), 1), top_stocks


def _find_candidate_alternatives(
    db: Session,
    scheme: FundScheme | None,
    current_ter: float,
    monthly_amount: float,
) -> list[dict]:
    """Finds candidate replacement schemes in the same or complementary category."""
    if not scheme:
        return []

    def _is_self(c: FundScheme) -> bool:
        if c.id == scheme.id:
            return True
        if scheme.isin and c.isin and c.isin.strip().upper() == scheme.isin.strip().upper():
            return True
        s_clean = re.sub(r"-\s*(Direct|Regular)?\s*(Plan)?\s*-\s*Growth.*$", "", scheme.scheme_name or "", flags=re.IGNORECASE).strip().lower()
        c_clean = re.sub(r"-\s*(Direct|Regular)?\s*(Plan)?\s*-\s*Growth.*$", "", c.scheme_name or "", flags=re.IGNORECASE).strip().lower()
        if s_clean and c_clean and s_clean == c_clean:
            return True
        return False

    candidates: list[FundScheme] = []

    # 1. Search for lower TER alternatives in the same category
    if scheme.category:
        lower_ter = db.query(FundScheme).filter(
            FundScheme.category == scheme.category,
            FundScheme.id != scheme.id,
            FundScheme.expense_ratio < Decimal(str(current_ter)),
        ).order_by(FundScheme.expense_ratio.asc()).all()
        candidates.extend([c for c in lower_ter if not _is_self(c)])

    # 2. If no lower TER scheme in same category, find top peer alternatives in same category
    if len(candidates) < 3 and scheme.category:
        same_cat_peers = db.query(FundScheme).filter(
            FundScheme.category == scheme.category,
            FundScheme.id != scheme.id,
        ).order_by(FundScheme.expense_ratio.asc()).all()
        for c in same_cat_peers:
            if not _is_self(c) and c.id not in [cand.id for cand in candidates]:
                candidates.append(c)

    # 3. If still needed, provide low-cost index and core equity peers
    if len(candidates) < 3:
        fallback_peers = db.query(FundScheme).filter(
            FundScheme.id != scheme.id,
            FundScheme.scheme_code.in_(["120716", "100033", "120586", "120166", "118834", "120503", "118989", "120505"]),
        ).order_by(FundScheme.expense_ratio.asc()).all()
        for c in fallback_peers:
            if not _is_self(c) and c.id not in [cand.id for cand in candidates]:
                candidates.append(c)

    results = []
    for c in candidates[:3]:
        c_ter = float(c.expense_ratio) if c.expense_ratio is not None else 0.0075
        diff = round(current_ter - c_ter, 4)
        annual_sav = round(monthly_amount * 12.0 * max(0.0, diff), 2)
        # Higher consistency score for lower TER direct funds
        consistency = 90 if c_ter <= 0.003 else 85 if c_ter <= 0.007 else 75
        results.append({
            "scheme_code": c.scheme_code,
            "scheme_name": c.scheme_name,
            "isin": c.isin,
            "category": c.category or "Equity",
            "amc_name": c.amc_name or "Direct Mutual Fund",
            "expense_ratio": round(c_ter, 4),
            "expense_ratio_diff": diff,
            "estimated_annual_savings": annual_sav,
            "consistency_score": consistency,
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
    cadence/discipline, and portfolio look-through stock overlap.
    """
    seed_market_baseline(db)
    transactions = transactions or []
    mf_holdings = [
        h for h in holdings
        if (h.asset_type == AssetType.MUTUAL_FUND or "MUTUAL" in str(h.asset_type).upper())
        and "STATEMENT" not in (h.name or "").upper()
    ]

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

    # Pre-resolve all schemes for overlap analysis
    resolved_schemes_map: dict[str, FundScheme | None] = {}
    for h in mf_holdings:
        resolved_schemes_map[str(h.id)] = _resolve_scheme(db, h)

    all_resolved_schemes = [s for s in resolved_schemes_map.values() if s is not None]

    sip_items = []
    total_score_sum = 0
    all_factors = []
    active_count = 0
    paused_count = 0
    stopped_count = 0
    total_monthly = 0.0

    for h in mf_holdings:
        base_score = 70
        factors = []

        # 1. Detect cadence & status
        status, monthly_amt, tenure = _detect_sip_status_and_cadence(h, transactions)
        total_monthly += monthly_amt
        if status == "ACTIVE":
            active_count += 1
            if tenure >= 12:
                base_score += 6
                factors.append({"name": f"Disciplined SIP tenure ({tenure} months)", "impact": 6, "category": "DISCIPLINE"})
            elif tenure >= 6:
                base_score += 4
                factors.append({"name": f"Consistent SIP tenure ({tenure} months)", "impact": 4, "category": "DISCIPLINE"})
            else:
                base_score += 2
                factors.append({"name": f"Recently started SIP ({tenure} months)", "impact": 2, "category": "DISCIPLINE"})
        elif status == "PAUSED":
            paused_count += 1
            base_score -= 8
            factors.append({"name": "SIP appears paused (no debits in 60-120 days)", "impact": -8, "category": "DISCIPLINE"})
        else:
            stopped_count += 1
            base_score -= 15
            factors.append({"name": "SIP stopped or inactive (>120 days)", "impact": -15, "category": "DISCIPLINE"})

        # 2. Scheme lookup & Expense Ratio (TER) factor
        scheme = resolved_schemes_map.get(str(h.id))
        ter = float(scheme.expense_ratio) if scheme and scheme.expense_ratio is not None else 0.0075
        category_name = scheme.category if scheme else "Equity"

        is_regular = "REGULAR" in (h.name or "").upper()
        if is_regular or ter > 0.012:
            base_score -= 12
            factors.append({"name": f"Higher expense ratio ({ter*100:.2f}% TER or Regular Plan commission bleed)", "impact": -12, "category": "EXPENSE"})
        elif ter <= 0.0025:
            base_score += 10
            factors.append({"name": f"Ultra-low Direct Plan expense ratio ({ter*100:.2f}% TER)", "impact": 10, "category": "EXPENSE"})
        elif ter <= 0.0050:
            base_score += 7
            factors.append({"name": f"Low Direct Plan expense ratio ({ter*100:.2f}% TER)", "impact": 7, "category": "EXPENSE"})
        elif ter <= 0.0070:
            base_score += 4
            factors.append({"name": f"Competitive Direct Plan expense ratio ({ter*100:.2f}% TER)", "impact": 4, "category": "EXPENSE"})
        elif ter <= 0.0100:
            base_score += 1
            factors.append({"name": f"Moderate expense ratio within category norms ({ter*100:.2f}% TER)", "impact": 1, "category": "EXPENSE"})
        else:
            base_score -= 4
            factors.append({"name": f"Above-average expense ratio ({ter*100:.2f}% TER)", "impact": -4, "category": "EXPENSE"})

        # 3. Look-Through Portfolio Overlap factor
        other_schemes = [s for s in all_resolved_schemes if not scheme or s.id != scheme.id]
        overlap_pct, top_overlap_stocks = _calculate_fund_overlap(db, scheme, other_schemes)

        if overlap_pct <= 10.0:
            base_score += 7
            factors.append({"name": f"Distinct portfolio allocation ({overlap_pct}% overlap with peers)", "impact": 7, "category": "OVERLAP"})
        elif overlap_pct <= 25.0:
            base_score += 4
            factors.append({"name": f"Low portfolio overlap ({overlap_pct}%)", "impact": 4, "category": "OVERLAP"})
        elif overlap_pct <= 40.0:
            overlap_desc = f" ({', '.join(top_overlap_stocks[:2])})" if top_overlap_stocks else ""
            base_score -= 2
            factors.append({"name": f"Moderate portfolio overlap ({overlap_pct}% in shared core holdings{overlap_desc})", "impact": -2, "category": "OVERLAP"})
        else:
            overlap_desc = f" ({', '.join(top_overlap_stocks[:2])})" if top_overlap_stocks else ""
            base_score -= 8
            factors.append({"name": f"High duplication risk ({overlap_pct}% overlap with peer funds{overlap_desc})", "impact": -8, "category": "OVERLAP"})

        # 4. Trailing Returns (1Y & 3Y CAGR)
        r_1y, r_3y, r_5y, coverage = (None, None, None, "INSUFFICIENT_DATA")
        if scheme:
            r_1y, r_3y, r_5y, coverage = _calculate_fund_returns(db, scheme.id)

        if r_3y is not None:
            if r_3y >= 0.18:
                base_score += 9
                factors.append({"name": f"Outstanding 3-year CAGR ({r_3y*100:.1f}%)", "impact": 9, "category": "PERFORMANCE"})
            elif r_3y >= 0.14:
                base_score += 6
                factors.append({"name": f"Strong 3-year CAGR ({r_3y*100:.1f}%)", "impact": 6, "category": "PERFORMANCE"})
            elif r_3y >= 0.10:
                base_score += 3
                factors.append({"name": f"Consistent 3-year CAGR ({r_3y*100:.1f}%) tracking market", "impact": 3, "category": "PERFORMANCE"})
            else:
                base_score -= 4
                factors.append({"name": f"Below-average 3-year CAGR ({r_3y*100:.1f}%)", "impact": -4, "category": "PERFORMANCE"})

            if r_1y is not None and r_1y >= 0.15:
                base_score += 2
                factors.append({"name": f"High 1-year trailing momentum (+{r_1y*100:.1f}%)", "impact": 2, "category": "PERFORMANCE"})
        elif r_1y is not None:
            if r_1y >= 0.15:
                base_score += 5
                factors.append({"name": f"High 1-year trailing momentum (+{r_1y*100:.1f}%)", "impact": 5, "category": "PERFORMANCE"})
            elif r_1y >= 0.10:
                base_score += 3
                factors.append({"name": f"Positive 1-year trailing return (+{r_1y*100:.1f}%)", "impact": 3, "category": "PERFORMANCE"})
            else:
                base_score -= 2
                factors.append({"name": f"Modest 1-year return (+{r_1y*100:.1f}%)", "impact": -2, "category": "PERFORMANCE"})
        else:
            factors.append({"name": "Historical NAV tracking limited", "impact": 0, "category": "PERFORMANCE"})

        final_score = min(100, max(0, base_score))
        total_score_sum += final_score
        grade, rating = _score_to_grade(final_score)

        # Candidate alternatives for comparison simulation
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
            "overlap_score": overlap_pct,
            "factors": factors,
            "candidate_alternatives": candidate_alts,
        })
        all_factors.extend(factors)

    overall_score = int(round(total_score_sum / len(mf_holdings))) if mf_holdings else 75
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
    curr_ter = float(target_scheme.expense_ratio) if target_scheme and target_scheme.expense_ratio is not None else 0.0095
    repl_ter = float(replacement.expense_ratio) if replacement.expense_ratio is not None else 0.0050

    # Monthly commitment
    status, monthly_amt, _ = _detect_sip_status_and_cadence(target, transactions or [])

    # Fee savings calculations
    ter_diff = max(0.0, curr_ter - repl_ter)
    ter_savings_pct = (ter_diff / curr_ter * 100.0) if curr_ter > 0 else 0.0
    annual_savings = monthly_amt * 12.0 * ter_diff

    # 5-year compounding simulation using ordinary annuity formula FV = P * (((1 + r)^n - 1) / r)
    # at 12% p.a. equity rate (~6.35x annual savings)
    r = 0.12
    projected_5y = annual_savings * (((1.0 + r) ** 5 - 1.0) / r) if annual_savings > 0 else 0.0

    # Dynamic score delta
    score_before = 72
    if curr_ter <= 0.003:
        score_before = 88
    elif curr_ter <= 0.006:
        score_before = 82
    elif curr_ter > 0.012:
        score_before = 62

    score_boost = 12 if ter_diff >= 0.005 else 8 if ter_diff >= 0.002 else 3 if ter_diff > 0 else 0
    score_after = min(100, score_before + score_boost)
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

