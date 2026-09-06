from decimal import Decimal
import re
from sqlalchemy.orm import Session

from app.models.holding import Holding, AssetType
from app.models.market_data import Company, CompanyGroup, CompanyGroupMembership, SchemeHolding, FundScheme
from app.services.market_data.seed_data import seed_market_baseline


def calculate_group_exposure(db: Session, holdings: list[Holding]) -> dict:
    """
    Calculates parent group / conglomerate exposure by combining direct stock holdings
    and look-through mutual fund holdings.
    """
    total_portfolio_val = sum(Decimal(str(h.current_value)) for h in holdings)
    if total_portfolio_val <= Decimal("0"):
        return {"groups": [], "unmapped_percentage": 100.0, "total_value": 0.0}

    # Ensure baseline company & group mappings exist
    seed_market_baseline(db)

    # Build company -> group mapping dictionary
    company_to_group: dict[str, str] = {}
    memberships = db.query(CompanyGroupMembership).all()
    for m in memberships:
        c = db.query(Company).filter(Company.id == m.company_id).first()
        g = db.query(CompanyGroup).filter(CompanyGroup.id == m.group_id).first()
        if c and g:
            company_to_group[c.name.lower()] = g.name
            if c.isin:
                company_to_group[c.isin.lower()] = g.name
            if c.ticker:
                company_to_group[c.ticker.lower()] = g.name

    group_exposure_vals: dict[str, Decimal] = {}

    for h in holdings:
        h_val = Decimal(str(h.current_value))
        if h.asset_type == AssetType.STOCK:
            # Check direct stock holding match
            matched_group = None
            if h.isin and h.isin.lower() in company_to_group:
                matched_group = company_to_group[h.isin.lower()]
            elif getattr(h, "ticker", None) and str(h.ticker).lower() in company_to_group:
                matched_group = company_to_group[str(h.ticker).lower()]
            else:
                for k, g_name in company_to_group.items():
                    if k in h.name.lower():
                        matched_group = g_name
                        break
            
            grp_key = matched_group if matched_group else "NO_PARENT_GROUP"
            group_exposure_vals[grp_key] = group_exposure_vals.get(grp_key, Decimal("0")) + h_val

        elif h.asset_type == AssetType.MUTUAL_FUND:
            # Look-through scheme holdings
            scheme = None
            if h.isin:
                scheme = db.query(FundScheme).filter(FundScheme.isin == h.isin).first()
            if not scheme and h.name:
                cleaned = re.sub(r"^[A-Za-z0-9]+-", "", h.name).strip()
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

            lookthrough_found = False
            if scheme:
                s_holdings = db.query(SchemeHolding).filter(SchemeHolding.scheme_id == scheme.id).all()
                if s_holdings:
                    lookthrough_found = True
                    for sh in s_holdings:
                        sh_wt = Decimal(str(sh.weight_percentage)) / Decimal("100.0")
                        sh_effective_val = h_val * sh_wt
                        
                        sh_matched_group = None
                        if sh.company_isin and sh.company_isin.lower() in company_to_group:
                            sh_matched_group = company_to_group[sh.company_isin.lower()]
                        else:
                            for k, g_name in company_to_group.items():
                                if k in sh.company_name.lower():
                                    sh_matched_group = g_name
                                    break
                        grp_key = sh_matched_group if sh_matched_group else "NO_PARENT_GROUP"
                        group_exposure_vals[grp_key] = group_exposure_vals.get(grp_key, Decimal("0")) + sh_effective_val

            if not lookthrough_found:
                # If look-through data is absent, assign to UNKNOWN_GROUP or NO_PARENT_GROUP
                grp_key = "NO_PARENT_GROUP"
                group_exposure_vals[grp_key] = group_exposure_vals.get(grp_key, Decimal("0")) + h_val
        else:
            grp_key = "NO_PARENT_GROUP"
            group_exposure_vals[grp_key] = group_exposure_vals.get(grp_key, Decimal("0")) + h_val

    results = []
    unmapped_val = Decimal("0")

    for grp_name, val in group_exposure_vals.items():
        pct = float((val / total_portfolio_val) * Decimal("100"))
        if grp_name in ("NO_PARENT_GROUP", "UNKNOWN_GROUP"):
            unmapped_val += val
        else:
            results.append({
                "group_name": grp_name,
                "exposure_value": round(float(val), 2),
                "exposure_percentage": round(pct, 2),
            })

    results.sort(key=lambda x: x["exposure_percentage"], reverse=True)
    unmapped_pct = float((unmapped_val / total_portfolio_val) * Decimal("100")) if total_portfolio_val > 0 else 0.0

    return {
        "groups": results,
        "unmapped_percentage": round(unmapped_pct, 2),
        "total_value": round(float(total_portfolio_val), 2),
    }
