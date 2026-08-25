from abc import ABC, abstractmethod
from datetime import date
from decimal import Decimal


class BenchmarkValue:
    def __init__(self, price_date: date, value: Decimal):
        self.price_date = price_date
        self.value = value


class BenchmarkProvider(ABC):
    @abstractmethod
    def get_history(self, benchmark_id: str, start_date: date | None = None, end_date: date | None = None) -> list[BenchmarkValue]:
        pass
