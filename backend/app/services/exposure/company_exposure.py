from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
import re
from typing import Sequence
import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.holding import AssetType, Holding
from app.models.market_data import Company, FundScheme, SchemeHolding
from app.schemas.exposure import (
    CompanyExposureItem,
    CompanyExposureResponse,
    ExposureSourceItem,
)
from app.services.cas.normalizer import normalize_security_name
from app.services.market_data.seed_data import seed_market_baseline
from app.services.amfi.provider import AMFIPortfolioProvider, CanonicalSchemeResolver
from app.services.diagnostics.hhi_engine import HHIItem, calculate_portfolio_company_hhi


@dataclass(frozen=True)
class FundUnderlyingHolding:
    company_name: str
    company_isin: str | None
    sector: str | None
    weight_percentage: Decimal
    as_of_date: date | None


class MutualFundHoldingsProvider(ABC):
    @abstractmethod
    def get_fund_holdings(
        self,
        fund_isin: str | None,
        fund_name: str,
    ) -> tuple[list[FundUnderlyingHolding], date | None]:
        """
        Returns a tuple of (list of underlying holdings, latest disclosure date).
        """
        pass


class DatabaseMutualFundHoldingsProvider(MutualFundHoldingsProvider):
    def __init__(self, db: Session):
        self.db = db

    def get_fund_holdings(
        self,
        fund_isin: str | None,
        fund_name: str,
    ) -> tuple[list[FundUnderlyingHolding], date | None]:
        scheme = CanonicalSchemeResolver.resolve_scheme(
            self.db,
            scheme_isin=fund_isin,
            scheme_name=fund_name,
        )

        if not scheme:
            return [], None

        scheme_holdings = (
            self.db.query(SchemeHolding)
            .filter(SchemeHolding.scheme_id == scheme.id)
            .all()
        )

        if not scheme_holdings:
            return [], None

        latest_date = max(h.as_of_date for h in scheme_holdings)
        latest_holdings = [
            h for h in scheme_holdings if h.as_of_date == latest_date
        ]

        if not latest_holdings:
            return [], None

        # Check if weights are expressed as fractional (e.g. 0.082) vs percentage (8.20)
        raw_weights: list[Decimal] = []
        for h in latest_holdings:
            if h.weight_percentage is None:
                continue
            try:
                raw_weights.append(Decimal(str(h.weight_percentage)))
            except Exception:
                # A malformed disclosure must not take down the entire
                # portfolio; it is omitted and represented by reconciliation.
                continue
        sum_weights = sum(raw_weights)
        is_fractional = sum_weights > Decimal("0") and sum_weights <= Decimal("1.05")

        results: list[FundUnderlyingHolding] = []
        for h in latest_holdings:
            if h.weight_percentage is None:
                continue
            try:
                weight = Decimal(str(h.weight_percentage))
            except Exception:
                continue
            if weight <= Decimal("0"):
                continue

            if is_fractional:
                weight = weight * Decimal("100")

            results.append(
                FundUnderlyingHolding(
                    company_name=h.company_name,
                    company_isin=h.company_isin.strip().upper() if h.company_isin else None,
                    sector=h.sector,
                    weight_percentage=weight,
                    as_of_date=latest_date,
                )
            )

        return results, latest_date


class CanonicalCompanyResolver:
    """
    Resolves diverse company name variations and ISINs to canonical company entities.
    Prevents duplicate entries like 'Reliance Industries Ltd' and 'Reliance Industries Limited'.
    """

    def __init__(self, db: Session | None = None):
        self.companies_by_isin: dict[str, Company] = {}
        self.companies_by_name: dict[str, Company] = {}
        self.companies_by_ticker: dict[str, Company] = {}

        if db:
            companies = db.query(Company).all()
            for c in companies:
                if c.isin:
                    self.companies_by_isin[c.isin.strip().upper()] = c
                if c.ticker:
                    self.companies_by_ticker[c.ticker.strip().upper()] = c
                norm_name = self.normalize_name(c.name)
                if norm_name:
                    self.companies_by_name[norm_name] = c

    @staticmethod
    def normalize_name(name: str) -> str:
        """
        Normalize company display name by stripping punctuation, common corporate suffixes,
        and collapsing extra whitespace.
        """
        if not name:
            return ""
        s = name.strip().lower()
        # Remove parentheses content e.g. (India)
        s = re.sub(r"\(.*?\)", "", s)
        # Strip common suffixes
        suffixes = [
            r"\blimited\b",
            r"\bltd\.?\b",
            r"\bcorporation\b",
            r"\bcorp\.?\b",
            r"\binc\.?\b",
            r"\bco\.?\b",
            r"\bcompany\b",
            r"\bindustries\b",
            r"\binds\.?\b",
        ]
        for pattern in suffixes:
            s = re.sub(pattern, "", s, flags=re.IGNORECASE)
        # Clean non-alphanumeric characters
        s = re.sub(r"[^\w\s]", " ", s)
        s = re.sub(r"\s+", " ", s).strip()
        return s

    def resolve(
        self,
        name: str,
        isin: str | None = None,
    ) -> tuple[str, str, str | None, str | None, str | None]:
        """
        Returns (canonical_id, canonical_name, canonical_isin, sector, ticker).
        Prefers ISIN -> Known DB Company -> Normalized name match.
        """
        clean_isin = isin.strip().upper() if isin and isin.strip() else None

        # 1. Match by ISIN against known companies
        if clean_isin and clean_isin in self.companies_by_isin:
            c = self.companies_by_isin[clean_isin]
            return (
                str(c.id),
                c.name,
                c.isin,
                c.sector,
                c.ticker,
            )

        # 2. Match by normalized name against known companies
        norm_name = self.normalize_name(name)
        if norm_name and norm_name in self.companies_by_name:
            c = self.companies_by_name[norm_name]
            return (
                str(c.id),
                c.name,
                clean_isin or c.isin,
                c.sector,
                c.ticker,
            )

        # 3. If ISIN exists but not in DB company master
        if clean_isin:
            clean_display = self._clean_display_name(name)
            return (
                f"isin_{clean_isin}",
                clean_display,
                clean_isin,
                None,
                None,
            )

        # 4. Fallback to normalized company name
        clean_display = self._clean_display_name(name)
        canonical_key = norm_name if norm_name else clean_display.lower()
        return (
            f"name_{canonical_key}",
            clean_display,
            None,
            None,
            None,
        )

    @staticmethod
    def _clean_display_name(raw_name: str) -> str:
        s = raw_name.strip()
        # Clean obvious trailing Ltd/Limited variations for cleaner display
        s = re.sub(r"\s+(ltd\.?|limited|corp\.?|corporation)$", "", s, flags=re.IGNORECASE).strip()
        return s if s else raw_name.strip()


class CompanyAccumulator:
    def __init__(
        self,
        company_id: str,
        company_name: str,
        isin: str | None,
        sector: str | None,
        ticker: str | None,
    ):
        self.company_id = company_id
        self.company_name = company_name
        self.isin = isin
        self.sector = sector
        self.ticker = ticker
        self.direct_value: Decimal = Decimal("0")
        self.mutual_fund_value: Decimal = Decimal("0")
        self.sources: list[ExposureSourceItem] = []

    def add_direct(self, holding: Holding, value: Decimal) -> None:
        self.direct_value += value
        self.sources.append(
            ExposureSourceItem(
                type="direct",
                holding_name=holding.name,
                isin=holding.isin,
                value=float(value),
                exposure_value=float(value),
            )
        )

    def add_mutual_fund(
        self,
        fund_holding: Holding,
        fund_val: Decimal,
        sh: FundUnderlyingHolding,
        exposure: Decimal,
    ) -> None:
        self.mutual_fund_value += exposure
        self.sources.append(
            ExposureSourceItem(
                type="mutual_fund",
                fund_name=fund_holding.name,
                fund_isin=fund_holding.isin,
                fund_value=float(fund_val),
                company_weight=float(sh.weight_percentage),
                exposure_value=float(exposure),
                value=float(exposure),
                as_of_date=str(sh.as_of_date) if sh.as_of_date else None,
            )
        )


def calculate_company_exposure(
    portfolio_id: uuid.UUID | str,
    holdings: Sequence[Holding],
    db: Session | None = None,
    provider: MutualFundHoldingsProvider | None = None,
) -> CompanyExposureResponse:
    """
    Calculates the combined true company exposure for a portfolio by merging
    direct stock positions and look-through holdings from mutual funds.

    Uses high-precision Decimal arithmetic and deduplicates companies by ISIN and normalized identity.
    """
    if db is not None:
        # Ensure standard baseline market data is available
        seed_market_baseline(db)

    resolver = CanonicalCompanyResolver(db=db)
    mf_provider = provider or (AMFIPortfolioProvider(db) if db is not None else None)

    # Compute total portfolio value using Decimal
    positive_holdings = [
        h for h in holdings
        if h.current_value is not None and Decimal(str(h.current_value)) > Decimal("0")
    ]
    total_portfolio_value = sum(
        (Decimal(str(h.current_value)) for h in positive_holdings),
        Decimal("0"),
    )

    if total_portfolio_value <= Decimal("0"):
        return CompanyExposureResponse(
            portfolio_id=str(portfolio_id),
            portfolio_value=0.0,
            data_as_of=None,
            mf_lookthrough_available=True,
            total_direct_value=0.0,
            total_mf_value=0.0,
            companies=[],
        )

    # Cache MF look-through disclosures per unique fund to prevent repeated DB queries (N+1)
    mf_cache: dict[str, tuple[list[FundUnderlyingHolding], date | None]] = {}
    has_mf_holding = False
    mf_with_disclosures = 0
    latest_as_of_date: date | None = None

    accumulators: dict[str, CompanyAccumulator] = {}
    total_direct_val = Decimal("0")
    total_mf_val = Decimal("0")
    total_cash_debt_val = Decimal("0")
    total_unmapped_val = Decimal("0")
    total_fund_cash_debt_val = Decimal("0")

    for holding in positive_holdings:
        holding_val = Decimal(str(holding.current_value))

        # Check AssetType (support both enum and string representation)
        raw_asset_type = str(holding.asset_type).upper()
        is_stock = (
            holding.asset_type == AssetType.STOCK
            or "STOCK" in raw_asset_type
            or "EQUITY" in raw_asset_type
        )
        is_mf = (
            holding.asset_type == AssetType.MUTUAL_FUND
            or "MUTUAL" in raw_asset_type
        )
        is_cash_debt = (
            holding.asset_type in (AssetType.CASH, AssetType.BOND)
            or "CASH" in raw_asset_type
            or "BOND" in raw_asset_type
            or "FD" in raw_asset_type
        )

        # ---------------------------------------------------------
        # 1. DIRECT STOCK / EQUITY HOLDING
        # ---------------------------------------------------------
        if is_stock:
            total_direct_val += holding_val
            c_id, c_name, c_isin, c_sector, c_ticker = resolver.resolve(
                name=holding.name,
                isin=holding.isin,
            )
            key = c_id
            if key not in accumulators:
                accumulators[key] = CompanyAccumulator(
                    company_id=c_id,
                    company_name=c_name,
                    isin=c_isin,
                    sector=c_sector,
                    ticker=c_ticker,
                )
            accumulators[key].add_direct(holding, holding_val)

        # ---------------------------------------------------------
        # 2. MUTUAL FUND LOOK-THROUGH
        # ---------------------------------------------------------
        elif is_mf:
            has_mf_holding = True
            total_mf_val += holding_val

            fund_key = (holding.isin.strip().upper() if holding.isin else "") or holding.name.strip().lower()

            if fund_key not in mf_cache:
                if mf_provider:
                    underlying, as_of = mf_provider.get_fund_holdings(
                        fund_isin=holding.isin,
                        fund_name=holding.name,
                    )
                    mf_cache[fund_key] = (underlying, as_of)
                else:
                    mf_cache[fund_key] = ([], None)

            underlying_holdings, as_of = mf_cache[fund_key]

            if underlying_holdings:
                mf_with_disclosures += 1
                if as_of:
                    if latest_as_of_date is None or as_of > latest_as_of_date:
                        latest_as_of_date = as_of

                sum_wt = sum((sh.weight_percentage for sh in underlying_holdings), Decimal("0"))
                if sum_wt < Decimal("100.0"):
                    # Residual in fund is cash, debt, or unmapped liquid assets
                    fund_residual = (holding_val * (Decimal("100.0") - sum_wt)) / Decimal("100.0")
                    total_fund_cash_debt_val += max(Decimal("0"), fund_residual)

                for sh in underlying_holdings:
                    # exposure = fund_val * (weight / 100)
                    try:
                        exposure = (holding_val * sh.weight_percentage) / Decimal("100")
                    except Exception:
                        continue
                    if exposure <= Decimal("0"):
                        continue

                    c_id, c_name, c_isin, c_sector, c_ticker = resolver.resolve(
                        name=sh.company_name,
                        isin=sh.company_isin,
                    )
                    c_sector = c_sector or sh.sector

                    key = c_id
                    if key not in accumulators:
                        accumulators[key] = CompanyAccumulator(
                            company_id=c_id,
                            company_name=c_name,
                            isin=c_isin,
                            sector=c_sector,
                            ticker=c_ticker,
                        )
                    accumulators[key].add_mutual_fund(
                        fund_holding=holding,
                        fund_val=holding_val,
                        sh=sh,
                        exposure=exposure,
                    )
            else:
                total_unmapped_val += holding_val

        # ---------------------------------------------------------
        # 3. CASH, DEBT, OR UNMAPPED ASSETS
        # ---------------------------------------------------------
        elif is_cash_debt:
            total_cash_debt_val += holding_val
        else:
            total_unmapped_val += holding_val

    # Compile result items
    companies: list[CompanyExposureItem] = []
    for acc in accumulators.values():
        combined_val = acc.direct_value + acc.mutual_fund_value
        if combined_val <= Decimal("0"):
            continue

        combined_pct = (combined_val / total_portfolio_value) * Decimal("100")
        direct_pct = (acc.direct_value / total_portfolio_value) * Decimal("100")
        mf_pct = (acc.mutual_fund_value / total_portfolio_value) * Decimal("100")

        companies.append(
            CompanyExposureItem(
                company_id=acc.company_id,
                company_name=acc.company_name,
                isin=acc.isin,
                ticker=acc.ticker,
                sector=acc.sector,
                combined_value=float(combined_val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
                combined_percent=float(combined_pct.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)),
                direct_value=float(acc.direct_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
                direct_percent=float(direct_pct.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)),
                mutual_fund_value=float(acc.mutual_fund_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
                mutual_fund_percent=float(mf_pct.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)),
                sources=acc.sources,
            )
        )

    # Sort descending: highest combined exposure percentage first
    companies.sort(key=lambda x: x.combined_percent, reverse=True)

    # Determine if look-through was available for MFs
    mf_lookthrough_available = True
    if has_mf_holding and mf_with_disclosures == 0:
        mf_lookthrough_available = False

    # Portfolio asset reconciliation
    total_cash_debt = total_cash_debt_val + total_fund_cash_debt_val
    mapped_company_total = sum((acc.direct_value + acc.mutual_fund_value for acc in accumulators.values()), Decimal("0"))
    reconciled_total = mapped_company_total + total_unmapped_val + total_cash_debt
    reconciliation_diff = total_portfolio_value - reconciled_total

    # Data Freshness Provenance
    if latest_as_of_date:
        days_old = (date.today() - latest_as_of_date).days
        data_status = "LIVE" if days_old <= 7 else "RECENT" if days_old <= 45 else "STALE"
    else:
        data_status = "LIVE" if total_direct_val > Decimal("0") and not has_mf_holding else "UNKNOWN"

    # Calculate portfolio HHI score
    hhi_items = [
        HHIItem(
            identifier=acc.company_id,
            name=acc.company_name,
            weight_percentage=(acc.direct_value + acc.mutual_fund_value) / total_portfolio_value * Decimal("100"),
        )
        for acc in accumulators.values()
    ]
    hhi_res = calculate_portfolio_company_hhi(
        company_exposures=hhi_items,
        total_portfolio_value=total_portfolio_value,
        unmapped_value=total_unmapped_val + total_cash_debt,
    )

    return CompanyExposureResponse(
        portfolio_id=str(portfolio_id),
        portfolio_value=float(total_portfolio_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        data_as_of=str(latest_as_of_date) if latest_as_of_date else None,
        data_status=data_status,
        mf_lookthrough_available=mf_lookthrough_available,
        total_direct_value=float(total_direct_val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        total_mf_value=float(total_mf_val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        unmapped_value=float(total_unmapped_val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        unmapped_percent=float((total_unmapped_val / total_portfolio_value * Decimal("100")).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)) if total_portfolio_value > 0 else 0.0,
        cash_debt_value=float(total_cash_debt.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        cash_debt_percent=float((total_cash_debt / total_portfolio_value * Decimal("100")).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)) if total_portfolio_value > 0 else 0.0,
        reconciled_total_value=float(reconciled_total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        reconciliation_difference=float(reconciliation_diff.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        hhi_score=hhi_res.hhi_score,
        hhi_classification=hhi_res.classification,
        companies=companies,
    )
