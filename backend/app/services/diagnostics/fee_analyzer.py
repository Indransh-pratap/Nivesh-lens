from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
from typing import Sequence


@dataclass(frozen=True)
class FundFeeDetail:
    fund_name: str
    fund_isin: str | None
    fund_value: Decimal
    plan_type: str  # Direct | Regular
    ter_percentage: Decimal | None
    is_ter_available: bool
    annual_actual_cost: Decimal | None
    regular_commission_bleed: Decimal | None


@dataclass(frozen=True)
class OverlappingCompanyItem:
    company_name: str
    company_isin: str | None
    holding_funds: list[str]
    total_exposure_value: Decimal
    duplicate_exposure_value: Decimal  # Exposure present in >1 fund


@dataclass(frozen=True)
class CompoundedHorizonLoss:
    years: int
    loss_rupees: int


@dataclass(frozen=True)
class DuplicateFeeAnalysisResult:
    total_mf_value: float
    total_actual_ter_cost: float
    total_regular_commission_bleed: float
    estimated_potential_duplicate_cost: float
    total_annual_bleed_amount: float
    overlap_percentage: float
    overlapping_companies_count: int
    top_overlapping_companies: list[dict]
    fund_fee_breakdown: list[dict]
    compounded_projections: list[dict]
    cagr_compounding_rate: float
    ter_data_missing_funds_count: int


DEFAULT_REGULAR_COMMISSION_SPREAD = Decimal("0.0075")  # 0.75% average spread


def calculate_compounded_loss(annual_amount: Decimal, rate: Decimal, years: int) -> int:
    """
    Future value of ordinary annuity: FV = PMT * (((1 + r)^n - 1) / r)
    """
    if rate <= Decimal("0") or annual_amount <= Decimal("0"):
        return int(annual_amount * Decimal(years))
    r = rate
    multiplier = (((Decimal("1") + r) ** years) - Decimal("1")) / r
    return int((annual_amount * multiplier).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def analyze_portfolio_fees_and_duplicates(
    funds: Sequence[dict],
    # Each fund dict:
    # {
    #   "name": str,
    #   "isin": str | None,
    #   "value": Decimal,
    #   "plan_type": "Direct" | "Regular",
    #   "ter": Decimal | None,
    #   "underlying": list[{"company_name": str, "company_isin": str | None, "weight": Decimal, "exposure": Decimal}]
    # }
    cagr_rate: Decimal = Decimal("0.12"),  # 12% p.a.
) -> DuplicateFeeAnalysisResult:
    """
    Transparently calculates actual mutual fund TER fees, Regular plan commission bleed,
    and Estimated Potential Duplicate Cost from overlapping company exposures.
    """
    total_mf_val = Decimal("0")
    total_actual_ter = Decimal("0")
    total_reg_bleed = Decimal("0")
    missing_ter_count = 0

    fund_details: list[FundFeeDetail] = []
    # Map: canonical_key -> list of (fund_name, exposure, fund_ter)
    company_fund_map: dict[str, list[tuple[str, Decimal, Decimal | None]]] = {}
    company_names: dict[str, str] = {}
    company_isins: dict[str, str | None] = {}

    for f in funds:
        val = Decimal(str(f.get("value", 0)))
        if val <= Decimal("0"):
            continue

        total_mf_val += val
        name = str(f.get("name", "Unknown Fund"))
        isin = f.get("isin")
        plan = str(f.get("plan_type", "Direct")).capitalize()
        ter = Decimal(str(f["ter"])) if f.get("ter") is not None else None

        if ter is not None and ter > Decimal("0"):
            # Check if fractional (e.g. 0.012 vs 1.20%)
            actual_ter_pct = ter if ter <= Decimal("0.05") else (ter / Decimal("100"))
            annual_cost = val * actual_ter_pct
            total_actual_ter += annual_cost

            if plan == "Regular":
                reg_bleed = val * DEFAULT_REGULAR_COMMISSION_SPREAD
                total_reg_bleed += reg_bleed
            else:
                reg_bleed = Decimal("0")

            fund_details.append(
                FundFeeDetail(
                    fund_name=name,
                    fund_isin=isin,
                    fund_value=val,
                    plan_type=plan,
                    ter_percentage=actual_ter_pct * Decimal("100"),
                    is_ter_available=True,
                    annual_actual_cost=annual_cost,
                    regular_commission_bleed=reg_bleed,
                )
            )
        else:
            missing_ter_count += 1
            fund_details.append(
                FundFeeDetail(
                    fund_name=name,
                    fund_isin=isin,
                    fund_value=val,
                    plan_type=plan,
                    ter_percentage=None,
                    is_ter_available=False,
                    annual_actual_cost=None,
                    regular_commission_bleed=None,
                )
            )

        # Collect underlying exposures
        underlying = f.get("underlying") or []
        for sh in underlying:
            c_name = str(sh.get("company_name", "")).strip()
            c_isin = sh.get("company_isin")
            if not c_name and not c_isin:
                continue

            exp = Decimal(str(sh.get("exposure", 0)))
            if exp <= Decimal("0"):
                continue

            c_key = (c_isin.strip().upper() if c_isin else None) or c_name.lower()
            if c_key not in company_fund_map:
                company_fund_map[c_key] = []
                company_names[c_key] = c_name
                company_isins[c_key] = c_isin

            company_fund_map[c_key].append((name, exp, ter))

    # Calculate duplicate exposures across multiple funds
    total_overlapping_exposure = Decimal("0")
    estimated_potential_dup_cost = Decimal("0")
    overlapping_items: list[OverlappingCompanyItem] = []

    for c_key, occurrences in company_fund_map.items():
        if len(occurrences) > 1:
            # Present in more than 1 fund: duplicate exposure exists
            exposures = [occ[1] for occ in occurrences]
            tot_exp = sum(exposures)
            # Duplicate amount = total exposure minus the max single fund exposure
            max_single_fund_exp = max(exposures)
            dup_exp = tot_exp - max_single_fund_exp
            total_overlapping_exposure += dup_exp

            # Estimated cost on duplicate exposure: duplicate value * average fund TER (default 0.75% if missing)
            valid_ters = [occ[2] for occ in occurrences if occ[2] is not None]
            avg_ter_pct = (
                sum(valid_ters) / Decimal(len(valid_ters))
                if valid_ters
                else Decimal("0.75")
            )
            if avg_ter_pct > Decimal("0.05"):
                avg_ter_pct = avg_ter_pct / Decimal("100")

            dup_cost = dup_exp * avg_ter_pct
            estimated_potential_dup_cost += dup_cost

            overlapping_items.append(
                OverlappingCompanyItem(
                    company_name=company_names[c_key],
                    company_isin=company_isins[c_key],
                    holding_funds=[occ[0] for occ in occurrences],
                    total_exposure_value=tot_exp,
                    duplicate_exposure_value=dup_exp,
                )
            )

    # Sort overlapping companies by duplicate value descending
    overlapping_items.sort(key=lambda x: x.duplicate_exposure_value, reverse=True)

    overlap_pct = (
        (total_overlapping_exposure / total_mf_val * Decimal("100"))
        if total_mf_val > Decimal("0")
        else Decimal("0")
    )

    annual_bleed = total_reg_bleed + estimated_potential_dup_cost

    # Compounded opportunity loss projections for 5, 10, 15, 20 years
    projections = [
        {"years": yr, "loss_rupees": calculate_compounded_loss(annual_bleed, cagr_rate, yr)}
        for yr in (5, 10, 15, 20)
    ]

    return DuplicateFeeAnalysisResult(
        total_mf_value=float(total_mf_val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        total_actual_ter_cost=float(total_actual_ter.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        total_regular_commission_bleed=float(total_reg_bleed.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        estimated_potential_duplicate_cost=float(estimated_potential_dup_cost.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        total_annual_bleed_amount=float(annual_bleed.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        overlap_percentage=float(overlap_pct.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        overlapping_companies_count=len(overlapping_items),
        top_overlapping_companies=[
            {
                "company_name": item.company_name,
                "isin": item.company_isin,
                "holding_funds": item.holding_funds,
                "total_exposure_value": float(item.total_exposure_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
                "duplicate_exposure_value": float(item.duplicate_exposure_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
            }
            for item in overlapping_items[:10]
        ],
        fund_fee_breakdown=[
            {
                "fund_name": f.fund_name,
                "fund_isin": f.fund_isin,
                "fund_value": float(f.fund_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
                "plan_type": f.plan_type,
                "ter_percentage": float(f.ter_percentage.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)) if f.ter_percentage is not None else None,
                "is_ter_available": f.is_ter_available,
                "annual_actual_cost": float(f.annual_actual_cost.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)) if f.annual_actual_cost is not None else None,
                "regular_commission_bleed": float(f.regular_commission_bleed.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)) if f.regular_commission_bleed is not None else None,
            }
            for f in fund_details
        ],
        compounded_projections=projections,
        cagr_compounding_rate=float((cagr_rate * Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        ter_data_missing_funds_count=missing_ter_count,
    )
