import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from app.services.cas.detector import CASFormat
from app.services.cas.models import RawCASData, RawHolding
from app.services.cas.parsers.cams import parse_cams


class CasParseError(Exception):
    code = "CAS_PARSE_FAILED"


# ============================================================
# REGEX / CONSTANTS
# ============================================================

# Indian ISIN = exactly 12 characters
_ISIN_RE = re.compile(
    r"\b[A-Z]{2}[A-Z0-9]{10}\b"
)

_NUMBER_RE = re.compile(
    r"(?<![A-Za-z0-9])\d[\d,]*(?:\.\d+)?(?![A-Za-z0-9])"
)


# ============================================================
# BASIC HELPERS
# ============================================================

def _clean_spaces(value: str) -> str:
    return " ".join(value.split()).strip()


def _normalize_number(value: str) -> str:
    return value.replace(",", "").strip()


def _to_decimal(value: str) -> Decimal | None:
    try:
        return Decimal(_normalize_number(value))
    except (InvalidOperation, ValueError):
        return None


def _numbers(text: str) -> list[str]:
    """
    Extract numeric values from a line/block.

    Example:
        '40 1,285.60 51,424.00'
    becomes:
        ['40', '1285.60', '51424.00']
    """

    result: list[str] = []

    for match in _NUMBER_RE.finditer(text):
        value = _normalize_number(match.group(0))

        if _to_decimal(value) is not None:
            result.append(value)

    return result


def _extract_isin(text: str) -> str | None:
    match = _ISIN_RE.search(text.upper())

    if not match:
        return None

    return match.group(0)


def _parse_date(value: str) -> date | None:
    formats = (
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%d/%b/%Y",
        "%d-%b-%Y",
        "%d/%B/%Y",
        "%d-%B-%Y",
    )

    for fmt in formats:
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            pass

    return None


# ============================================================
# STATEMENT PERIOD
# ============================================================

def _period(text: str) -> date | None:
    patterns = [
        # Statement for the period from 01-Mar-2025 to 31-Mar-2025
        r"STATEMENT\s+FOR\s+THE\s+PERIOD\s+FROM\s+"
        r"(\d{1,2}[/-][A-Za-z]{3,9}[/-]\d{4})",

        # Statement Period: 01/03/2025 - 31/03/2025
        r"(?:STATEMENT\s+PERIOD|PERIOD)\s*[:\-]?\s*"
        r"(?:FROM\s*)?"
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{4})",

        # As on 31/03/2025
        r"(?:AS\s+ON|AS\s+OF)\s*[:\-]?\s*"
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{4})",

        # Generic date fallback
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{4})",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.I)

        if not match:
            continue

        parsed = _parse_date(match.group(1))

        if parsed:
            return parsed

    return None


# ============================================================
# CAS FORMAT HELPERS
# ============================================================

def _format_string(cas_format: CASFormat) -> str:
    """
    Safely get the detector format without assuming enum members
    such as CASFormat.CDSL exist.
    """

    value = getattr(cas_format, "value", None)

    if value is not None:
        return str(value).upper()

    return str(cas_format).upper()


def _is_cams(cas_format: CASFormat, text: str) -> bool:
    fmt = _format_string(cas_format)

    return (
        "CAMS" in fmt
        or (
            "FOLIO NO" in text.upper()
            and "MUTUAL FUND" in text.upper()
        )
    )


def _looks_like_cdsl(text: str) -> bool:
    """
    Detect the actual CDSL-style table from document content.

    We deliberately inspect the document text rather than relying
    on a CASFormat.CDSL enum member because this project does not
    define that enum member.
    """

    upper = text.upper()

    return (
        "CDSL DEMAT ACCOUNT" in upper
        and "EQUITY SHARES" in upper
        and "CURRENT BAL" in upper
        and "MARKET PRICE" in upper
    )


# ============================================================
# TRANSACTION FILTER
# ============================================================

def _looks_like_transaction(text: str) -> bool:
    transaction_words = (
        "PURCHASE",
        "PURCHASED",
        "REDEMPTION",
        "REDEEM",
        "SOLD",
        "SALE",
        "SWITCH",
        "DIVIDEND",
        "BONUS",
        "TRANSFER",
        "STAMP DUTY",
        "BROKERAGE",
        "STT",
        "TAX",
        "DEBIT",
        "CREDIT",
        "BUY",
        "SELL",
    )

    upper = text.upper()

    return any(word in upper for word in transaction_words)


# ============================================================
# CDSL EQUITY SHARES
# ============================================================

def _parse_cdsl_equity_lines(
    lines: list[str],
) -> list[RawHolding]:

    holdings: list[RawHolding] = []

    in_equity_section = False

    for raw_line in lines:
        line = _clean_spaces(raw_line)

        if not line:
            continue

        upper = line.upper()

        # Start of equity section
        if upper.startswith("EQUITY SHARES"):
            in_equity_section = True
            continue

        # Stop at mutual funds section
        if upper.startswith("MUTUAL FUNDS"):
            in_equity_section = False
            continue

        if not in_equity_section:
            continue

        # Skip table header/subtotal
        if (
            "ISIN DESCRIPTION" in upper
            or "STOCK SYMBOL" in upper
            or "COMPANY NAME" in upper
            or upper.startswith("SUB TOTAL")
        ):
            continue

        isin = _extract_isin(line)

        if not isin:
            continue

        if _looks_like_transaction(line):
            continue

        # --------------------------------------------------------
        # Remove ISIN from line
        # --------------------------------------------------------

        isin_match = re.search(
            rf"\b{re.escape(isin)}\b",
            line,
            re.I,
        )

        if not isin_match:
            continue

        remaining = _clean_spaces(
            line[isin_match.end():]
        )

        # --------------------------------------------------------
        # Extract the final 3 numeric columns:
        #
        # Current Bal
        # Market Price
        # Value in Rs.
        # --------------------------------------------------------

        number_matches = list(
            _NUMBER_RE.finditer(remaining)
        )

        if len(number_matches) < 3:
            continue

        last_three = number_matches[-3:]

        units = _normalize_number(
            last_three[0].group(0)
        )

        current_price = _normalize_number(
            last_three[1].group(0)
        )

        current_value = _normalize_number(
            last_three[2].group(0)
        )

        # Text before numeric columns
        text_before_numbers = _clean_spaces(
            remaining[:last_three[0].start()]
        )

        if not text_before_numbers:
            continue

        # --------------------------------------------------------
        # Expected:
        #
        # DESCRIPTION STOCK_SYMBOL COMPANY_NAME
        #
        # Example:
        # RELIANCE RELIANCE Industries Ltd
        # --------------------------------------------------------

        name_parts = text_before_numbers.split(
            None,
            2,
        )

        if len(name_parts) >= 3:
            description = name_parts[0]
            stock_symbol = name_parts[1]
            company_name = name_parts[2]

            # Prefer actual company name.
            name = company_name

            # If company name somehow looks invalid, fall back.
            if len(name) < 2:
                name = (
                    f"{description} "
                    f"{stock_symbol}"
                )

        elif len(name_parts) == 2:
            name = name_parts[1]

        else:
            name = name_parts[0]

        name = _clean_spaces(name)

        if not name:
            continue

        # Validate numeric values
        if (
            _to_decimal(units) is None
            or _to_decimal(current_price) is None
            or _to_decimal(current_value) is None
        ):
            continue

        holdings.append(
            RawHolding(
                name=name,
                isin=isin,
                units=units,
                average_cost=None,
                current_value=current_value,
                current_price=current_price,
            )
        )

    return holdings


# ============================================================
# CDSL MUTUAL FUNDS
# ============================================================

def _parse_cdsl_mutual_funds(
    lines: list[str],
) -> list[RawHolding]:

    holdings: list[RawHolding] = []

    in_mf_section = False

    pending_isin: str | None = None
    pending_name: str | None = None

    for index, raw_line in enumerate(lines):
        line = _clean_spaces(raw_line)

        if not line:
            continue

        upper = line.upper()

        # --------------------------------------------------------
        # Section detection
        # --------------------------------------------------------

        if upper.startswith("MUTUAL FUNDS"):
            in_mf_section = True
            pending_isin = None
            pending_name = None
            continue

        if (
            in_mf_section
            and upper.startswith("SUB TOTAL")
        ):
            in_mf_section = False
            continue

        if not in_mf_section:
            continue

        # Skip header
        if (
            "ISIN DESCRIPTION" in upper
            or "SCHEME NAME" in upper
            or "CURRENT BAL" in upper
            or "NAV" in upper
            or "VALUE IN RS" in upper
        ):
            continue

        # --------------------------------------------------------
        # ISIN line
        # --------------------------------------------------------

        isin = _extract_isin(line)

        if isin:
            pending_isin = isin

            # Sometimes another text exists after the ISIN
            remaining = _clean_spaces(
                re.sub(
                    rf"\b{re.escape(isin)}\b",
                    "",
                    line,
                    flags=re.I,
                )
            )

            # Ignore simple codes like UTI01
            if (
                remaining
                and not re.fullmatch(
                    r"[A-Z0-9/_-]+",
                    remaining,
                )
            ):
                pending_name = remaining

            continue

        # No active ISIN => nothing to parse
        if not pending_isin:
            continue

        # --------------------------------------------------------
        # Scheme / folio / numeric line
        # --------------------------------------------------------

        number_matches = list(
            _NUMBER_RE.finditer(line)
        )

        # The holding-value row has:
        # Current Bal
        # NAV
        # Value
        #
        # Example:
        # 410.250 185.32 76,036.35
        if len(number_matches) >= 3:
            last_three = number_matches[-3:]

            units = _normalize_number(
                last_three[0].group(0)
            )

            current_price = _normalize_number(
                last_three[1].group(0)
            )

            current_value = _normalize_number(
                last_three[2].group(0)
            )

            # If line has text before numbers, it may contain
            # scheme name on the same line.
            text_before_numbers = _clean_spaces(
                line[:last_three[0].start()]
            )

            if text_before_numbers:
                if (
                    not text_before_numbers.upper().startswith(
                        "FOLIO"
                    )
                ):
                    pending_name = text_before_numbers

            # Validate values
            if (
                _to_decimal(units) is None
                or _to_decimal(current_price) is None
                or _to_decimal(current_value) is None
            ):
                continue

            # Need a real scheme name.
            if not pending_name:
                # Search backwards for scheme name.
                for back in range(1, 4):
                    previous_index = index - back

                    if previous_index < 0:
                        break

                    candidate = _clean_spaces(
                        lines[previous_index]
                    )

                    if not candidate:
                        continue

                    candidate_upper = candidate.upper()

                    if _extract_isin(candidate):
                        continue

                    if candidate_upper.startswith(
                        "FOLIO"
                    ):
                        continue

                    if re.fullmatch(
                        r"[A-Z0-9/_-]+",
                        candidate,
                    ):
                        continue

                    if "SUB TOTAL" in candidate_upper:
                        continue

                    if (
                        "CURRENT BAL" in candidate_upper
                        or "NAV" in candidate_upper
                        or "VALUE IN RS" in candidate_upper
                    ):
                        continue

                    pending_name = candidate
                    break

            if not pending_name:
                continue

            name = _clean_spaces(pending_name)

            holdings.append(
                RawHolding(
                    name=name,
                    isin=pending_isin,
                    units=units,
                    average_cost=None,
                    current_value=current_value,
                    current_price=current_price,
                )
            )

            # Reset for next mutual fund.
            pending_isin = None
            pending_name = None

            continue

        # --------------------------------------------------------
        # Scheme name line
        # --------------------------------------------------------

        if (
            upper.startswith("FOLIO")
            or re.fullmatch(
                r"[A-Z0-9/_-]+",
                line,
            )
        ):
            # This is a folio or short scheme code.
            continue

        if _looks_like_transaction(line):
            continue

        # Save as scheme name.
        if len(line) >= 3:
            pending_name = line

    return holdings


# ============================================================
# GENERIC LABEL-BASED PARSER
# ============================================================

def _parse_label_based_holdings(
    text: str,
) -> list[RawHolding]:

    holdings: list[RawHolding] = []

    pattern = re.compile(
        r"(?:SCHEME|FUND|SECURITY)\s*[:\-]\s*"
        r"(?P<name>[^\n]+)"
        r"(?P<body>.*?)"
        r"(?=(?:SCHEME|FUND|SECURITY)\s*[:\-]|\Z)",
        re.I | re.S,
    )

    for match in pattern.finditer(text):
        name = _clean_spaces(match.group("name"))
        body = match.group("body")

        if not name:
            continue

        if _looks_like_transaction(name):
            continue

        isin = _extract_isin(body)

        units_match = re.search(
            r"(?:UNITS?|BALANCE|UNITS\s+HELD)"
            r"\s*[:\-]?\s*([0-9][0-9,]*(?:\.\d+)?)",
            body,
            re.I,
        )

        value_match = re.search(
            r"(?:CURRENT\s+VALUE|MARKET\s+VALUE|VALUATION|VALUE)"
            r"\s*[:\-]?\s*([0-9][0-9,]*(?:\.\d+)?)",
            body,
            re.I,
        )

        average_match = re.search(
            r"(?:AVERAGE\s+(?:COST|PRICE)|COST\s+PRICE)"
            r"\s*[:\-]?\s*([0-9][0-9,]*(?:\.\d+)?)",
            body,
            re.I,
        )

        price_match = re.search(
            r"(?:NAV|CURRENT\s+PRICE|PRICE)"
            r"\s*[:\-]?\s*([0-9][0-9,]*(?:\.\d+)?)",
            body,
            re.I,
        )

        if not units_match or not value_match:
            continue

        holdings.append(
            RawHolding(
                name=name,
                isin=isin,
                units=_normalize_number(
                    units_match.group(1)
                ),
                average_cost=(
                    _normalize_number(
                        average_match.group(1)
                    )
                    if average_match
                    else None
                ),
                current_value=_normalize_number(
                    value_match.group(1)
                ),
                current_price=(
                    _normalize_number(
                        price_match.group(1)
                    )
                    if price_match
                    else None
                ),
            )
        )

    return holdings


# ============================================================
# GENERIC ISIN FALLBACK
# ============================================================

def _parse_isin_fallback(
    text: str,
) -> list[RawHolding]:

    holdings: list[RawHolding] = []

    lines = [
        _clean_spaces(line)
        for line in text.splitlines()
        if _clean_spaces(line)
    ]

    for index, line in enumerate(lines):
        isin = _extract_isin(line)

        if not isin:
            continue

        if _looks_like_transaction(line):
            continue

        # Gather current + next few lines.
        end = min(index + 5, len(lines))

        block_lines = lines[index:end]
        block = " ".join(block_lines)

        numbers = _numbers(block)

        if len(numbers) < 2:
            continue

        # Try to use first two/three values.
        units = numbers[0]
        current_value = numbers[-1]

        current_price = (
            numbers[-2]
            if len(numbers) >= 3
            else None
        )

        # Find name from nearby lines.
        name = None

        for candidate in block_lines:
            cleaned = re.sub(
                rf"\b{re.escape(isin)}\b",
                "",
                candidate,
                flags=re.I,
            )

            cleaned = _clean_spaces(cleaned)

            if not cleaned:
                continue

            upper = cleaned.upper()

            if upper in {
                "ISIN",
                "DESCRIPTION",
                "SECURITY",
                "SECURITY NAME",
                "SCHEME NAME",
                "CURRENT BAL",
                "MARKET PRICE",
                "VALUE IN RS.",
            }:
                continue

            if re.fullmatch(
                r"[\d,\.\s]+",
                cleaned,
            ):
                continue

            if _looks_like_transaction(cleaned):
                continue

            name = cleaned
            break

        if not name:
            continue

        holdings.append(
            RawHolding(
                name=name,
                isin=isin,
                units=units,
                average_cost=None,
                current_value=current_value,
                current_price=current_price,
            )
        )

    return holdings


# ============================================================
# DEDUPLICATION
# ============================================================

def _deduplicate_holdings(
    holdings: list[RawHolding],
) -> list[RawHolding]:

    unique: dict[
        tuple[str, str | None],
        RawHolding
    ] = {}

    for holding in holdings:
        name_key = _clean_spaces(
            holding.name
        ).upper()

        isin_key = (
            holding.isin.upper()
            if holding.isin
            else None
        )

        key = (
            name_key,
            isin_key,
        )

        if key not in unique:
            unique[key] = holding

    return list(unique.values())


# ============================================================
# MAIN PARSER
# ============================================================

def parse_cas(
    text: str,
    cas_format: CASFormat,
) -> RawCASData:

    if not text or not text.strip():
        raise CasParseError(
            "CAS document contains no extractable text"
        )

    normalized_text = (
        text
        .replace("\x00", " ")
        .replace("\r\n", "\n")
        .replace("\r", "\n")
    )

    # --------------------------------------------------------
    # CAMS
    # --------------------------------------------------------

    if _is_cams(
        cas_format,
        normalized_text,
    ):
        try:
            return parse_cams(
                normalized_text
            )
        except ValueError as error:
            raise CasParseError(
                str(error)
            ) from error

    lines = [
        line
        for line in normalized_text.splitlines()
    ]

    holdings: list[RawHolding] = []

    # --------------------------------------------------------
    # CDSL
    #
    # Detect from actual PDF content.
    # Do NOT use CASFormat.CDSL.
    # --------------------------------------------------------

    if _looks_like_cdsl(
        normalized_text
    ):
        # Equity Shares
        holdings.extend(
            _parse_cdsl_equity_lines(lines)
        )

        # Mutual Funds
        holdings.extend(
            _parse_cdsl_mutual_funds(lines)
        )

    # --------------------------------------------------------
    # Generic fallback
    # --------------------------------------------------------

    if not holdings:
        holdings.extend(
            _parse_label_based_holdings(
                normalized_text
            )
        )

    # --------------------------------------------------------
    # ISIN fallback
    # --------------------------------------------------------

    if not holdings:
        holdings.extend(
            _parse_isin_fallback(
                normalized_text
            )
        )

    # --------------------------------------------------------
    # Deduplicate
    # --------------------------------------------------------

    holdings = _deduplicate_holdings(
        holdings
    )

    # --------------------------------------------------------
    # Final validation
    # --------------------------------------------------------

    if not holdings:
        raise CasParseError(
            "No supported holding records found"
        )

    return RawCASData(
        format_name=_format_string(cas_format),
        holdings=holdings,
        transactions=[],
        statement_period=_period(
            normalized_text
        ),
    )