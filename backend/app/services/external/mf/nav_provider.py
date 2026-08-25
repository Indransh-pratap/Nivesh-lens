from abc import ABC, abstractmethod
from datetime import date, datetime
from decimal import Decimal
import logging
import httpx

logger = logging.getLogger(__name__)


class NAVPoint:
    def __init__(self, nav_date: date, nav: Decimal):
        self.nav_date = nav_date
        self.nav = nav


class NAVProvider(ABC):
    @abstractmethod
    def get_history(self, scheme_code: str, start_date: date | None = None, end_date: date | None = None) -> list[NAVPoint]:
        pass


class MFAPINAVProvider(NAVProvider):
    """
    Ingests Indian Mutual Fund daily NAV series using public MFapi endpoints (or cached store).
    Endpoint: https://api.mfapi.in/mf/{scheme_code}
    """

    def __init__(self, base_url: str = "https://api.mfapi.in"):
        self.base_url = base_url.rstrip("/")

    def get_history(self, scheme_code: str, start_date: date | None = None, end_date: date | None = None) -> list[NAVPoint]:
        url = f"{self.base_url}/mf/{scheme_code}"
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(url)
                if response.status_code != 200:
                    logger.warning(f"MFAPI returned status {response.status_code} for scheme {scheme_code}")
                    return []
                data = response.json()
                data_points = data.get("data", [])
                results: list[NAVPoint] = []
                for item in data_points:
                    try:
                        # Date format in mfapi: "DD-MM-YYYY"
                        dt = datetime.strptime(item["date"], "%d-%m-%Y").date()
                        val = Decimal(str(item["nav"]))
                        if start_date and dt < start_date:
                            continue
                        if end_date and dt > end_date:
                            continue
                        results.append(NAVPoint(nav_date=dt, nav=val))
                    except (ValueError, KeyError):
                        continue
                # Sort ascending by date
                results.sort(key=lambda x: x.nav_date)
                return results
        except Exception as exc:
            logger.error(f"Error fetching NAV history from MFAPI for scheme {scheme_code}: {exc}")
            return []
