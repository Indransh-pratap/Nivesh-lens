from datetime import date
from decimal import Decimal
import logging
from typing import Sequence
import uuid

from sqlalchemy.orm import Session

from app.models.holding import AssetType, Holding
from app.schemas.lookthrough import (
    ContributingFundItem,
    IndirectCompanyExposureItem,
    LookThroughResponse,
    MFLookthroughHoldingItem,
    MFLookthroughSchemeItem,
)
from app.services.amfi.provider import AMFIPortfolioProvider, CanonicalSchemeResolver
from app.services.exposure.company_exposure import (
    CanonicalCompanyResolver,
    calculate_company_exposure,
)
from app.services.market_data.seed_data import seed_market_baseline

logger = logging.getLogger(__name__)


def calculate_portfolio_lookthrough(
    portfolio_id: uuid.UUID,
    holdings: Sequence[Holding],
    db: Session,
    provider: AMFIPortfolioProvider | None = None,
) -> LookThroughResponse:
    """
    Calculates detailed AMFI stock look-through and indirect company exposures
    for a user's portfolio across all mutual funds.
    """
    # Ensure baseline market data is seeded
    seed_market_baseline(db)

    mf_provider = provider or AMFIPortfolioProvider(db=db)
    company_resolver = CanonicalCompanyResolver(db=db)

    positive_holdings = [
        h for h in holdings
        if h.current_value is not None and Decimal(str(h.current_value)) > Decimal("0")
    ]
    total_portfolio_val = sum(
        (Decimal(str(h.current_value)) for h in positive_holdings),
        Decimal("0"),
    )

    if total_portfolio_val <= Decimal("0"):
        return LookThroughResponse(
            portfolio_id=str(portfolio_id),
            portfolio_value=0.0,
            total_mf_value=0.0,
            data_as_of=None,
            mf_lookthrough_available=True,
            mutual_funds=[],
            companies=[],
            combined_companies=[],
        )

    total_mf_val = Decimal("0")
    latest_as_of_date: date | None = None
    all_mf_lookthrough_available = True
    has_any_mf = False

    scheme_items: list[MFLookthroughSchemeItem] = []
    # Dict to aggregate indirect company exposure across mutual funds
    # key: canonical company_id
    indirect_accumulators: dict[str, dict] = {}

    for holding in positive_holdings:
        holding_val = Decimal(str(holding.current_value))
        raw_type = str(holding.asset_type).upper()
        name_upper = holding.name.upper()

        is_mf = (
            holding.asset_type == AssetType.MUTUAL_FUND
            or "MUTUAL" in raw_type
            or "FUND" in name_upper
            or "GROWTH" in name_upper
        )

        if not is_mf:
            continue

        has_any_mf = True
        total_mf_val += holding_val

        # Resolve canonical scheme record
        canonical_scheme = CanonicalSchemeResolver.resolve_scheme(
            db=db,
            scheme_isin=holding.isin,
            scheme_name=holding.name,
        )

        underlying_holdings, as_of = mf_provider.get_fund_holdings(
            fund_isin=holding.isin,
            fund_name=holding.name,
        )

        if not underlying_holdings:
            all_mf_lookthrough_available = False
            scheme_items.append(
                MFLookthroughSchemeItem(
                    scheme_name=holding.name,
                    scheme_code=canonical_scheme.scheme_code if canonical_scheme else None,
                    scheme_isin=holding.isin or (canonical_scheme.isin if canonical_scheme else None),
                    user_value=float(holding_val),
                    lookthrough_available=False,
                    as_of_date=None,
                    holdings=[],
                )
            )
            continue

        if as_of:
            if latest_as_of_date is None or as_of > latest_as_of_date:
                latest_as_of_date = as_of

        fund_holding_items: list[MFLookthroughHoldingItem] = []

        for sh in underlying_holdings:
            exposure_val = (holding_val * sh.weight_percentage) / Decimal("100")
            if exposure_val <= Decimal("0"):
                continue

            c_id, c_name, c_isin, c_sector, c_ticker = company_resolver.resolve(
                name=sh.company_name,
                isin=sh.company_isin,
            )
            resolved_sector = c_sector or sh.sector

            fund_holding_items.append(
                MFLookthroughHoldingItem(
                    company_name=c_name,
                    isin=c_isin,
                    ticker=c_ticker,
                    sector=resolved_sector,
                    weight_percent=float(sh.weight_percentage),
                    exposure_value=float(exposure_val),
                    quantity=float(sh.quantity) if sh.quantity is not None else None,
                    market_value=float(sh.market_value) if sh.market_value is not None else None,
                )
            )

            # Aggregate across multiple mutual funds
            key = c_id
            if key not in indirect_accumulators:
                indirect_accumulators[key] = {
                    "company_id": c_id,
                    "company_name": c_name,
                    "isin": c_isin,
                    "ticker": c_ticker,
                    "sector": resolved_sector,
                    "total_exposure_val": Decimal("0"),
                    "contributing_funds": [],
                }

            indirect_accumulators[key]["total_exposure_val"] += exposure_val
            indirect_accumulators[key]["contributing_funds"].append(
                ContributingFundItem(
                    fund_name=holding.name,
                    fund_isin=holding.isin,
                    fund_value=float(holding_val),
                    weight_percent=float(sh.weight_percentage),
                    exposure_value=float(exposure_val),
                    as_of_date=as_of.isoformat() if as_of else None,
                )
            )

        # Sort fund holdings by weight descending
        fund_holding_items.sort(key=lambda item: item.weight_percent, reverse=True)

        scheme_items.append(
            MFLookthroughSchemeItem(
                scheme_name=holding.name,
                scheme_code=canonical_scheme.scheme_code if canonical_scheme else None,
                scheme_isin=holding.isin or (canonical_scheme.isin if canonical_scheme else None),
                user_value=float(holding_val),
                lookthrough_available=True,
                as_of_date=as_of.isoformat() if as_of else None,
                holdings=fund_holding_items,
            )
        )

    # Compile aggregated indirect company list
    company_items: list[IndirectCompanyExposureItem] = []
    for acc in indirect_accumulators.values():
        tot_val = acc["total_exposure_val"]
        pct = (tot_val / total_portfolio_val) * Decimal("100") if total_portfolio_val > Decimal("0") else Decimal("0")

        # Sort contributing funds by exposure descending
        acc["contributing_funds"].sort(key=lambda cf: cf.exposure_value, reverse=True)

        company_items.append(
            IndirectCompanyExposureItem(
                company_id=acc["company_id"],
                company_name=acc["company_name"],
                isin=acc["isin"],
                ticker=acc["ticker"],
                sector=acc["sector"],
                total_exposure_value=float(tot_val),
                total_exposure_percent=round(float(pct), 4),
                contributing_funds=acc["contributing_funds"],
            )
        )

    company_items.sort(key=lambda item: item.total_exposure_value, reverse=True)

    # Compute combined direct + indirect exposure using the unified calculator
    company_exposure_res = calculate_company_exposure(
        portfolio_id=portfolio_id,
        holdings=holdings,
        db=db,
        provider=mf_provider,
    )

    return LookThroughResponse(
        portfolio_id=str(portfolio_id),
        portfolio_value=float(total_portfolio_val),
        total_mf_value=float(total_mf_val),
        data_as_of=latest_as_of_date.isoformat() if latest_as_of_date else None,
        mf_lookthrough_available=all_mf_lookthrough_available if has_any_mf else True,
        mutual_funds=scheme_items,
        companies=company_items,
        combined_companies=company_exposure_res.companies,
    )
