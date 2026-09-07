from pydantic import BaseModel, Field


class ExposureSourceItem(BaseModel):
    type: str = Field(..., description="'direct' or 'mutual_fund'")
    holding_name: str | None = Field(default=None, description="Direct holding name")
    isin: str | None = Field(default=None, description="ISIN of direct holding or company")
    fund_name: str | None = Field(default=None, description="Mutual fund scheme name")
    fund_isin: str | None = Field(default=None, description="Mutual fund scheme ISIN")
    fund_value: float | None = Field(default=None, description="Total current value of the fund in portfolio")
    company_weight: float | None = Field(default=None, description="Weight percentage of company in fund")
    exposure_value: float = Field(..., description="Exposure value in currency units")
    value: float = Field(..., description="Value contribution to this company")
    as_of_date: str | None = Field(default=None, description="Portfolio disclosure date")


class CompanyExposureItem(BaseModel):
    company_id: str
    company_name: str
    isin: str | None = None
    ticker: str | None = None
    sector: str | None = None
    combined_value: float
    combined_percent: float
    direct_value: float
    direct_percent: float
    mutual_fund_value: float
    mutual_fund_percent: float
    sources: list[ExposureSourceItem] = []


class CompanyExposureResponse(BaseModel):
    portfolio_id: str
    portfolio_value: float
    data_as_of: str | None = None
    data_status: str = "RECENT"  # LIVE | RECENT | STALE | UNKNOWN
    mf_lookthrough_available: bool = True
    total_direct_value: float = 0.0
    total_mf_value: float = 0.0
    unmapped_value: float = 0.0
    unmapped_percent: float = 0.0
    cash_debt_value: float = 0.0
    cash_debt_percent: float = 0.0
    reconciled_total_value: float = 0.0
    reconciliation_difference: float = 0.0
    hhi_score: int | None = None
    hhi_classification: str | None = None
    companies: list[CompanyExposureItem] = []
