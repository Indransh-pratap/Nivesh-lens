
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation

from app.services.cas.models import RawCASData, RawHolding, RawTransaction

_MONEY = r"-?\s*(?:₹|Rs\.?\s*)?[0-9][0-9,]*(?:\.\d+)?"
_ISIN = r"[A-Z]{2}[A-Z0-9]{9}[0-9]"


def _clean(value: str | None) -> str:
    return " ".join((value or "").strip().split())


def _decimal(value: str | None) -> Decimal | None:
    if not value:
        return None

    value = re.sub(r"^(?:₹|Rs\.?)\s*", "", value.strip(), flags=re.I)
    value = value.replace(",", "").replace(" ", "")

    try:
        return Decimal(value)
    except InvalidOperation:
        return None


def _parse_date(value: str) -> str | None:
    value = _clean(value).replace(".", "-")
    for fmt in (
        "%d-%b-%Y",
        "%d-%B-%Y",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y-%m-%d",
    ):
        try:
            return datetime.strptime(value, fmt).strftime("%d/%m/%Y")
        except ValueError:
            continue
    return None


def _parse_statement_period(text: str) -> str | None:
    match = re.search(
        r"statement\s+period\s*:?\s*"
        r"(\d{1,2}[-/][A-Za-z0-9-]+[-/]\d{2,4})"
        r"\s*(?:to|-)\s*"
        r"(\d{1,2}[-/][A-Za-z0-9-]+[-/]\d{2,4})",
        text,
        re.I,
    )
    if not match:
        return None
    return _parse_date(match.group(2)) or _parse_date(match.group(1))


def _extract_folio_blocks(text: str) -> list[tuple[str, str]]:
    matches = list(
        re.finditer(
            r"(?:Folio\s*(?:No\.?|Number)\s*:?\s*)([A-Z0-9/-]+)",
            text,
            re.I,
        )
    )
    blocks = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        blocks.append((match.group(1).strip(), text[match.end():end]))
    return blocks


def _extract_amc(block: str) -> str | None:
    match = re.search(r"AMC\s*:?\s*([^\n|]+)", block, re.I)
    return _clean(match.group(1)) if match else None


def _extract_nominee(block: str) -> tuple[str | None, str | None]:
    match = re.search(
        r"Nominee(?:\s+Details)?(?:\s+\d+)?\s*:?\s*([^\n|]+)",
        block,
        re.I,
    )
    if not match:
        return None, None

    value = _clean(match.group(1))
    upper = value.upper()

    if "NOT REGISTERED" in upper or "MISSING" in upper or upper in {"NONE", "UNASSIGNED", "NOT ASSIGNED"}:
        return "MISSING", None
    if "CONFIRMED" in upper or "REGISTERED" in upper:
        return "CONFIRMED", value
    # A named nominee is an affirmative statement in this supported CAMS
    # layout.  Unknown layouts still return UNKNOWN rather than MISSING.
    return ("CONFIRMED", value) if value else ("UNKNOWN", None)


def _extract_scheme_blocks(block: str) -> list[tuple[str, str, str]]:
    matches = list(
        re.finditer(
            rf"(?im)^\s*(?P<name>[^\n]{{2,180}}?)\s+(?:ISIN\s*:\s*)?"
            rf"(?P<isin>{_ISIN})\s*$",
            block,
        )
    )

    results = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(block)
        name = re.sub(r"\s+ISIN\s*:\s*$", "", _clean(match.group("name")), flags=re.I)
        body = block[match.end():end]

        if name and not re.search(r"^(?:ISIN|Scheme Name|Folio)\b", name, re.I):
            results.append((name, match.group("isin"), body))

    return results


def _extract_advisor(body: str) -> str | None:
    match = re.search(r"Advisor\s*:?\s*([^\n|]+)", body, re.I)
    return _clean(match.group(1)) if match else None


def _extract_closing_values(
    body: str,
) -> tuple[Decimal | None, Decimal | None, Decimal | None]:
    units = None
    nav = None
    value = None

    units_match = re.search(
        rf"(?:Closing\s+)?(?:Unit\s+)?Balance\s*:?\s*({_MONEY})",
        body,
        re.I,
    )
    if units_match:
        units = _decimal(units_match.group(1))

    nav_match = re.search(
        rf"(?:NAV|Net\s+Asset\s+Value)(?:\s+as\s+on\s+[^:\n]+)?"
        rf"\s*:?\s*({_MONEY})",
        body,
        re.I,
    )
    if nav_match:
        nav = _decimal(nav_match.group(1))

    value_match = re.search(
        rf"(?:Market\s+)?Value\s*:?\s*({_MONEY})",
        body,
        re.I,
    )
    if value_match:
        value = _decimal(value_match.group(1))

    return units, nav, value


def _extract_transactions(
    body: str,
    scheme_name: str,
    isin: str,
    folio: str,
) -> list[RawTransaction]:
    transactions = []

    date_pattern = (
        r"(?P<date>\d{1,2}[-/][A-Za-z0-9-]+[-/]\d{2,4})"
    )
    number_pattern = rf"({_MONEY})"

    for line in body.splitlines():
        line = _clean(line)
        match = re.match(
            rf"^{date_pattern}\s+(.+?)\s+"
            rf"{number_pattern}\s+{number_pattern}"
            rf"(?:\s+{number_pattern})?(?:\s+{number_pattern})?\s*$",
            line,
        )
        if not match:
            continue

        date_value = _parse_date(match.group("date"))
        if not date_value:
            continue

        tail = line[match.end("date"):].strip()
        values = re.findall(_MONEY, tail)
        if len(values) < 2:
            continue

        description_match = re.match(r"^(.*?)\s+" + _MONEY, tail)
        description = _clean(description_match.group(1)) if description_match else tail

        upper_description = description.upper()
        if any(term in upper_description for term in ("OPENING BALANCE", "CLOSING BALANCE")):
            continue

        amount = _decimal(values[0])
        units = _decimal(values[1])
        nav = _decimal(values[2]) if len(values) > 2 else None

        if amount is None and units is None:
            continue

        transactions.append(
            RawTransaction(
                security_name=scheme_name,
                isin=isin,
                transaction_type=description or "UNKNOWN",
                transaction_date=date_value,
                units=units,
                amount=amount,
                folio_number=folio,
                nav=nav,
                unit_balance=None,
            )
        )

    return transactions


def parse_cams(text: str) -> RawCASData:
    if not text or not text.strip():
        raise ValueError("CAMS statement is empty")

    text = text.replace("\x00", " ")
    statement_period = _parse_statement_period(text)
    holdings: list[RawHolding] = []
    transactions: list[RawTransaction] = []

    folio_blocks = _extract_folio_blocks(text)
    if not folio_blocks:
        raise ValueError("No CAMS folio records found")

    for folio, block in folio_blocks:
        amc = _extract_amc(block)
        nominee_status, nominee_name = _extract_nominee(block)

        schemes = _extract_scheme_blocks(block)
        for scheme_name, isin, scheme_body in schemes:
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
                    asset_type="MUTUAL_FUND",
                    folio_number=folio,
                    amc=amc,
                    advisor=_extract_advisor(scheme_body),
                    nominee_status=nominee_status,
                    nominee_name=nominee_name,
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
        raise ValueError("No CAMS holdings could be extracted")

    return RawCASData(
        format_name="CAMS",
        holdings=holdings,
        transactions=transactions,
        statement_period=statement_period,
    )
