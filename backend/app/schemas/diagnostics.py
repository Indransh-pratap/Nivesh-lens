from decimal import Decimal
from pydantic import BaseModel


class DiagnosticResponse(BaseModel):
    portfolio_id: str
    total_value: Decimal
    diversification_score: dict
    concentration: dict
    top_company_exposures: list[dict]
    alerts: list[dict]
