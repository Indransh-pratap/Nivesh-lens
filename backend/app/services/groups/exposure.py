from decimal import Decimal
import re
from sqlalchemy.orm import Session

from app.models.holding import Holding, AssetType
from app.models.market_data import Company, CompanyGroup, CompanyGroupMembership, SchemeHolding, FundScheme
from app.services.market_data.seed_data import seed_market_baseline


KNOWN_ALIASES_AND_SUBSIDIARIES: dict[str, str] = {
    # Tata
    "tata motors passenger vehicles": "Tata Group",
    "tata technologies": "Tata Group",
    "tata elxsi": "Tata Group",
    "trent": "Tata Group",
    "voltas": "Tata Group",
    # Reliance
    "reliance retail": "Reliance Group",
    "reliance jio": "Reliance Group",
    "jio financial": "Reliance Group",
    "network18": "Reliance Group",
    "tv18": "Reliance Group",
    # HDFC
    "hdfc limited": "HDFC Group",
    "housing development finance corporation": "HDFC Group",
    # Adani
    "adani total gas": "Adani Group",
    "adani wilmar": "Adani Group",
    "adani transmission": "Adani Group",
    "adani energy solutions": "Adani Group",
    "ambuja cements": "Adani Group",
    "acc limited": "Adani Group",
    # L&T
    "larsen & toubro infotech": "L&T Group",
    "lti": "L&T Group",
    "mindtree": "L&T Group",
    "l&t technology services": "L&T Group",
    "l&t finance": "L&T Group",
    # Mahindra
    "mahindra & mahindra financial": "Mahindra Group",
    "tech mahindra": "Mahindra Group",
    # Bajaj
    "bajaj finserv": "Bajaj Group",
    "bajaj finance": "Bajaj Group",
    "bajaj auto": "Bajaj Group",
    "bajaj holdings": "Bajaj Group",
    # AV Birla
    "aditya birla capital": "AV Birla Group",
    "aditya birla fashion": "AV Birla Group",
    "grasim": "AV Birla Group",
    "hindalco": "AV Birla Group",
    "ultratech": "AV Birla Group",
}


def calculate_group_exposure(
    db: Session,
    holdings: list[Holding],
    threshold_moderate: float = 15.0,
    threshold_high: float = 25.0,
) -> dict:
    """
    Calculates parent conglomerate / business group exposure by combining direct stock holdings
    and look-through mutual fund holdings.
    Resolves known aliases, subsidiaries, and mergers, and provides company-level drilldowns.
    """
    total_portfolio_val = sum(
        (Decimal(str(h.current_value)) for h in holdings if h.current_value is not None and Decimal(str(h.current_value)) > Decimal("0")),
        Decimal("0"),
    )
    if total_portfolio_val <= Decimal("0"):
        return {
            "groups": [],
            "unmapped_percentage": 100.0,
            "total_value": 0.0,
            "thresholds": {"moderate": threshold_moderate, "high": threshold_high},
            "high_exposure_groups_count": 0,
            "moderate_exposure_groups_count": 0,
            "disclaimer": "Conglomerate exposure combines direct stock holdings and indirect look-through holdings from mutual funds.",
        }

    # Ensure baseline company & group mappings exist
    seed_market_baseline(db)

    # Build company -> group mapping dictionary from database
    company_to_group: dict[str, str] = {}
    group_descriptions: dict[str, str] = {}
    company_info: dict[str, dict[str, str | None]] = {}

    all_groups = db.query(CompanyGroup).all()
    for g in all_groups:
        group_descriptions[g.name] = g.description or ""

    memberships = db.query(CompanyGroupMembership).all()
    for m in memberships:
        c = db.query(Company).filter(Company.id == m.company_id).first()
        g = db.query(CompanyGroup).filter(CompanyGroup.id == m.group_id).first()
        if c and g:
            company_to_group[c.name.lower()] = g.name
            company_info[c.name.lower()] = {"name": c.name, "isin": c.isin, "ticker": c.ticker}
            if c.isin:
                company_to_group[c.isin.lower()] = g.name
                company_info[c.isin.lower()] = {"name": c.name, "isin": c.isin, "ticker": c.ticker}
            if c.ticker:
                company_to_group[c.ticker.lower()] = g.name
                company_info[c.ticker.lower()] = {"name": c.name, "isin": c.isin, "ticker": c.ticker}

    def _match_group(name: str, isin: str | None = None, ticker: str | None = None) -> tuple[str | None, str]:
        """Returns (group_name or None, canonical_company_name)."""
        clean_name = name.strip()
        lower_name = clean_name.lower()
        clean_isin = isin.strip().lower() if isin else None
        clean_ticker = ticker.strip().lower() if ticker else None

        if clean_isin and clean_isin in company_to_group:
            info = company_info.get(clean_isin, {})
            return company_to_group[clean_isin], info.get("name") or clean_name

        if clean_ticker and clean_ticker in company_to_group:
            info = company_info.get(clean_ticker, {})
            return company_to_group[clean_ticker], info.get("name") or clean_name

        if lower_name in company_to_group:
            info = company_info.get(lower_name, {})
            return company_to_group[lower_name], info.get("name") or clean_name

        # Check aliases & subsidiaries dictionary
        for alias, g_name in KNOWN_ALIASES_AND_SUBSIDIARIES.items():
            if alias in lower_name:
                return g_name, clean_name

        # Check partial company name in DB
        for k, g_name in company_to_group.items():
            if len(k) >= 5 and (k in lower_name or lower_name in k):
                info = company_info.get(k, {})
                return g_name, info.get("name") or clean_name

        return None, clean_name

    # Structure: group_name -> { "total": Decimal, "companies": { company_key: { ... } } }
    group_data: dict[str, dict] = {}
    unmapped_val = Decimal("0")

    for h in holdings:
        if h.current_value is None or Decimal(str(h.current_value)) <= Decimal("0"):
            continue
        h_val = Decimal(str(h.current_value))

        if h.asset_type == AssetType.STOCK:
            matched_group, comp_name = _match_group(h.name, h.isin, getattr(h, "ticker", None))
            if matched_group:
                if matched_group not in group_data:
                    group_data[matched_group] = {"total": Decimal("0"), "companies": {}}
                group_data[matched_group]["total"] += h_val

                c_key = (h.isin or comp_name).lower()
                if c_key not in group_data[matched_group]["companies"]:
                    group_data[matched_group]["companies"][c_key] = {
                        "name": comp_name,
                        "isin": h.isin,
                        "ticker": getattr(h, "ticker", None),
                        "direct": Decimal("0"),
                        "indirect": Decimal("0"),
                    }
                group_data[matched_group]["companies"][c_key]["direct"] += h_val
            else:
                unmapped_val += h_val

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

                        matched_group, comp_name = _match_group(sh.company_name, sh.company_isin)
                        if matched_group:
                            if matched_group not in group_data:
                                group_data[matched_group] = {"total": Decimal("0"), "companies": {}}
                            group_data[matched_group]["total"] += sh_effective_val

                            c_key = (sh.company_isin or comp_name).lower()
                            if c_key not in group_data[matched_group]["companies"]:
                                group_data[matched_group]["companies"][c_key] = {
                                    "name": comp_name,
                                    "isin": sh.company_isin,
                                    "ticker": None,
                                    "direct": Decimal("0"),
                                    "indirect": Decimal("0"),
                                }
                            group_data[matched_group]["companies"][c_key]["indirect"] += sh_effective_val
                        else:
                            unmapped_val += sh_effective_val

            if not lookthrough_found:
                unmapped_val += h_val
        else:
            unmapped_val += h_val

    results = []
    high_count = 0
    mod_count = 0

    for grp_name, g_info in group_data.items():
        val = g_info["total"]
        pct = float((val / total_portfolio_val) * Decimal("100"))

        if pct >= threshold_high:
            alert = "HIGH"
            high_count += 1
        elif pct >= threshold_moderate:
            alert = "MODERATE"
            mod_count += 1
        else:
            alert = "LOW"

        # Build constituent companies list
        companies_list = []
        for c in g_info["companies"].values():
            c_dir = c["direct"]
            c_ind = c["indirect"]
            c_tot = c_dir + c_ind
            companies_list.append({
                "company_name": c["name"],
                "isin": c["isin"],
                "ticker": c["ticker"],
                "direct_value": round(float(c_dir), 2),
                "direct_percent": round(float((c_dir / total_portfolio_val) * Decimal("100")), 2),
                "indirect_value": round(float(c_ind), 2),
                "indirect_percent": round(float((c_ind / total_portfolio_val) * Decimal("100")), 2),
                "total_value": round(float(c_tot), 2),
                "total_percent": round(float((c_tot / total_portfolio_val) * Decimal("100")), 2),
            })

        companies_list.sort(key=lambda x: x["total_value"], reverse=True)

        results.append({
            "group_name": grp_name,
            "exposure_value": round(float(val), 2),
            "exposure_percentage": round(pct, 2),
            "alert_level": alert,
            "description": group_descriptions.get(grp_name, f"Conglomerate exposure for {grp_name}"),
            "companies_count": len(companies_list),
            "companies": companies_list,
        })

    results.sort(key=lambda x: x["exposure_percentage"], reverse=True)
    unmapped_pct = float((unmapped_val / total_portfolio_val) * Decimal("100")) if total_portfolio_val > Decimal("0") else 0.0

    return {
        "groups": results,
        "unmapped_percentage": round(min(100.0, max(0.0, unmapped_pct)), 2),
        "total_value": round(float(total_portfolio_val), 2),
        "thresholds": {"moderate": threshold_moderate, "high": threshold_high},
        "high_exposure_groups_count": high_count,
        "moderate_exposure_groups_count": mod_count,
        "disclaimer": "Conglomerate exposure combines direct stock holdings and indirect look-through holdings from mutual funds.",
    }

