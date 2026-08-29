import re
from datetime import datetime

from app.services.cas.detector import CASFormat
from app.services.cas.models import RawCASData, RawHolding, RawTransaction
from app.services.cas.parsers.cams import parse_cams

class CasParseError(Exception):
    code = "CAS_PARSE_FAILED"


_MONEY = r"([0-9][0-9,]*(?:\.\d+)?)"
_ISIN = r"([A-Z]{3}[A-Z0-9]{9})"


def _value(block: str, label: str) -> str | None:
    match = re.search(rf"{label}\s*[:\-]?\s*{_MONEY}", block, re.I)
    return match.group(1) if match else None


def _period(text: str):
    match = re.search(r"(?:STATEMENT\s+PERIOD|PERIOD)\s*[:\-]?\s*(?:FROM\s*)?\d{1,2}[/-]\d{1,2}[/-](\d{4})", text, re.I)
    if not match:
        return None
    try:
        return datetime.strptime(match.group(0).split()[-1], "%Y").date()  # format fallback below handles common CAS labels
    except ValueError:
        date_match = re.search(r"(\d{1,2}[/-]\d{1,2}[/-]\d{4})", match.group(0))
        if not date_match:
            return None
        for fmt in ("%d/%m/%Y", "%d-%m-%Y"):
            try:
                return datetime.strptime(date_match.group(1), fmt).date()
            except ValueError:
                continue
    return None


def parse_cas(text: str, cas_format: CASFormat) -> RawCASData:
    if cas_format == CASFormat.CAMS and "FOLIO NO" in text.upper():
        try:
            return parse_cams(text)
        except ValueError as error:
            raise CasParseError(str(error)) from error

    # Keep the existing generic parser for formats
    # that do not have a dedicated parser yet.
    holdings: list[RawHolding] = []

    pattern = re.compile(
        rf"(?:SCHEME|FUND|SECURITY)\s*[:\-]\s*"
        rf"(?P<name>[^\n]+)"
        rf"(?P<body>.*?)"
        rf"(?=(?:SCHEME|FUND|SECURITY)\s*[:\-]|\Z)",
        re.I | re.S,
    )

    for match in pattern.finditer(text):
        name = " ".join(match.group("name").split())
        body = match.group("body")

        isin_match = re.search(
            rf"ISIN\s*[:\-]?\s*{_ISIN}",
            body,
            re.I,
        )

        units = _value(body, r"(?:UNITS?|BALANCE)")
        current_value = _value(
            body,
            r"(?:CURRENT\s+VALUE|MARKET\s+VALUE|VALUATION)",
        )

        if name and units and current_value:
            holdings.append(
                RawHolding(
                    name=name,
                    isin=isin_match.group(1) if isin_match else None,
                    units=units,
                    average_cost=_value(
                        body,
                        r"(?:AVERAGE\s+(?:COST|PRICE)|COST\s+PRICE)",
                    ),
                    current_value=current_value,
                    current_price=_value(
                        body,
                        r"(?:NAV|CURRENT\s+PRICE)",
                    ),
                )
            )

    if not holdings:
        raise CasParseError("No supported holding records found")

    return RawCASData(
        format_name=cas_format.value,
        holdings=holdings,
        transactions=[],
        statement_period=_period(text),
    )