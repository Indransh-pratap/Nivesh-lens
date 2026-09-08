from app.services.ai.rag.models import DocumentMetadata
from app.services.ai.rag.store import KnowledgeVectorStore

_global_store: KnowledgeVectorStore | None = None


def get_knowledge_store() -> KnowledgeVectorStore:
    """Return the singleton knowledge store seeded with official regulatory and tax documents."""
    global _global_store
    if _global_store is None:
        _global_store = KnowledgeVectorStore()
        seed_official_knowledge(_global_store)
    return _global_store


def seed_official_knowledge(store: KnowledgeVectorStore) -> None:
    """Populate store with official SEBI, AMFI, and CBDT regulatory documents."""

    # 1. Indian Capital Gains Tax Regime (Budget 2024 amendments)
    tax_budget_2024 = (
        "Pursuant to the Finance Act 2024 (effective July 23, 2024):\n"
        "1. Equity Oriented Mutual Funds and Listed Equities:\n"
        "   - Long-Term Capital Gains (LTCG): Holding period exceeding 12 months. Taxed at 12.5% on gains "
        "exceeding the aggregate exemption limit of INR 1,25,000 per financial year (previously 10% above INR 1,00,000).\n"
        "   - Short-Term Capital Gains (STCG): Holding period of 12 months or less. Taxed at 20% (previously 15%).\n"
        "2. Specified Mutual Funds / Debt Funds (Section 50AA):\n"
        "   - Acquired on or after April 1, 2023 with equity exposure <= 35%: Treated as short-term capital gains "
        "irrespective of holding period and taxed at applicable income tax slab rates of the investor without indexation.\n"
        "3. Unlisted Equities and Other Assets:\n"
        "   - LTCG holding period reduced to 24 months, taxed at 12.5% without indexation.\n"
        "4. Securities Transaction Tax (STT) remains applicable on redemption of equity funds and sale of equity shares on recognized exchanges."
    )
    store.add_document(
        doc_id="CBDT_BUDGET_2024_CAPITAL_GAINS",
        text=tax_budget_2024,
        metadata=DocumentMetadata(
            source="MINISTRY_OF_FINANCE",
            title="Finance Act 2024 - Capital Gains Tax Amendments",
            url_or_reference="Gazette Notification No. 15 of 2024 / CBDT Circular 2024",
            publication_date="2024-07-23",
            effective_date="2024-07-23",
            retrieved_date="2026-03-31",
            document_type="TAX_STATUTE",
            authority="MINISTRY_OF_FINANCE",
            topic="TAXATION",
            is_superseded=False,
        ),
    )

    # 2. SEBI Mutual Fund Scheme Categorization (CIR/P/2017/114 & circulars)
    sebi_categorization = (
        "SEBI Master Circular for Mutual Funds - Scheme Categorization Rules:\n"
        "1. Large Cap Funds: Minimum investment in equity & equity-related instruments of large cap companies "
        "(1st to 100th company in terms of full market capitalization) shall be 80% of total assets.\n"
        "2. Mid Cap Funds: Minimum investment in equity of mid cap companies (101st to 250th company in full market cap) "
        "shall be 65% of total assets.\n"
        "3. Small Cap Funds: Minimum investment in equity of small cap companies (251st company onwards) shall be 65%.\n"
        "4. Multi Cap Funds: Minimum investment of 25% each in Large Cap, Mid Cap, and Small Cap stocks.\n"
        "5. Flexi Cap Funds: Minimum investment of 65% in equity and equity-related instruments with flexible allocation across market caps.\n"
        "6. Fund of Funds (FoF): An open ended fund of funds scheme investing minimum 95% of total assets in underlying funds."
    )
    store.add_document(
        doc_id="SEBI_CIR_2017_114_CATEGORIZATION",
        text=sebi_categorization,
        metadata=DocumentMetadata(
            source="SEBI",
            title="Categorization and Rationalization of Mutual Fund Schemes",
            url_or_reference="SEBI/HO/IMD/DF3/CIR/P/2017/114",
            publication_date="2017-10-06",
            effective_date="2018-06-01",
            retrieved_date="2026-03-31",
            document_type="CIRCULAR",
            authority="SEBI",
            topic="CATEGORIZATION",
            is_superseded=False,
        ),
    )

    # 3. AMFI Guidelines on TER and Direct vs Regular Plans
    amfi_ter = (
        "AMFI Best Practice Guidelines on Total Expense Ratio (TER):\n"
        "1. Direct Plans vs Regular Plans: Direct plans do not carry distributor commission/trail expenses. "
        "The difference between Regular Plan TER and Direct Plan TER reflects the distributor commission paid by the AMC.\n"
        "2. TER Limits (SEBI Mutual Fund Regulations Regulation 52):\n"
        "   - Equity schemes: Maximum 2.25% on first INR 500 Cr AUM, scaling down progressively with AUM growth.\n"
        "   - Debt schemes: Maximum 2.00% on first INR 500 Cr AUM.\n"
        "3. Transparency: AMCs must disclose daily scheme-level TER on AMFI website and AMC portals."
    )
    store.add_document(
        doc_id="AMFI_TER_DISCLOSURE_GUIDELINES",
        text=amfi_ter,
        metadata=DocumentMetadata(
            source="AMFI",
            title="AMFI Code of Conduct and Scheme Expense Disclosures",
            url_or_reference="AMFI/CIR/TER-REG-2023",
            publication_date="2023-04-01",
            effective_date="2023-04-01",
            retrieved_date="2026-03-31",
            document_type="CIRCULAR",
            authority="AMFI",
            topic="EXPENSES",
            is_superseded=False,
        ),
    )

    # 4. SEBI Nominee Declaration Requirements
    sebi_nominee = (
        "SEBI Mandate on Nomination in Mutual Funds and Demat Accounts:\n"
        "1. Requirement: All individual unit holders and demat account holders must either register a nominee "
        "or submit a formal opt-out declaration.\n"
        "2. Consequences: Folios and demat accounts failing to comply are subject to debit freezing for redemptions and transfers.\n"
        "3. Multiple Nominees: Investors may designate up to 3 nominees with specified percentage allocations summing to 100%."
    )
    store.add_document(
        doc_id="SEBI_NOMINEE_MANDATE_2023",
        text=sebi_nominee,
        metadata=DocumentMetadata(
            source="SEBI",
            title="Nomination Requirements for Mutual Fund Unit Holders and Demat Accounts",
            url_or_reference="SEBI/HO/MIRSD/POD-1/P/CIR/2023/158",
            publication_date="2023-09-26",
            effective_date="2024-06-30",
            retrieved_date="2026-03-31",
            document_type="CIRCULAR",
            authority="SEBI",
            topic="NOMINEE",
            is_superseded=False,
        ),
    )
