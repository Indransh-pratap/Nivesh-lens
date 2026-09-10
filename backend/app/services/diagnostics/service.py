from collections import defaultdict
from decimal import Decimal

from app.models.holding import Holding, AssetType
from app.models.market_data import FundScheme, SchemeHolding
from app.services.diagnostics.concentration import calculate_hhi
from app.services.diagnostics.diversification import (
    DiversificationMetrics,
    calculate_diversification_score,
)
from app.services.diagnostics.exposure import (
    calculate_effective_company_exposure,
)
from app.services.diagnostics.hhi_engine import (
    HHIItem,
    calculate_portfolio_company_hhi,
)
from app.services.diagnostics.health_score_engine import (
    calculate_health_score,
)
from app.services.diagnostics.fee_analyzer import (
    analyze_portfolio_fees_and_duplicates,
)
from app.services.diagnostics.nominee_auditor import (
    audit_portfolio_nominees,
)


def _api_value(value):
    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, list):
        return [_api_value(item) for item in value]

    if isinstance(value, dict):
        return {key: _api_value(item) for key, item in value.items()}

    return value


def _load_fund_schemes(holdings: list[Holding], db) -> dict[str, FundScheme]:
    """
    Load FundScheme records for mutual-fund holdings.
    Returns: ISIN -> FundScheme
    """
    isins = {
        holding.isin.strip().upper()
        for holding in holdings
        if holding.asset_type == AssetType.MUTUAL_FUND
        and holding.isin
    }

    if not isins:
        return {}

    schemes = (
        db.query(FundScheme)
        .filter(FundScheme.isin.in_(isins))
        .all()
    )

    return {
        scheme.isin.strip().upper(): scheme
        for scheme in schemes
        if scheme.isin
    }


def build_diagnostics(
    portfolio_id: str,
    holdings: list[Holding],
    total_value: Decimal,
    db=None,
) -> dict:
    """
    Build complete Phase 1 portfolio diagnostics suite:
    - True Effective Company Exposure
    - Deterministic HHI Concentration Score (0-10,000 scale)
    - Proprietary Portfolio Health Score (300-900 scale with 4 explainable pillars)
    - Wasted Fee & Duplicate TER Analysis
    - Nominee & Unclaimed Wealth Legal Compliance Audit
    - Actionable Alerts
    """
    if total_value <= Decimal("0") or not holdings:
        return {
            "portfolio_id": portfolio_id,
            "total_value": float(total_value),
            "diversification_score": {
                "score": None,
                "rating": "NOT_AVAILABLE",
                "factors": [],
                "sub_pillars": [],
                "reasons": ["Empty portfolio."],
            },
            "concentration": {
                "hhi": None,
                "hhi_score": None,
                "hhi_normalized": None,
                "classification": "NOT_AVAILABLE",
            },
            "top_company_exposures": [],
            "fee_analysis": None,
            "nominee_audit": None,
            "alerts": [],
        }

    schemes = (
        _load_fund_schemes(holdings, db)
        if db is not None
        else {}
    )

    exposures, mf_lookthrough_unavailable = (
        calculate_effective_company_exposure(
            holdings,
            total_value,
            schemes,
        )
    )

    # Legacy HHI for backward compatibility
    legacy_hhi, legacy_classification = calculate_hhi(
        exposures,
        total_value,
    )

    # Standard HHI (0 to 10,000 scale)
    hhi_items = [
        HHIItem(
            identifier=item.company,
            name=item.company,
            weight_percentage=item.exposure_percent,
        )
        for item in exposures
    ]
    # Exposure look-through intentionally omits cash/debt and funds whose
    # disclosures are unavailable. Keep that value in an explicit residual
    # bucket so HHI still reflects the entire portfolio instead of collapsing
    # to zero (or overstating concentration among only mapped companies).
    mapped_exposure_value = sum(
        (item.exposure_value for item in exposures), Decimal("0")
    )
    residual_exposure = max(Decimal("0"), total_value - mapped_exposure_value)
    hhi_result = calculate_portfolio_company_hhi(
        company_exposures=hhi_items,
        total_portfolio_value=total_value,
        unmapped_value=residual_exposure,
    )

    # Asset class distribution
    asset_values: dict[str, Decimal] = defaultdict(Decimal)
    for holding in holdings:
        asset_values[holding.asset_type.value] += (
            holding.current_value or Decimal("0")
        )

    asset_pcts: dict[str, Decimal] = {
        k: (v / total_value * Decimal("100"))
        for k, v in asset_values.items()
        if total_value > Decimal("0")
    }

    max_company = max(
        (item.exposure_percent for item in exposures),
        default=Decimal("0"),
    )
    top_company_name = exposures[0].company if exposures else None

    # Mutual fund fee and overlap data preparation
    total_mf_val = Decimal("0")
    regular_plan_val = Decimal("0")
    fund_dicts: list[dict] = []
    audited_accounts: list[dict] = []

    for idx, h in enumerate(holdings):
        val = Decimal(str(h.current_value or 0))
        is_mf = (h.asset_type == AssetType.MUTUAL_FUND or "MUTUAL" in str(h.asset_type).upper())
        is_regular = "REGULAR" in h.name.upper()

        if is_mf:
            total_mf_val += val
            if is_regular:
                regular_plan_val += val

            # Collect scheme holdings if scheme reference is available
            scheme = schemes.get(h.isin.strip().upper()) if schemes and h.isin else None
            underlying_items: list[dict] = []
            if scheme and scheme.holdings:
                latest_date = max(sh.as_of_date for sh in scheme.holdings)
                for sh in scheme.holdings:
                    if sh.as_of_date == latest_date:
                        exp = (val * Decimal(str(sh.weight_percentage))) / Decimal("100")
                        underlying_items.append({
                            "company_name": sh.company_name,
                            "company_isin": sh.company_isin,
                            "weight": sh.weight_percentage,
                            "exposure": exp,
                        })

            fund_dicts.append({
                "name": h.name,
                "isin": h.isin,
                "value": val,
                "plan_type": "Regular" if is_regular else "Direct",
                "ter": Decimal(str(scheme.expense_ratio)) if scheme and getattr(scheme, "expense_ratio", None) else (Decimal("1.65") if is_regular else Decimal("0.85")),
                "underlying": underlying_items,
            })

        # Nominee tracking per holding/account
        folio = getattr(h, "folio_number", None) or (h.isin[:8] if h.isin else f"ACC_{idx+1}")
        acc_type = "Mutual Fund Folio" if is_mf else "Demat Holding"
        nom_status = getattr(h, "nominee_status", "UNKNOWN")
        nom_name = getattr(h, "nominee_name", None)

        audited_accounts.append({
            "id": f"acc_{idx+1}",
            "name": h.name,
            "account_type": acc_type,
            "account_number": str(folio),
            "nominee_status": nom_status,
            "nominee_name": nom_name,
            "relationship": "Spouse" if nom_name else None,
            "source": "CAS",
        })

    # Fee and duplicate TER analysis
    fee_result = analyze_portfolio_fees_and_duplicates(funds=fund_dicts)

    # Nominee audit
    nominee_result = audit_portfolio_nominees(accounts=audited_accounts)

    # Health Score (300 to 900)
    health_result = calculate_health_score(
        total_portfolio_value=total_value,
        hhi_score=hhi_result.hhi_score,
        max_company_pct=max_company,
        top_company_name=top_company_name,
        asset_class_weights=asset_pcts,
        regular_plan_val=regular_plan_val,
        total_mf_val=total_mf_val,
        overlap_pct=Decimal(str(fee_result.overlap_percentage)),
        total_accounts=nominee_result.accounts_checked,
        confirmed_nominee_accounts=nominee_result.accounts_confirmed,
        missing_nominee_accounts=nominee_result.accounts_missing,
    )

    # Construct alerts
    alerts: list[dict[str, str]] = []

    if max_company > Decimal("25"):
        alerts.append({
            "level": "WARNING",
            "code": "HIGH_COMPANY_EXPOSURE",
            "message": f"High exposure to {top_company_name or 'single company'} ({max_company:.1f}%)",
        })

    if hhi_result.classification == "HIGH_CONCENTRATION":
        alerts.append({
            "level": "WARNING",
            "code": "HIGH_CONCENTRATION",
            "message": f"Portfolio concentration detected (HHI: {hhi_result.hhi_score})",
        })

    if mf_lookthrough_unavailable:
        alerts.append({
            "level": "INFO",
            "code": "MF_LOOKTHROUGH_UNAVAILABLE",
            "message": "MF look-through data unavailable for some schemes",
        })

    for flag in nominee_result.red_flags:
        alerts.append({
            "level": "WARNING",
            "code": "NOMINEE_MISSING",
            "message": f"Nominee missing for {flag['account_name']} ({flag['account_number']})",
        })

    if fee_result.total_annual_bleed_amount > 5000:
        alerts.append({
            "level": "WARNING",
            "code": "FEE_BLEED_DETECTED",
            "message": f"Potential fee leak of ₹{int(fee_result.total_annual_bleed_amount):,} / year detected",
        })

    # Prepare factors for backward compatibility
    factors = [
        {"name": pillar.name, "score": pillar.score, "max_score": pillar.max_score, "impact": pillar.score - (pillar.max_score // 2)}
        for pillar in health_result.sub_pillars
    ]

    return _api_value({
        "portfolio_id": portfolio_id,
        "total_value": total_value,
        "diversification_score": {
            "score": health_result.overall_score,
            "rating": health_result.rating_grade,
            "percentile_rank": health_result.percentile_rank,
            "rating_text": health_result.rating_text,
            "factors": factors,
            "sub_pillars": [
                {
                    "id": p.id,
                    "name": p.name,
                    "score": p.score,
                    "max_score": p.max_score,
                    "weight": p.weight,
                    "status": p.status,
                    "insight": p.insight,
                }
                for p in health_result.sub_pillars
            ],
            "reasons": health_result.reasons,
        },
        "concentration": {
            "hhi": legacy_hhi,
            "hhi_score": hhi_result.hhi_score,
            "hhi_normalized": hhi_result.hhi_normalized,
            "classification": hhi_result.classification,
            "effective_constituent_count": hhi_result.effective_constituent_count,
            "top_contributor": hhi_result.top_contributor_name,
            "top_contributor_weight": hhi_result.top_contributor_weight,
        },
        "top_company_exposures": [
            {
                "company": item.company,
                "exposure_value": item.exposure_value,
                "exposure_percent": item.exposure_percent,
                "sources": [
                    {
                        "type": source.type,
                        "value": source.value,
                    }
                    for source in item.sources
                ],
            }
            for item in exposures[:10]
        ],
        "fee_analysis": {
            "total_mf_value": fee_result.total_mf_value,
            "total_actual_ter_cost": fee_result.total_actual_ter_cost,
            "total_regular_commission_bleed": fee_result.total_regular_commission_bleed,
            "estimated_potential_duplicate_cost": fee_result.estimated_potential_duplicate_cost,
            "total_annual_bleed_amount": fee_result.total_annual_bleed_amount,
            "overlap_percentage": fee_result.overlap_percentage,
            "overlapping_companies_count": fee_result.overlapping_companies_count,
            "top_overlapping_companies": fee_result.top_overlapping_companies,
            "fund_fee_breakdown": fee_result.fund_fee_breakdown,
            "compounded_projections": fee_result.compounded_projections,
            "cagr_compounding_rate": fee_result.cagr_compounding_rate,
            "ter_data_missing_funds_count": fee_result.ter_data_missing_funds_count,
        },
        "nominee_audit": {
            "accounts_checked": nominee_result.accounts_checked,
            "accounts_confirmed": nominee_result.accounts_confirmed,
            "accounts_missing": nominee_result.accounts_missing,
            "accounts_unknown": nominee_result.accounts_unknown,
            "compliance_percentage": nominee_result.compliance_percentage,
            "is_fully_compliant": nominee_result.is_fully_compliant,
            "red_flags": nominee_result.red_flags,
            "accounts": nominee_result.accounts,
        },
        "alerts": alerts,
    })
