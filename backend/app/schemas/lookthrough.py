from pydantic import BaseModel, Field
from app.schemas.exposure import CompanyExposureItem


class MFLookthroughHoldingItem(BaseModel):
    company_name: str
    isin: str | None = None
    ticker: str | None = None
    sector: str | None = None
    weight_percent: float = Field(..., description="Percentage weight of company in mutual fund")
    exposure_value: float = Field(..., description="Indirect exposure value in currency units")
    quantity: float | None = None
    market_value: float | None = None


class MFLookthroughSchemeItem(BaseModel):
    scheme_name: str
    scheme_code: str | None = None
    scheme_isin: str | None = None
    user_value: float = Field(..., description="User's current holding value in this fund")
    lookthrough_available: bool = True
    as_of_date: str | None = None
    holdings: list[MFLookthroughHoldingItem] = []


class ContributingFundItem(BaseModel):
    fund_name: str
    fund_isin: str | None = None
    fund_value: float
    weight_percent: float
    exposure_value: float
    as_of_date: str | None = None


class IndirectCompanyExposureItem(BaseModel):
    company_id: str
    company_name: str
    isin: str | None = None
    ticker: str | None = None
    sector: str | None = None
    total_exposure_value: float
    total_exposure_percent: float
    contributing_funds: list[ContributingFundItem] = []


class LookThroughResponse(BaseModel):
    portfolio_id: str
    portfolio_value: float
    total_mf_value: float
    data_as_of: str | None = None
    mf_lookthrough_available: bool = True
    mutual_funds: list[MFLookthroughSchemeItem] = []
    companies: list[IndirectCompanyExposureItem] = []
    combined_companies: list[CompanyExposureItem] = []
