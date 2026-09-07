"""What-If Fund Swap engine.

Architecture:
    REAL PORTFOLIO
       ↓
    snapshot (deep copy of holdings)
       ↓
    apply swap (replace target holding with replacement scheme)
       ↓
    run Phase 1 build_diagnostics(snapshot) — NEVER mutates the real portfolio
       ↓
    compare baseline vs simulated metrics
"""

from __future__ import annotations

import copy
import uuid
from decimal import Decimal
from typing import Iterable

from sqlalchemy.orm import Session

from app.models.holding import AssetType, Holding
from app.models.market_data import FundScheme


# Reuse Phase 1 service directly (no duplicate formula)
from app.services.diagnostics.service import build_diagnostics


# ============================================================
# Snapshot helpers
# ============================================================

def _snapshot_holdings(holdings: Iterable[Holding]) -> list[Holding]:
    """Deep-copy holdings. The returned objects are detached from the session
    and have no real DB identity — they cannot accidentally mutate the real
    portfolio."""
    snapshot: list[Holding] = []
    for h in holdings:
        new = Holding(
            id=h.id,
            portfolio_id=h.portfolio_id,
            asset_type=h.asset_type,
            name=h.name,
            isin=h.isin,
            quantity=h.quantity,
            average_price=h.average_price,
            current_price=h.current_price,
            invested_value=h.invested_value,
            current_value=h.current_value,
        )
        snapshot.append(new)
    return snapshot


def _find_target(snapshot: list[Holding], target_id: str) -> Holding | None:
    """Find a holding in the snapshot by id OR by case-insensitive name."""
    if not target_id:
        return None
    needle = target_id.strip()
    for h in snapshot:
        if str(h.id) == needle:
            return h
    needle_lc = needle.lower()
    for h in snapshot:
        if h.name and h.name.lower() == needle_lc:
            return h
    return None


def _apply_swap(
    snapshot: list[Holding],
    target: Holding,
    replacement: FundScheme,
    replacement_value: Decimal,
) -> None:
    """Mutates the SNAPSHOT only — original portfolio is untouched.

    Strategy: replace the target holding in-place with the replacement scheme's
    metadata. Same value, new identity. This keeps total portfolio value
    unchanged so metrics differences are attributable to composition.
    """
    target.name = replacement.scheme_name
    target.isin = replacement.isin
    target.current_value = replacement_value
    target.invested_value = replacement_value
    target.asset_type = AssetType.MUTUAL_FUND


# ============================================================
# Replacement fund search
# ============================================================

def list_replacement_candidates(
    db: Session,
    target_holding: Holding,
) -> list[dict]:
    """Returns replacement fund options for the user UI.

    Includes all seeded schemes that are not the target.
    """
    target_isin = (target_holding.isin or "").strip().upper()
    target_name = (target_holding.name or "").lower()

    schemes = db.query(FundScheme).all()
    candidates: list[dict] = []
    for s in schemes:
        is_self = (
            (s.isin and s.isin.strip().upper() == target_isin)
            or (target_name and s.scheme_name and s.scheme_name.lower() == target_name)
        )
        if is_self:
            continue
        candidates.append({
            "scheme_code": s.scheme_code,
            "scheme_name": s.scheme_name,
            "isin": s.isin,
            "category": s.category,
            "amc_name": s.amc_name,
            "expense_ratio": float(s.expense_ratio) if s.expense_ratio is not None else 0.0,
        })
    return candidates


# ============================================================
# Main entry point
# ============================================================

def simulate_fund_swap(
    db: Session,
    holdings: Iterable[Holding],
    target_holding_id: str,
    replacement_scheme_code: str,
) -> dict:
    """Simulates a fund swap by running Phase 1's build_diagnostics on both
    baseline and simulated portfolios.

    IMPORTANT: The real portfolio is never mutated. We work on detached
    snapshots.
    """
    real_holdings = list(holdings)

    # ----- baseline (canonical Phase 1) -----
    total_value = sum(
        (Decimal(str(h.current_value)) for h in real_holdings),
        Decimal("0"),
    )

    baseline_diag = build_diagnostics(
        portfolio_id="baseline",
        holdings=real_holdings,
        total_value=total_value,
        db=db,
    )

    # ----- simulation snapshot (detached) -----
    snapshot = _snapshot_holdings(real_holdings)
    target = _find_target(snapshot, target_holding_id)
    if target is None:
        return {
            "target_holding": target_holding_id,
            "replacement_scheme": replacement_scheme_code,
            "error": "Target holding not found in portfolio.",
            "disclaimer": "Simulation only. No changes applied to the real portfolio.",
        }

    replacement = (
        db.query(FundScheme)
        .filter(FundScheme.scheme_code == replacement_scheme_code)
        .first()
    )
    if replacement is None:
        return {
            "target_holding": target.name,
            "replacement_scheme": replacement_scheme_code,
            "error": "Replacement scheme not found in the fund universe.",
            "disclaimer": "Simulation only. No changes applied to the real portfolio.",
        }

    target_value = Decimal(str(target.current_value))
    _apply_swap(snapshot, target, replacement, target_value)

    # ----- simulated (canonical Phase 1) -----
    simulated_diag = build_diagnostics(
        portfolio_id="simulated",
        holdings=snapshot,
        total_value=total_value,
        db=db,
    )

    # ----- comparison -----
    baseline_score = (baseline_diag.get("diversification_score") or {}).get("score") or 0
    simulated_score = (simulated_diag.get("diversification_score") or {}).get("score") or 0

    baseline_hhi = (baseline_diag.get("concentration") or {}).get("hhi") or 0.0
    simulated_hhi = (simulated_diag.get("concentration") or {}).get("hhi") or 0.0

    baseline_ter = float(
        (baseline_diag.get("fee_analysis") or {}).get("total_actual_ter_cost") or 0
    )
    simulated_ter = float(
        (simulated_diag.get("fee_analysis") or {}).get("total_actual_ter_cost") or 0
    )

    # Top company exposure (% of portfolio)
    def _top_company_pct(diag: dict) -> float:
        items = diag.get("top_company_exposures") or []
        if not items:
            return 0.0
        return float(items[0].get("exposure_percent") or 0)

    baseline_top = _top_company_pct(baseline_diag)
    simulated_top = _top_company_pct(simulated_diag)

    # Overlap-related duplicate cost
    baseline_dup = float(
        (baseline_diag.get("fee_analysis") or {}).get("estimated_potential_duplicate_cost") or 0
    )
    simulated_dup = float(
        (simulated_diag.get("fee_analysis") or {}).get("estimated_potential_duplicate_cost") or 0
    )

    return {
        "target_holding": target_holding_id,
        "replacement_scheme": replacement.scheme_name,
        "replacement_category": replacement.category,
        "replacement_ter": float(replacement.expense_ratio) if replacement.expense_ratio is not None else 0.0,
        "before": {
            "score": baseline_score,
            "hhi": round(baseline_hhi, 4),
            "average_ter_cost": round(baseline_ter, 2),
            "top_company_exposure": round(baseline_top, 2),
            "potential_duplicate_cost": round(baseline_dup, 2),
        },
        "after": {
            "score": simulated_score,
            "hhi": round(simulated_hhi, 4),
            "average_ter_cost": round(simulated_ter, 2),
            "top_company_exposure": round(simulated_top, 2),
            "potential_duplicate_cost": round(simulated_dup, 2),
        },
        "delta": {
            "score": int(simulated_score) - int(baseline_score),
            "hhi": round(simulated_hhi - baseline_hhi, 4),
            "average_ter_cost": round(simulated_ter - baseline_ter, 2),
            "top_company_exposure": round(simulated_top - baseline_top, 2),
            "potential_duplicate_cost": round(simulated_dup - baseline_dup, 2),
        },
        "disclaimer": (
            "Simulation only. The real portfolio has not been changed. "
            "Objective metrics only — no buy/sell recommendation. "
            "Re-run the simulation with different funds to compare."
        ),
    }
