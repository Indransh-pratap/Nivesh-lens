from abc import ABC, abstractmethod
from datetime import date
from decimal import Decimal


class SchemeHoldingItem:
    def __init__(self, company_name: str, company_isin: str | None, sector: str | None, weight_percentage: Decimal):
        self.company_name = company_name
        self.company_isin = company_isin
        self.sector = sector
        self.weight_percentage = weight_percentage


class PortfolioDisclosureProvider(ABC):
    @abstractmethod
    def get_scheme_holdings(self, scheme_code: str, as_of_date: date | None = None) -> list[SchemeHoldingItem]:
        pass


class MockAMCDisclosureProvider(PortfolioDisclosureProvider):
    """
    Adapter for AMC portfolio holdings disclosures.
    """

    def get_scheme_holdings(self, scheme_code: str, as_of_date: date | None = None) -> list[SchemeHoldingItem]:
        # Implementation returns standard holdings for known schemes or empty list
        return []
