from abc import ABC, abstractmethod
from datetime import date
from decimal import Decimal


class PricePoint:
    def __init__(self, price_date: date, price: Decimal):
        self.price_date = price_date
        self.price = price


class MarketDataProvider(ABC):
    @abstractmethod
    def get_price_history(self, security_id: str, start_date: date | None = None, end_date: date | None = None) -> list[PricePoint]:
        pass
