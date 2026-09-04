from collections import defaultdict
from decimal import Decimal

from app.models.holding import Holding, AssetType
from app.models.market_data import FundScheme
from app.services.diagnostics.concentration import calculate_hhi
from app.services.diagnostics.diversification import (
    DiversificationMetrics,
    calculate_diversification_score,
)
from app.services.diagnostics.exposure import (
    calculate_effective_company_exposure,
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

    Returns:
        ISIN -> FundScheme
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
    Build portfolio diagnostics including effective company exposure.

    MF look-through requires FundScheme/SchemeHolding reference data.
    """

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

    hhi, classification = calculate_hhi(
        exposures,
        total_value,
    )

    asset_values: dict[str, Decimal] = defaultdict(
        lambda: Decimal("0")
    )

    for holding in holdings:
        asset_values[holding.asset_type.value] += (
            holding.current_value
        )

    max_asset = max(
        asset_values.values(),
        default=Decimal("0"),
    )

    max_company = max(
        (
            item.exposure_percent
            for item in exposures
        ),
        default=Decimal("0"),
    )

    score, rating, factors = calculate_diversification_score(
        DiversificationMetrics(
            hhi=hhi,
            max_company_exposure=max_company,
            meaningful_company_count=sum(
                1
                for item in exposures
                if item.exposure_percent >= Decimal("1")
            ),
            asset_concentration=(
                max_asset
                / total_value
                * Decimal("100")
                if total_value
                else Decimal("0")
            ),
        )
    )

    alerts: list[dict[str, str]] = []

    if max_company > Decimal("25"):
        alerts.append(
            {
                "level": "WARNING",
                "code": "HIGH_COMPANY_EXPOSURE",
                "message": "High exposure to one company",
            }
        )

    if classification == "HIGH_CONCENTRATION":
        alerts.append(
            {
                "level": "WARNING",
                "code": "HIGH_CONCENTRATION",
                "message": "Portfolio concentration detected",
            }
        )

    if mf_lookthrough_unavailable:
        alerts.append(
        {
            "level": "INFO",
            "code": "MF_LOOKTHROUGH_UNAVAILABLE",
            "message": "MF look-through data unavailable",
        }
    )

    return _api_value(
        {
            "portfolio_id": portfolio_id,
            "total_value": total_value,
            "diversification_score": {
                "score": score,
                "rating": rating,
                "factors": factors,
            },
            "concentration": {
                "hhi": hhi,
                "classification": classification,
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
            "alerts": alerts,
        }
    )