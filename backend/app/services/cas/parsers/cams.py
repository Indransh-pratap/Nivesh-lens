import re
from datetime import datetime

from app.services.cas.models import RawCASData, RawHolding, RawTransaction


_MONEY = r"-?[0-9][0-9,]*(?:\.\d+)?"
_NUMBER = r"-?[0-9][0-9,]*(?:\.\d+)?"
_ISIN = r"[A-Z]{2}[A-Z0-9]{9}[0-9]"


def _clean(value: str) -> str:
    return " ".join(value.strip().split())


def _parse_date(value: str) -> str:
    """
    Convert common CAS dates to the canonical DD/MM/YYYY format.
    """
    value = value.strip()

    for fmt in ("%d-%b-%Y", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(value, fmt).strftime("%d/%m/%Y")
        except ValueError:
            continue

    raise ValueError(f"Unsupported CAS date: {value}")


def _parse_statement_period(text: str):
    match = re.search(
        r"Statement\s+Period\s*:\s*"
        r"(\d{1,2}[-/]\w+[-/]\d{4}|\d{1,2}[-/]\d{1,2}[-/]\d{4})"
        r"\s+to\s+"
        r"(\d{1,2}[-/]\w+[-/]\d{4}|\d{1,2}[-/]\d{1,2}[-/]\d{4})",
        text,
        re.IGNORECASE,
    )

    if not match:
        return None

    start = match.group(1)

    for fmt in ("%d-%b-%Y", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(start, fmt).date()
        except ValueError:
            continue

    return None


def _extract_folio_blocks(text: str) -> list[tuple[str, str]]:
    """
    Split CAMS CAS into:

        Folio No -> everything until the next Folio No.

    Returns:
        [(folio_number, block), ...]
    """
    pattern = re.compile(
        r"Folio\s+No\s*:\s*(?P<folio>[^\n]+)"
        r"(?P<body>.*?)(?=Folio\s+No\s*:|\Z)",
        re.IGNORECASE | re.DOTALL,
    )

    blocks = []

    for match in pattern.finditer(text):
        folio = _clean(match.group("folio"))
        body = match.group("body")

        blocks.append((folio, body))

    return blocks


def _extract_amc(block: str) -> str | None:
    match = re.search(
        r"AMC\s*:\s*(?P<amc>[^\n|]+)",
        block,
        re.IGNORECASE,
    )

    if not match:
        return None

    return _clean(match.group("amc"))


def _extract_scheme_blocks(block: str) -> list[tuple[str, str]]:
    """
    Split a folio block into individual schemes.

    A scheme starts with:
        Scheme Name ... ISIN: XXXXX

    and continues until the next scheme or the end of the folio.
    """
    pattern = re.compile(
        rf"(?P<header>[^\n]+?)\s+ISIN\s*:\s*(?P<isin>{_ISIN})"
        r"(?P<body>.*?)"
        rf"(?=(?:[^\n]+?)\s+ISIN\s*:\s*{_ISIN}|\Z)",
        re.IGNORECASE | re.DOTALL,
    )

    schemes = []

    for match in pattern.finditer(block):
        name = _clean(match.group("header"))
        isin = match.group("isin").upper()
        body = match.group("body")

        schemes.append((name, isin, body))

    return schemes


def _extract_advisor(scheme_block: str) -> str | None:
    match = re.search(
        r"Advisor\s*:\s*([^\n]+)",
        scheme_block,
        re.IGNORECASE,
    )

    if not match:
        return None

    return _clean(match.group(1))


def _extract_closing_values(
    body: str,
) -> tuple[str | None, str | None, str | None]:
    """
    Extract:

        Closing Unit Balance
        NAV as on ...
        Value

    from a CAMS scheme block.
    """

    units_match = re.search(
        rf"Closing\s+Unit\s+Balance\s*:\s*(?P<units>{_NUMBER})",
        body,
        re.IGNORECASE,
    )

    nav_match = re.search(
        rf"NAV\s+as\s+on\s+[^:]+:\s*(?:Rs\.?\s*)?(?P<nav>{_NUMBER})",
        body,
        re.IGNORECASE,
    )

    value_match = re.search(
        rf"Value\s*:\s*(?:Rs\.?\s*)?(?P<value>{_MONEY})",
        body,
        re.IGNORECASE,
    )

    return (
        units_match.group("units") if units_match else None,
        nav_match.group("nav") if nav_match else None,
        value_match.group("value") if value_match else None,
    )

def _extract_transactions(
    body: str,
    scheme_name: str,
    isin: str,
    folio: str,
) -> list[RawTransaction]:
    """
    Parse rows with:

        Date Description Amount Units NAV Unit Balance

    Example:
        02-Apr-2024 SIP Purchase - Instalment 1/12
        5,000.00 33.412 149.64 33.412
    """
    transactions: list[RawTransaction] = []

    pattern = re.compile(
        rf"(?P<date>\d{{1,2}}-[A-Za-z]{{3}}-\d{{4}})"
        rf"\s+"
        rf"(?P<description>.+?)"
        rf"\s+"
        rf"(?P<amount>{_MONEY})"
        rf"\s+"
        rf"(?P<units>{_NUMBER})"
        rf"\s+"
        rf"(?P<nav>{_NUMBER})"
        rf"\s+"
        rf"(?P<balance>{_NUMBER})"
        r"(?=\n|\Z)",
        re.IGNORECASE,
    )

    for match in pattern.finditer(body):
        try:
            transaction_date = _parse_date(match.group("date"))
        except ValueError:
            continue

        transactions.append(
            RawTransaction(
                security_name=scheme_name,
                isin=isin,
                transaction_type=_clean(match.group("description")),
                transaction_date=transaction_date,
                units=match.group("units"),
                amount=match.group("amount"),
                folio_number=folio,
                nav=match.group("nav"),
                unit_balance=match.group("balance"),
            )
        )

    return transactions


def parse_cams(text: str) -> RawCASData:
    """
    Parse a CAMS-style Consolidated Account Statement.

    This parser converts the document into the project's
    RawCASData representation and does not access the database.
    """
    statement_period = _parse_statement_period(text)

    holdings: list[RawHolding] = []
    transactions: list[RawTransaction] = []

    folio_blocks = _extract_folio_blocks(text)

    if not folio_blocks:
        raise ValueError("No CAMS folio records found")

    for folio, folio_block in folio_blocks:
        amc = _extract_amc(folio_block)

        scheme_blocks = _extract_scheme_blocks(folio_block)

        for scheme_name, isin, scheme_body in scheme_blocks:
            advisor = _extract_advisor(scheme_body)

            units, nav, value = _extract_closing_values(scheme_body)

            if units is None or value is None:
                continue

            holdings.append(
                RawHolding(
                    name=scheme_name,
                    isin=isin,
                    units=units,
                    average_cost=None,
                    current_value=value,
                    current_price=nav,
                    folio_number=folio,
                    amc=amc,
                    advisor=advisor,
                )
            )

            transactions.extend(
                _extract_transactions(
                    scheme_body,
                    scheme_name,
                    isin,
                    folio,
                )
            )

    if not holdings:
        raise ValueError("No CAMS holdings found")

    return RawCASData(
        format_name="CAMS",
        holdings=holdings,
        transactions=transactions,
        statement_period=statement_period,
    )