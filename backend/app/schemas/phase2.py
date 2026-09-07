from pydantic import BaseModel, Field


class StressTestRunRequest(BaseModel):
    scenario_id: str = Field(default="COVID_2020", description="Scenario ID (COVID_2020, CRISIS_2008, BEAR_2022)")


class StressTestResponse(BaseModel):
    scenario: str
    scenario_name: str
    description: str
    starting_value: float
    estimated_loss: float
    loss_percent: float
    ending_value: float
    data_coverage: float
    missing_assets: list[str]


class FundSwapRequest(BaseModel):
    target_holding_id: str = Field(..., description="Holding ID or target fund name to be replaced")
    replacement_scheme_code: str = Field(..., description="Scheme code of replacement fund")


class FundSwapComparison(BaseModel):
    score: int
    hhi: float
    average_ter: float


class FundSwapDelta(BaseModel):
    score: int
    hhi: float
    average_ter: float


class FundSwapResponse(BaseModel):
    target_holding: str
    replacement_scheme: str
    before: FundSwapComparison
    after: FundSwapComparison
    delta: FundSwapDelta
    disclaimer: str


class CorrelationPair(BaseModel):
    fund_a: str
    fund_b: str
    correlation: float
    classification: str


class CorrelationThresholds(BaseModel):
    high: float
    medium: float


class CorrelationResponse(BaseModel):
    funds: list[str]
    matrix: list[list[float]]
    pairs: list[CorrelationPair]
    thresholds: CorrelationThresholds


class BenchmarkMetadata(BaseModel):
    id: str
    name: str
    description: str
    sample_size: str
    methodology: str
    as_of_date: str


class AssetAllocationComparison(BaseModel):
    portfolio_equity: float
    benchmark_equity: float
    portfolio_debt: float
    benchmark_debt: float
    portfolio_cash: float
    benchmark_cash: float


class BenchmarkResponse(BaseModel):
    portfolio_hhi: float
    reference_hhi: float
    relative_position: str
    largest_company_exposure: float
    reference_largest_company: float
    equity_concentration: float
    reference_equity_concentration: float
    holdings_count: int
    reference_holdings_count: int
    coverage_source: str
    # Phase 2 Feature 4 enhancements
    benchmark_id: str = "RETAIL_BASELINE"
    benchmark_name: str = "Indian Retail Investor Baseline (NIFTY 500 & AMFI Multi-Asset)"
    methodology: str = "Composite index constructed from NIFTY 500 and AMFI retail asset allocation dataset."
    sample_size: str = "Aggregated across AMFI retail mutual fund disclosures and top 500 NSE securities"
    as_of_date: str = "2026-03-31"
    asset_allocation: AssetAllocationComparison | None = None
    diversification_assessment: str = "Portfolio concentration aligns with standard market benchmarks."
    available_benchmarks: list[BenchmarkMetadata] = []
    disclaimer: str = "Comparative benchmarks are for informational purposes only and do not constitute investment advice."


class GroupCompanyItem(BaseModel):
    company_name: str
    isin: str | None = None
    ticker: str | None = None
    direct_value: float = 0.0
    direct_percent: float = 0.0
    indirect_value: float = 0.0
    indirect_percent: float = 0.0
    total_value: float = 0.0
    total_percent: float = 0.0


class GroupExposureItem(BaseModel):
    group_name: str
    exposure_value: float
    exposure_percentage: float
    # Phase 2 Feature 5 enhancements
    alert_level: str = "LOW"  # LOW, MODERATE, HIGH
    description: str | None = None
    companies_count: int = 0
    companies: list[GroupCompanyItem] = []


class GroupExposureResponse(BaseModel):
    groups: list[GroupExposureItem]
    unmapped_percentage: float
    total_value: float
    # Phase 2 Feature 5 enhancements
    thresholds: dict[str, float] = {"moderate": 15.0, "high": 25.0}
    high_exposure_groups_count: int = 0
    moderate_exposure_groups_count: int = 0
    disclaimer: str = "Conglomerate exposure combines direct stock holdings and indirect look-through holdings from mutual funds."


class SIPFactor(BaseModel):
    name: str
    impact: int
    category: str = "GENERAL"  # EXPENSE, OVERLAP, PERFORMANCE, DISCIPLINE


class SIPAlternativeCandidate(BaseModel):
    scheme_code: str
    scheme_name: str
    isin: str | None = None
    category: str
    amc_name: str | None = None
    expense_ratio: float
    expense_ratio_diff: float
    estimated_annual_savings: float
    consistency_score: int


class SIPHealthItem(BaseModel):
    holding_id: str
    fund_name: str
    monthly_amount: float
    score: int
    rating: str
    expense_ratio: float
    factors: list[SIPFactor]
    # Phase 2 Feature 6 enhancements
    grade: str = "B"  # A, B, C, D
    status: str = "ACTIVE"  # ACTIVE, PAUSED, STOPPED, UNKNOWN
    tenure_months: int = 0
    category: str | None = None
    returns_1y: float | None = None
    returns_3y: float | None = None
    returns_5y: float | None = None
    returns_coverage: str = "INSUFFICIENT_DATA"  # FULL, PARTIAL, INSUFFICIENT_DATA
    overlap_score: float = 0.0
    candidate_alternatives: list[SIPAlternativeCandidate] = []


class SIPHealthResponse(BaseModel):
    overall_score: int
    overall_rating: str
    overall_grade: str = "B"  # A, B, C, D
    sips: list[SIPHealthItem]
    summary_factors: list[SIPFactor]
    active_sips_count: int = 0
    paused_sips_count: int = 0
    stopped_sips_count: int = 0
    total_monthly_commitment: float = 0.0
    disclaimer: str = "SIP Health evaluates historical expense ratios, drawdown, portfolio overlap, and benchmark consistency. Does not predict future returns."


class SIPSwitchSimulationRequest(BaseModel):
    target_holding_id: str = Field(..., description="Holding ID of current SIP fund")
    replacement_scheme_code: str = Field(..., description="Scheme code of replacement candidate")


class SIPSwitchSimulationResponse(BaseModel):
    target_fund_name: str
    replacement_fund_name: str
    current_expense_ratio: float
    replacement_expense_ratio: float
    ter_savings_percent: float
    estimated_annual_savings: float
    projected_5y_savings: float
    overlap_reduction_percent: float
    score_before: int
    score_after: int
    grade_before: str
    grade_after: str
    disclaimer: str = "Simulated comparison only. This does not execute any transactions or change active mandates with your AMC or broker."
