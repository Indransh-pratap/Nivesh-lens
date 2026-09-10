from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal

from app.models.holding import AssetType, Holding
from app.models.market_data import FundScheme, SchemeHolding
from app.services.cas.normalizer import normalize_security_name


@dataclass(frozen=True)
class ExposureSource:
    type: str
    value: Decimal


@dataclass(frozen=True)
class CompanyExposure:
    company: str
    exposure_value: Decimal
    exposure_percent: Decimal
    sources: list[ExposureSource]


def _company_key(company_isin: str | None, company_name: str) -> str:
    """
    Prefer ISIN because company names can vary between disclosures.
    """
    if company_isin:
        return company_isin.strip().upper()

    return normalize_security_name(company_name)


def _latest_scheme_holdings(
    scheme: FundScheme,
) -> list[SchemeHolding]:
    """
    Return only the latest available portfolio disclosure for a scheme.
    """
    if not scheme.holdings:
        return []

    latest_date = max(
        holding.as_of_date
        for holding in scheme.holdings
    )

    return [
        holding
        for holding in scheme.holdings
        if holding.as_of_date == latest_date
    ]


def calculate_effective_company_exposure(
    holdings: list[Holding],
    total_value: Decimal,
    schemes: dict[str, FundScheme] | None = None,
) -> tuple[list[CompanyExposure], bool]:
    """
    Calculate effective company exposure.

    Direct stocks:
        100% of the stock holding value is attributed to the company.

    Mutual funds:
        MF holding value × latest disclosed company weight.

    Returns:
        (exposures, mf_lookthrough_available)
    """

    if total_value <= Decimal("0"):
        return [], False

    grouped_values: dict[str, Decimal] = defaultdict(Decimal)
    company_names: dict[str, str] = {}
    source_values: dict[str, dict[str, Decimal]] = defaultdict(
        lambda: defaultdict(Decimal)
    )

    mf_present = False
    mf_lookthrough_available = False

    for holding in holdings:
        holding_value = Decimal(str(holding.current_value))

        if holding_value <= Decimal("0"):
            continue

        # ---------------------------------------------------------
        # DIRECT STOCK
        # ---------------------------------------------------------
        raw_asset_type = str(
            getattr(holding.asset_type, "value", holding.asset_type)
        ).upper()
        # ETFs are equity instruments too; imported CAS records can also
        # arrive as enum-like strings, so do not rely on identity comparison.
        if holding.asset_type in (AssetType.STOCK, AssetType.ETF) or raw_asset_type in {"STOCK", "ETF"}:
            key = _company_key(
                holding.isin,
                holding.name,
            )

            grouped_values[key] += holding_value
            company_names.setdefault(key, holding.name)
            source_values[key]["DIRECT"] += holding_value

            continue

        # ---------------------------------------------------------
        # MUTUAL FUND LOOK-THROUGH
        # ---------------------------------------------------------
        if holding.asset_type == AssetType.MUTUAL_FUND or raw_asset_type in {"MUTUAL_FUND", "MUTUAL FUND"}:
            mf_present = True

            scheme = None

            if schemes and holding.isin:
                scheme = schemes.get(
                    holding.isin.strip().upper()
                )

            if scheme is None:
                continue

            scheme_holdings = _latest_scheme_holdings(scheme)

            if not scheme_holdings:
                continue

            mf_lookthrough_available = True

            for scheme_holding in scheme_holdings:
                weight = Decimal(
                    str(scheme_holding.weight_percentage)
                )

                if weight <= Decimal("0"):
                    continue

                effective_value = (
                    holding_value
                    * weight
                    / Decimal("100")
                )

                key = _company_key(
                    scheme_holding.company_isin,
                    scheme_holding.company_name,
                )

                grouped_values[key] += effective_value

                company_names.setdefault(
                    key,
                    scheme_holding.company_name,
                )

                source_values[key]["MF_LOOKTHROUGH"] += effective_value

    exposures: list[CompanyExposure] = []

    for key, value in grouped_values.items():
        sources = [
            ExposureSource(
                type=source_type,
                value=source_value,
            )
            for source_type, source_value
            in source_values[key].items()
        ]

        exposures.append(
            CompanyExposure(
                company=company_names[key],
                exposure_value=value,
                exposure_percent=(
                    value
                    / total_value
                    * Decimal("100")
                ),
                sources=sources,
            )
        )

    exposures.sort(
        key=lambda item: item.exposure_value,
        reverse=True,
    )

    return exposures, (
    mf_present and not mf_lookthrough_available
    )
