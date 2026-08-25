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


class GroupExposureItem(BaseModel):
    group_name: str
    exposure_value: float
    exposure_percentage: float


class GroupExposureResponse(BaseModel):
    groups: list[GroupExposureItem]
    unmapped_percentage: float
    total_value: float


class SIPFactor(BaseModel):
    name: str
    impact: int


class SIPHealthItem(BaseModel):
    holding_id: str
    fund_name: str
    monthly_amount: float
    score: int
    rating: str
    expense_ratio: float
    factors: list[SIPFactor]


class SIPHealthResponse(BaseModel):
    overall_score: int
    overall_rating: str
    sips: list[SIPHealthItem]
    summary_factors: list[SIPFactor]
    disclaimer: str
