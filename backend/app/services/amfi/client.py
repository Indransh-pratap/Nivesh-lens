from dataclasses import dataclass
from datetime import date
from urllib.parse import urljoin

import httpx


@dataclass(frozen=True)
class AMFIClientConfig:
    base_url: str
    timeout_seconds: float = 20.0


class AMFIClient:
    """
    HTTP client for AMFI/AMC portfolio disclosure sources.

    The client is intentionally source-agnostic:
    AMFI's portfolio-disclosure page is dynamic, so the exact
    downloadable disclosure URL must be resolved separately.
    """

    def __init__(self, config: AMFIClientConfig):
        self.config = config

    def fetch(self, url: str) -> str:
        response = httpx.get(
            url,
            timeout=self.config.timeout_seconds,
            follow_redirects=True,
            headers={
                "User-Agent": "NiveshLens/0.1",
                "Accept": "text/csv,text/plain,application/octet-stream,*/*",
            },
        )
        response.raise_for_status()
        return response.text

    def fetch_bytes(self, url: str) -> bytes:
        response = httpx.get(
            url,
            timeout=self.config.timeout_seconds,
            follow_redirects=True,
            headers={
                "User-Agent": "NiveshLens/0.1",
                "Accept": (
                    "application/vnd.openxmlformats-officedocument."
                    "spreadsheetml.sheet,application/octet-stream,*/*"
                ),
            },
        )
        response.raise_for_status()
        return response.content

    def build_url(self, path: str) -> str:
        return urljoin(
            self.config.base_url.rstrip("/") + "/",
            path.lstrip("/"),
        )