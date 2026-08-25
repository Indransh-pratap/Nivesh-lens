from datetime import date
from decimal import Decimal
from typing import TypedDict


class ScenarioDefinition(TypedDict):
    id: str
    name: str
    description: str
    start_date: date
    end_date: date
    benchmark_id: str
    default_equity_loss_pct: float


SCENARIOS: dict[str, ScenarioDefinition] = {
    "COVID_2020": {
        "id": "COVID_2020",
        "name": "2020 COVID Crash",
        "description": "Rapid market downturn following global pandemic declarations (Jan 2020 - Mar 2020)",
        "start_date": date(2020, 1, 15),
        "end_date": date(2020, 3, 23),
        "benchmark_id": "NIFTY_50",
        "default_equity_loss_pct": 38.0,
    },
    "CRISIS_2008": {
        "id": "CRISIS_2008",
        "name": "2008 Financial Crisis",
        "description": "Global credit freeze and major market recession (Oct 2007 - Mar 2009)",
        "start_date": date(2007, 10, 1),
        "end_date": date(2009, 3, 9),
        "benchmark_id": "NIFTY_50",
        "default_equity_loss_pct": 55.0,
    },
    "BEAR_2022": {
        "id": "BEAR_2022",
        "name": "2022 Bear Market",
        "description": "Rate hike cycle, global inflation pressure & tech selloff (Oct 2021 - Jun 2022)",
        "start_date": date(2021, 10, 18),
        "end_date": date(2022, 6, 17),
        "benchmark_id": "NIFTY_50",
        "default_equity_loss_pct": 16.0,
    },
}
