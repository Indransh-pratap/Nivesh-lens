from datetime import date, timedelta
from decimal import Decimal
import logging
from sqlalchemy.orm import Session

from app.models.market_data import (
    Benchmark,
    BenchmarkPrice,
    Company,
    CompanyGroup,
    CompanyGroupMembership,
    FundScheme,
    FundNAVHistory,
    SchemeHolding,
)

logger = logging.getLogger(__name__)

def seed_market_baseline(db: Session) -> None:
    """
    Seeds baseline benchmarks, company conglomerate groups, popular mutual fund schemes,
    historical benchmark prices (covering 2008, 2020, 2022 scenarios), and look-through scheme holdings.
    """
    # Fast check: if market baseline data already seeded with 3Y+ NAV history in this DB session, skip
    three_yr_ago = date.today() - timedelta(days=1000)
    if (
        db.query(FundScheme).filter(FundScheme.scheme_code == "120716").first() is not None
        and db.query(CompanyGroup).first() is not None
        and db.query(BenchmarkPrice).first() is not None
        and db.query(FundNAVHistory).filter(FundNAVHistory.nav_date <= three_yr_ago).count() >= 10
    ):
        return
    # 1. Seed Benchmarks
    benchmarks_data = [
        ("NIFTY_50", "NIFTY 50", "^NSEI"),
        ("NIFTY_500", "NIFTY 500", "^NSEI500"),
        ("SENSEX", "BSE SENSEX", "^BSESN"),
    ]
    for b_id, name, symbol in benchmarks_data:
        bm = db.query(Benchmark).filter(Benchmark.id == b_id).first()
        if not bm:
            db.add(Benchmark(id=b_id, name=name, index_symbol=symbol))
    db.commit()

    # Seed Benchmark Prices over key historical periods
    # Historical crash return multipliers for key periods:
    # 2008 Crisis: ~-55% drop (2007-10 to 2009-03)
    # 2020 COVID: ~-38% drop (2020-01-15 to 2020-03-23)
    # 2022 Bear: ~-15% drop (2021-10-18 to 2022-06-17)
    
    dates_and_prices: list[tuple[str, date, Decimal]] = []
    
    # 2020 Covid Scenario baseline
    start_2020 = date(2020, 1, 15)
    end_2020 = date(2020, 3, 23)
    curr = start_2020
    base_nifty = Decimal("12300.00")
    total_days = (end_2020 - start_2020).days
    while curr <= end_2020:
        elapsed = (curr - start_2020).days
        # COVID crash simulation curve: drops down to ~7600
        factor = Decimal("1.0") - (Decimal(elapsed) / Decimal(total_days)) * Decimal("0.38")
        val = (base_nifty * factor).quantize(Decimal("0.01"))
        dates_and_prices.append(("NIFTY_50", curr, val))
        dates_and_prices.append(("NIFTY_500", curr, (val * Decimal("0.8")).quantize(Decimal("0.01"))))
        curr += timedelta(days=1)

    # 2008 Crisis Scenario baseline
    start_2008 = date(2007, 10, 1)
    end_2008 = date(2009, 3, 9)
    curr = start_2008
    base_nifty_2008 = Decimal("6200.00")
    total_days_08 = (end_2008 - start_2008).days
    while curr <= end_2008:
        elapsed = (curr - start_2008).days
        factor = Decimal("1.0") - (Decimal(elapsed) / Decimal(total_days_08)) * Decimal("0.55")
        val = (base_nifty_2008 * factor).quantize(Decimal("0.01"))
        dates_and_prices.append(("NIFTY_50", curr, val))
        dates_and_prices.append(("NIFTY_500", curr, (val * Decimal("0.8")).quantize(Decimal("0.01"))))
        curr += timedelta(days=5)

    # 2022 Bear Market baseline
    start_2022 = date(2021, 10, 18)
    end_2022 = date(2022, 6, 17)
    curr = start_2022
    base_nifty_2022 = Decimal("18400.00")
    total_days_22 = (end_2022 - start_2022).days
    while curr <= end_2022:
        elapsed = (curr - start_2022).days
        factor = Decimal("1.0") - (Decimal(elapsed) / Decimal(total_days_22)) * Decimal("0.16")
        val = (base_nifty_2022 * factor).quantize(Decimal("0.01"))
        dates_and_prices.append(("NIFTY_50", curr, val))
        dates_and_prices.append(("NIFTY_500", curr, (val * Decimal("0.8")).quantize(Decimal("0.01"))))
        curr += timedelta(days=3)

    existing_bps = set(
        db.query(BenchmarkPrice.benchmark_id, BenchmarkPrice.price_date).all()
    )
    new_bps = [
        BenchmarkPrice(benchmark_id=bm_id, price_date=p_date, value=val)
        for bm_id, p_date, val in dates_and_prices
        if (bm_id, p_date) not in existing_bps
    ]
    if new_bps:
        db.bulk_save_objects(new_bps)
        db.commit()

    # 2. Seed Conglomerate Groups & Companies
    groups_def = [
        ("Tata Group", "Tata Sons conglomerate companies"),
        ("Reliance Group", "Mukesh Ambani Reliance Group"),
        ("HDFC Group", "HDFC Financial & Banking Services"),
        ("Adani Group", "Adani Infrastructure & Energy"),
        ("Mahindra Group", "Mahindra & Mahindra Group"),
        ("Bajaj Group", "Bajaj Financial & Auto Group"),
        ("AV Birla Group", "Aditya Birla Group"),
        ("L&T Group", "Larsen & Toubro Group"),
    ]

    group_map = {}
    for g_name, g_desc in groups_def:
        g = db.query(CompanyGroup).filter(CompanyGroup.name == g_name).first()
        if not g:
            g = CompanyGroup(name=g_name, description=g_desc)
            db.add(g)
            db.commit()
            db.refresh(g)
        group_map[g_name] = g

    companies_def = [
        # Tata Group
        ("Tata Consultancy Services", "INE467B01029", "TCS", "IT", "Tata Group"),
        ("Tata Motors", "INE155A01022", "TATAMOTORS", "Automobile", "Tata Group"),
        ("Tata Steel", "INE081A01020", "TATASTEEL", "Metals", "Tata Group"),
        ("Tata Power", "INE245A01021", "TATAPOWER", "Power", "Tata Group"),
        ("Titan Company", "INE280A01028", "TITAN", "Consumer Goods", "Tata Group"),
        ("Tata Consumer Products", "INE192A01025", "TATACONSUM", "FMCG", "Tata Group"),
        # Reliance Group
        ("Reliance Industries", "INE002A01018", "RELIANCE", "Oil & Gas / Retail / Telecom", "Reliance Group"),
        ("Jio Financial Services", "INE0BF001001", "JIOFIN", "Financial Services", "Reliance Group"),
        # HDFC Group
        ("HDFC Bank", "INE040A01034", "HDFCBANK", "Banking", "HDFC Group"),
        ("HDFC Life Insurance", "INE795G01014", "HDFCLIFE", "Insurance", "HDFC Group"),
        ("HDFC Asset Management", "INE127D01025", "HDFCAMC", "Financial Services", "HDFC Group"),
        # Adani Group
        ("Adani Enterprises", "INE423A01024", "ADANIENT", "Metals & Mining", "Adani Group"),
        ("Adani Ports & SEZ", "INE742F01042", "ADANIPORTS", "Infrastructure", "Adani Group"),
        ("Adani Green Energy", "INE364U01010", "ADANIGREEN", "Power", "Adani Group"),
        ("Adani Power", "INE814H01011", "ADANIPOWER", "Power", "Adani Group"),
        # Mahindra Group
        ("Mahindra & Mahindra", "INE101A01026", "M&M", "Automobile", "Mahindra Group"),
        ("Tech Mahindra", "INE669C01036", "TECHM", "IT", "Mahindra Group"),
        # Bajaj Group
        ("Bajaj Finance", "INE296A01024", "BAJFINANCE", "NBFC", "Bajaj Group"),
        ("Bajaj Finserv", "INE918I01026", "BAJAJFINSV", "Financial Services", "Bajaj Group"),
        ("Bajaj Auto", "INE917I01010", "BAJAJ-AUTO", "Automobile", "Bajaj Group"),
        # AV Birla Group
        ("UltraTech Cement", "INE481G01011", "ULTRACEMCO", "Cement", "AV Birla Group"),
        ("Grasim Industries", "INE047A01021", "GRASIM", "Chemicals & Textiles", "AV Birla Group"),
        ("Hindalco Industries", "INE038A01020", "HINDALCO", "Metals", "AV Birla Group"),
        # L&T Group
        ("Larsen & Toubro", "INE018A01030", "LT", "Engineering & Infra", "L&T Group"),
        ("LTIMindtree", "INE214T01019", "LTIM", "IT", "L&T Group"),
        # Standalone Majors (NO_PARENT_GROUP)
        ("Infosys", "INE009A01021", "INFY", "IT", None),
        ("ICICI Bank", "INE090A01021", "ICICIBANK", "Banking", None),
        ("Axis Bank", "INE238A01034", "AXISBANK", "Banking", None),
        ("Bharti Airtel", "INE397D01024", "BHARTIARTL", "Telecom", None),
        ("ITC Limited", "INE154A01025", "ITC", "FMCG", None),
        ("Hindustan Unilever", "INE030A01027", "HINDUNILVR", "FMCG", None),
        ("State Bank of India", "INE062A01020", "SBIN", "Banking", None),
        ("Maruti Suzuki", "INE585B01010", "MARUTI", "Automobile", None),
        ("Sun Pharmaceutical", "INE044A01036", "SUNPHARMA", "Pharma", None),
    ]

    existing_companies = {c.name: c for c in db.query(Company).all()}
    for c_name, isin, ticker, sector, g_name in companies_def:
        if c_name not in existing_companies:
            c = Company(name=c_name, isin=isin, ticker=ticker, sector=sector)
            db.add(c)
            db.commit()
            db.refresh(c)
            existing_companies[c_name] = c
        else:
            c = existing_companies[c_name]
        if g_name and g_name in group_map:
            grp = group_map[g_name]
            m = db.query(CompanyGroupMembership).filter(CompanyGroupMembership.company_id == c.id).first()
            if not m:
                db.add(CompanyGroupMembership(company_id=c.id, group_id=grp.id))
    db.commit()

    # 3. Seed Fund Schemes & Holdings Disclosures
    schemes_def = [
        ("100033", "Parag Parikh Flexi Cap Fund - Direct Plan - Growth", "INF879O01015", "PPFAS Mutual Fund", "Flexi Cap", Decimal("0.0055"), "NIFTY_500"),
        ("102594", "HDFC Top 100 Fund - Direct Plan - Growth", "INF179K01BE2", "HDFC Mutual Fund", "Large Cap", Decimal("0.0105"), "NIFTY_50"),
        ("119598", "SBI Bluechip Fund - Direct Plan - Growth", "INF200K01VD3", "SBI Mutual Fund", "Large Cap", Decimal("0.0085"), "NIFTY_50"),
        ("120503", "Axis Small Cap Fund - Direct Plan - Growth", "INF846K01EW2", "Axis Mutual Fund", "Small Cap", Decimal("0.0052"), "NIFTY_500"),
        ("118834", "Mirae Asset Large Cap Fund - Direct Plan - Growth", "INF769K01169", "Mirae Asset Mutual Fund", "Large Cap", Decimal("0.0054"), "NIFTY_50"),
        ("119775", "Nippon India Small Cap Fund - Direct Plan - Growth", "INF204KB1882", "Nippon India Mutual Fund", "Small Cap", Decimal("0.0068"), "NIFTY_500"),
        # Popular CAS imported schemes
        ("120716", "UTI Nifty 50 Index Fund - Direct - Growth", "INF209K01VD8", "UTI Mutual Fund", "Index Fund", Decimal("0.0020"), "NIFTY_50"),
        ("120166", "Kotak Emerging Equity Fund - Direct - Growth", "INF204K01MK4", "Kotak Mahindra Mutual Fund", "Mid Cap", Decimal("0.0048"), "NIFTY_500"),
        ("122639", "Parag Parikh Flexi Cap Fund - Direct - Growth", "INF082J01029", "PPFAS Mutual Fund", "Flexi Cap", Decimal("0.0055"), "NIFTY_500"),
        ("118989", "HDFC Flexi Cap Fund - Direct Plan - Growth", "INF179K01VY8", "HDFC Mutual Fund", "Flexi Cap", Decimal("0.0078"), "NIFTY_500"),
        ("118955", "HDFC Balanced Advantage Fund - Direct Plan - Growth", "INF179K01XQ2", "HDFC Mutual Fund", "Hybrid", Decimal("0.0072"), "NIFTY_50"),
        ("120586", "ICICI Prudential Bluechip Fund - Direct Plan - Growth", "INF109K01VQ1", "ICICI Prudential Mutual Fund", "Large Cap", Decimal("0.0090"), "NIFTY_50"),
        ("120594", "ICICI Prudential Technology Fund - Direct Plan - Growth", "INF109K01XG8", "ICICI Prudential Mutual Fund", "Sectoral", Decimal("0.0095"), "NIFTY_500"),
        ("119607", "SBI Contra Fund - Direct Plan - Growth", "INF200K01VB0", "SBI Mutual Fund", "Contra", Decimal("0.0064"), "NIFTY_500"),
        ("120505", "Axis Flexi Cap Fund - Direct - Growth", "INF247L01AA5", "Axis Mutual Fund", "Flexi Cap", Decimal("0.0058"), "NIFTY_500"),
    ]

    scheme_map = {}
    for code, name, isin, amc, cat, exp, bm in schemes_def:
        s = db.query(FundScheme).filter(FundScheme.scheme_code == code).first()
        if not s and isin:
            s = db.query(FundScheme).filter(FundScheme.isin == isin).first()
        if not s:
            s = FundScheme(scheme_code=code, scheme_name=name, isin=isin, amc_name=amc, category=cat, expense_ratio=exp, benchmark_id=bm)
            db.add(s)
            db.commit()
            db.refresh(s)
        scheme_map[code] = s

    # Seed NAV history for correlation, returns, and swap analysis over past ~4 years (~1,100 trading days)
    today = date.today()
    for code, s in scheme_map.items():
        base_nav = (
            Decimal("45.00") if "Flexi" in s.scheme_name
            else Decimal("185.00") if "Index" in s.scheme_name or "Nifty" in s.scheme_name
            else Decimal("85.00") if "Large" in s.scheme_name or "Top" in s.scheme_name
            else Decimal("128.00") if "Emerging" in s.scheme_name
            else Decimal("110.00") if "Small" in s.scheme_name
            else Decimal("75.00")
        )
        existing_dates = set(
            p[0] for p in db.query(FundNAVHistory.nav_date).filter(FundNAVHistory.scheme_id == s.id).all()
        )
        oldest_existing = min(existing_dates) if existing_dates else None
        # If no history or history does not cover at least 3 years, seed extended historical window
        if not oldest_existing or oldest_existing > today - timedelta(days=1000):
            nav_objects = []
            code_hash = sum(ord(c) for c in code)
            annual_rate = (
                0.20 if "Emerging" in s.scheme_name or "Mid" in s.scheme_name
                else 0.22 if "Small" in s.scheme_name
                else 0.16 if "Flexi" in s.scheme_name
                else 0.13 if "Index" in s.scheme_name or "Nifty" in s.scheme_name or "Bluechip" in s.scheme_name or "Top" in s.scheme_name
                else 0.11 if "Balanced" in s.scheme_name or "Hybrid" in s.scheme_name
                else 0.14
            )
            total_days = 1500  # ~4.1 years
            for d_offset in range(total_days, -1, -1):
                d = today - timedelta(days=d_offset)
                if d.weekday() >= 5 or d in existing_dates:  # skip weekends & already existing dates
                    continue
                # Compounded historical discount curve back from today
                cum_discount = (1.0 + annual_rate) ** (-d_offset / 365.25)
                # Deterministic market oscillation
                noise = 1.0 + (((d_offset * 7 + code_hash) % 101 - 50) / 1000.0) * 0.02
                nav_val = (base_nav * Decimal(str(round(cum_discount * noise, 4)))).quantize(Decimal("0.0001"))
                nav_objects.append(FundNAVHistory(scheme_id=s.id, nav_date=d, nav=nav_val))
            if nav_objects:
                db.bulk_save_objects(nav_objects)
    db.commit()

    # Seed Look-through Holdings Disclosures for Schemes
    as_of = date(today.year, today.month, 1)
    holdings_data = {
        "100033": [
            ("HDFC Bank", "INE040A01034", "Banking", Decimal("8.20")),
            ("ICICI Bank", "INE090A01021", "Banking", Decimal("7.50")),
            ("Tata Consultancy Services", "INE467B01029", "IT", Decimal("6.10")),
            ("Reliance Industries", "INE002A01018", "Oil & Gas", Decimal("5.80")),
            ("Axis Bank", "INE238A01034", "Banking", Decimal("4.30")),
            ("ITC Limited", "INE154A01025", "FMCG", Decimal("4.10")),
            ("Larsen & Toubro", "INE018A01030", "Engineering", Decimal("3.90")),
            ("Tata Motors", "INE155A01022", "Automobile", Decimal("3.50")),
            ("Bajaj Finance", "INE296A01024", "NBFC", Decimal("3.20")),
            ("Infosys", "INE009A01021", "IT", Decimal("3.00")),
        ],
        "122639": [
            ("HDFC Bank", "INE040A01034", "Banking", Decimal("8.20")),
            ("ICICI Bank", "INE090A01021", "Banking", Decimal("7.50")),
            ("Tata Consultancy Services", "INE467B01029", "IT", Decimal("6.10")),
            ("Reliance Industries", "INE002A01018", "Oil & Gas", Decimal("5.80")),
            ("Axis Bank", "INE238A01034", "Banking", Decimal("4.30")),
            ("ITC Limited", "INE154A01025", "FMCG", Decimal("4.10")),
            ("Larsen & Toubro", "INE018A01030", "Engineering", Decimal("3.90")),
            ("Tata Motors", "INE155A01022", "Automobile", Decimal("3.50")),
            ("Bajaj Finance", "INE296A01024", "NBFC", Decimal("3.20")),
            ("Infosys", "INE009A01021", "IT", Decimal("3.00")),
        ],
        "102594": [
            ("ICICI Bank", "INE090A01021", "Banking", Decimal("9.50")),
            ("HDFC Bank", "INE040A01034", "Banking", Decimal("9.10")),
            ("Reliance Industries", "INE002A01018", "Oil & Gas", Decimal("8.40")),
            ("Infosys", "INE009A01021", "IT", Decimal("7.20")),
            ("Larsen & Toubro", "INE018A01030", "Engineering", Decimal("5.60")),
            ("State Bank of India", "INE062A01020", "Banking", Decimal("4.80")),
            ("Tata Consultancy Services", "INE467B01029", "IT", Decimal("4.20")),
            ("Bharti Airtel", "INE397D01024", "Telecom", Decimal("3.90")),
            ("Titan Company", "INE280A01028", "Consumer Goods", Decimal("3.10")),
        ],
        "119598": [
            ("ICICI Bank", "INE090A01021", "Banking", Decimal("8.80")),
            ("HDFC Bank", "INE040A01034", "Banking", Decimal("8.50")),
            ("Reliance Industries", "INE002A01018", "Oil & Gas", Decimal("7.90")),
            ("Infosys", "INE009A01021", "IT", Decimal("6.40")),
            ("Larsen & Toubro", "INE018A01030", "Engineering", Decimal("5.10")),
            ("ITC Limited", "INE154A01025", "FMCG", Decimal("4.50")),
            ("Tata Motors", "INE155A01022", "Automobile", Decimal("4.20")),
            ("Mahindra & Mahindra", "INE101A01026", "Automobile", Decimal("3.80")),
        ],
        "118834": [
            ("HDFC Bank", "INE040A01034", "Banking", Decimal("9.15")),
            ("ICICI Bank", "INE090A01021", "Banking", Decimal("7.85")),
            ("Reliance Industries", "INE002A01018", "Oil & Gas", Decimal("6.90")),
            ("Infosys", "INE009A01021", "IT", Decimal("5.75")),
            ("Tata Consultancy Services", "INE467B01029", "IT", Decimal("4.80")),
            ("Axis Bank", "INE238A01034", "Banking", Decimal("3.95")),
            ("Larsen & Toubro", "INE018A01030", "Engineering", Decimal("3.60")),
            ("Bharti Airtel", "INE397D01024", "Telecom", Decimal("3.40")),
            ("State Bank of India", "INE062A01020", "Banking", Decimal("3.10")),
            ("ITC Limited", "INE154A01025", "FMCG", Decimal("2.80")),
        ],
        "120716": [
            ("HDFC Bank", "INE040A01034", "Banking", Decimal("11.50")),
            ("Reliance Industries", "INE002A01018", "Oil & Gas", Decimal("9.80")),
            ("ICICI Bank", "INE090A01021", "Banking", Decimal("7.90")),
            ("Infosys", "INE009A01021", "IT", Decimal("6.20")),
            ("Tata Consultancy Services", "INE467B01029", "IT", Decimal("4.10")),
            ("ITC Limited", "INE154A01025", "FMCG", Decimal("3.80")),
            ("Larsen & Toubro", "INE018A01030", "Engineering", Decimal("3.60")),
            ("Axis Bank", "INE238A01034", "Banking", Decimal("3.20")),
        ],
        "120166": [
            ("Supreme Industries", "INE423A01024", "Plastics", Decimal("4.20")),
            ("Persistent Systems", "INE262H01013", "IT", Decimal("3.90")),
            ("Schaeffler India", "INE513A01022", "Auto Components", Decimal("3.50")),
            ("Cummins India", "INE299A01018", "Engineering", Decimal("3.40")),
            ("Solar Industries", "INE343H01029", "Chemicals", Decimal("3.10")),
        ],
        "118989": [
            ("ICICI Bank", "INE090A01021", "Banking", Decimal("8.80")),
            ("HDFC Bank", "INE040A01034", "Banking", Decimal("8.20")),
            ("Cipla", "INE059A01026", "Pharma", Decimal("5.50")),
            ("HCL Technologies", "INE860A01027", "IT", Decimal("4.80")),
            ("State Bank of India", "INE062A01020", "Banking", Decimal("4.50")),
            ("Reliance Industries", "INE002A01018", "Oil & Gas", Decimal("4.10")),
        ],
        "118955": [
            ("HDFC Bank", "INE040A01034", "Banking", Decimal("7.20")),
            ("ICICI Bank", "INE090A01021", "Banking", Decimal("6.50")),
            ("ITC Limited", "INE154A01025", "FMCG", Decimal("4.20")),
            ("Coal India", "INE522F01014", "Mining", Decimal("3.80")),
            ("Reliance Industries", "INE002A01018", "Oil & Gas", Decimal("3.50")),
        ],
        "119607": [
            ("State Bank of India", "INE062A01020", "Banking", Decimal("4.50")),
            ("GAIL India", "INE129A01019", "Oil & Gas", Decimal("3.80")),
            ("Cognizant", "INE009A01021", "IT", Decimal("3.20")),
            ("HDFC Bank", "INE040A01034", "Banking", Decimal("3.00")),
        ],
        "120586": [
            ("ICICI Bank", "INE090A01021", "Banking", Decimal("9.80")),
            ("Reliance Industries", "INE002A01018", "Oil & Gas", Decimal("8.90")),
            ("HDFC Bank", "INE040A01034", "Banking", Decimal("8.10")),
            ("Infosys", "INE009A01021", "IT", Decimal("6.50")),
            ("Larsen & Toubro", "INE018A01030", "Engineering", Decimal("5.20")),
        ],
        "120503": [
            ("Galaxy Surfactants", "INE600K01018", "Chemicals", Decimal("4.10")),
            ("Krishna Institute", "INE278Y01012", "Healthcare", Decimal("3.80")),
            ("Narayana Hrudayalaya", "INE410P01024", "Healthcare", Decimal("3.50")),
            ("Brigade Enterprises", "INE791I01019", "Real Estate", Decimal("3.20")),
        ],
    }

    for code, h_list in holdings_data.items():
        if code in scheme_map:
            s = scheme_map[code]
            for comp_name, isin, sector, weight in h_list:
                exists = db.query(SchemeHolding).filter(
                    SchemeHolding.scheme_id == s.id,
                    SchemeHolding.as_of_date == as_of,
                    SchemeHolding.company_name == comp_name
                ).first()
                if not exists:
                    db.add(SchemeHolding(scheme_id=s.id, as_of_date=as_of, company_name=comp_name, company_isin=isin, sector=sector, weight_percentage=weight))
    db.commit()
    logger.info("Market baseline data seeded successfully.")
