import logging
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from app.models.holding import AssetType
from app.services.cas.detector import CASFormat
from app.services.cas.models import RawCASData, RawHolding
from app.services.cas.parsers.cams import parse_cams


logger = logging.getLogger(__name__)


class CasParseError(Exception):
    code = "CAS_PARSE_FAILED"


# ============================================================
# REGEX
# ============================================================

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


def _extract_numbers(text: str) -> list[str]:
    values: list[str] = []

    for match in _NUMBER_RE.finditer(text):
        value = _normalize_number(match.group(0))

        if _to_decimal(value) is not None:
            values.append(value)

    return values


def _extract_isin(text: str) -> str | None:
    match = _ISIN_RE.search(text.upper())

    if not match:
        return None

    return match.group(0)


# ============================================================
# DATE / PERIOD
# ============================================================

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
            continue

    return None


def _period(text: str) -> date | None:
    patterns = [
        # Statement for the period from 01-Mar-2025 to 31-Mar-2025
        r"STATEMENT\s+FOR\s+THE\s+PERIOD\s+FROM\s+"
        r"(\d{1,2}[/-][A-Za-z]{3,9}[/-]\d{4})",

        # Statement Period: 01/03/2025
        r"(?:STATEMENT\s+PERIOD|PERIOD)\s*[:\-]?\s*"
        r"(?:FROM\s*)?"
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{4})",

        # As on 31/03/2025
        r"(?:AS\s+ON|AS\s+OF)\s*[:\-]?\s*"
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{4})",

        # Generic fallback
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
# FORMAT HELPERS
# ============================================================

def _format_string(cas_format: CASFormat) -> str:
    value = getattr(cas_format, "value", None)

    if value is not None:
        return str(value).upper()

    return str(cas_format).upper()


def _looks_like_cdsl(text: str) -> bool:
    """
    Detect CDSL/depository format from actual document content.
    We intentionally do not rely on CASFormat.CDSL because
    this project does not define that member.
    """

    upper = text.upper()

    return (
        (
            "CDSL" in upper
            or "DEPOSITORY" in upper
            or "DP ID" in upper
        )
        and "EQUITY SHARES" in upper
        and "CURRENT BAL" in upper
    )


def _is_cams_format(
    cas_format: CASFormat,
    text: str,
) -> bool:
    fmt = _format_string(cas_format)
    upper = text.upper()

    if _looks_like_cdsl(text):
        return False

    return (
        "CAMS" in fmt
        or (
            "FOLIO NO" in upper
            and "MUTUAL FUND" in upper
        )
    )


# ============================================================
# TRANSACTION FILTER
# ============================================================

def _looks_like_transaction(text: str) -> bool:
    upper = text.upper()

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

    return any(
        word in upper
        for word in transaction_words
    )


# ============================================================
# SHORT CODE / HEADER FILTER
# ============================================================

def _looks_like_short_code(text: str) -> bool:
    """
    CDSL mutual-fund statements often put a short code immediately
    after the ISIN, e.g.:

        INF209K01VD8
        UTI01
        UTI Nifty 50 Index Fund - Direct - Growth

    UTI01/KOT02/PPF03 should NOT become the scheme name.
    """

    value = _clean_spaces(text)

    if not value:
        return True

    # Common CAS short codes.
    if re.fullmatch(
        r"[A-Z]{2,8}\d{1,5}",
        value,
        re.I,
    ):
        return True

    # Generic all-uppercase alphanumeric codes.
    if re.fullmatch(
        r"[A-Z0-9/_-]{2,15}",
        value,
        re.I,
    ):
        # Keep real words such as ETF, GROWTH etc. out of this.
        if " " not in value:
            return True

    return False


def _looks_like_header(text: str) -> bool:
    upper = _clean_spaces(text).upper()

    headers = {
        "ISIN",
        "DESCRIPTION",
        "SCHEME NAME",
        "SCHEME NAME / FOLIO",
        "CURRENT BAL",
        "CURRENT BALANCE",
        "NAV",
        "VALUE IN RS.",
        "VALUE IN RS",
        "MARKET PRICE",
        "STOCK SYMBOL",
        "COMPANY NAME",
        "SECURITY",
        "SECURITY NAME",
        "FOLIO",
    }

    return upper in headers


# ============================================================
# CDSL EQUITY PARSER
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

        # Start equity section
        if upper.startswith("EQUITY SHARES"):
            in_equity_section = True
            continue

        # Also handle lines where the heading appears with extra text
        if (
            "EQUITY SHARES" in upper
            and "ISIN" not in upper
            and "CURRENT BAL" not in upper
            and "MARKET PRICE" not in upper
        ):
            in_equity_section = True
            continue

        # End equity section
        if (
            in_equity_section
            and (
                "MUTUAL FUNDS" in upper
                or upper.startswith("SUB TOTAL")
            )
        ):
            in_equity_section = False
            continue

        if not in_equity_section:
            continue

        # Ignore table headings
        if (
            "ISIN DESCRIPTION" in upper
            or "STOCK SYMBOL" in upper
            or "COMPANY NAME" in upper
            or "CURRENT BAL" in upper
            or "MARKET PRICE" in upper
        ):
            continue

        isin = _extract_isin(line)

        if not isin:
            continue

        if _looks_like_transaction(line):
            continue

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

        # Expected:
        #
        # RELIANCE Reliance Industries Ltd 40 1,285.60 51,424.00
        #
        # Last 3 numbers are:
        # Current Bal / Market Price / Value

        number_matches = list(
            _NUMBER_RE.finditer(remaining)
        )

        if len(number_matches) < 3:
            logger.debug(
                "Skipping equity row without 3 numeric values: %s",
                line,
            )
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

        text_before_numbers = _clean_spaces(
            remaining[:last_three[0].start()]
        )

        if not text_before_numbers:
            continue

        # CDSL equity line: ISIN | Symbol | Company Name
        #
        # Example:
        # INE002A01018 RELIANCE Reliance Industries Ltd 40 1,285.60 51,424.00
        #
        # ISIN + Symbol occupy the first 2 tokens; skip 1 token and keep the company name.
        parts = text_before_numbers.split()

        if len(parts) >= 2:
            company_name = " ".join(parts[1:])
        elif len(parts) == 2:
            company_name = parts[1]
        else:
            company_name = parts[0]

        company_name = _clean_spaces(
            company_name
        )

        if not company_name:
            continue

        # Validate values
        if (
            _to_decimal(units) is None
            or _to_decimal(current_price) is None
            or _to_decimal(current_value) is None
        ):
            continue

        holding = RawHolding(
            name=company_name,
            isin=isin,
            units=units,
            average_cost=None,
            current_value=current_value,
            current_price=current_price,
            asset_type=AssetType.STOCK,
        )

        holdings.append(holding)

        logger.debug(
            "Parsed equity: %s | %s | units=%s | price=%s | value=%s",
            company_name,
            isin,
            units,
            current_price,
            current_value,
        )

    logger.info(
        "CDSL parser: parsed %d equity holdings",
        len(holdings),
    )

    return holdings


# ============================================================
# CDSL MUTUAL FUND PARSER
# ============================================================

def _parse_cdsl_mutual_funds(
    lines: list[str],
) -> list[RawHolding]:

    holdings: list[RawHolding] = []

    in_mf_section = False

    pending_isin: str | None = None
    pending_name: str | None = None
    pending_folio: str | None = None

    for raw_line in lines:
        line = _clean_spaces(raw_line)

        if not line:
            continue

        upper = line.upper()

        # --------------------------------------------------------
        # Start MF section
        # --------------------------------------------------------

        if "MUTUAL FUNDS" in upper:
            in_mf_section = True

            pending_isin = None
            pending_name = None
            pending_folio = None

            continue

        # --------------------------------------------------------
        # End MF section
        # --------------------------------------------------------

        if in_mf_section and (
            upper.startswith("SUB TOTAL")
            or upper.startswith("GRAND TOTAL")
        ):
            in_mf_section = False
            continue

        if not in_mf_section:
            continue

        # --------------------------------------------------------
        # Skip MF headers
        # --------------------------------------------------------

        if (
            "ISIN DESCRIPTION" in upper
            or "SCHEME NAME" in upper
            or "CURRENT BAL" in upper
            or "NAV" in upper
            or "VALUE IN RS" in upper
        ):
            continue

        # --------------------------------------------------------
        # New ISIN
        # --------------------------------------------------------

        isin = _extract_isin(line)

        if isin:
            # Start a new MF record.
            pending_isin = isin
            pending_name = None
            pending_folio = None

            isin_pos = upper.find(isin)

            after_isin = _clean_spaces(
                line[
                    isin_pos + len(isin):
                ]
            )

            # Sometimes numeric values can be on same line.
            number_matches = list(
                _NUMBER_RE.finditer(after_isin)
            )

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

                scheme_name = _clean_spaces(
                    after_isin[
                        :last_three[0].start()
                    ]
                )

                if (
                    scheme_name
                    and not _looks_like_short_code(
                        scheme_name
                    )
                ):
                    pending_name = scheme_name

                if (
                    pending_name
                    and _to_decimal(units) is not None
                    and _to_decimal(current_price) is not None
                    and _to_decimal(current_value) is not None
                ):
                    holdings.append(
                        RawHolding(
                            name=pending_name,
                            isin=pending_isin,
                            units=units,
                            average_cost=None,
                            current_value=current_value,
                            current_price=current_price,
                            asset_type=AssetType.MUTUAL_FUND,
                            folio_number=pending_folio,
                        )
                    )

                    logger.debug(
                        "Parsed MF: %s | %s | units=%s | nav=%s | value=%s",
                        pending_name,
                        pending_isin,
                        units,
                        current_price,
                        current_value,
                    )

                    pending_isin = None
                    pending_name = None
                    pending_folio = None

                continue

            # ----------------------------------------------------
            # Text after ISIN
            #
            # Example:
            # INF209K01VD8 UTI01
            #
            # Do NOT store UTI01 as scheme name.
            # ----------------------------------------------------

            if after_isin:
                if not _looks_like_short_code(
                    after_isin
                ):
                    pending_name = after_isin

            continue

        # No active MF record.
        if not pending_isin:
            continue

        # --------------------------------------------------------
        # Folio
        # --------------------------------------------------------

        folio_match = re.search(
            r"\bFOLIO\s*:\s*([A-Za-z0-9/_-]+)",
            line,
            re.I,
        )

        if folio_match:
            pending_folio = folio_match.group(1)

        # --------------------------------------------------------
        # Numeric row
        # --------------------------------------------------------

        number_matches = list(
            _NUMBER_RE.finditer(line)
        )

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

            # Sometimes scheme name is on same line as values.
            text_before_numbers = _clean_spaces(
                line[:last_three[0].start()]
            )

            if text_before_numbers:
                text_before_numbers = re.sub(
                    r"\bFOLIO\s*:\s*[A-Za-z0-9/_-]+",
                    "",
                    text_before_numbers,
                    flags=re.I,
                )

                candidate_name = _clean_spaces(
                    text_before_numbers
                )

                if (
                    candidate_name
                    and not _looks_like_short_code(
                        candidate_name
                    )
                    and not _looks_like_header(
                        candidate_name
                    )
                ):
                    pending_name = candidate_name

            # ----------------------------------------------------
            # We need actual scheme name
            # ----------------------------------------------------

            if not pending_name:
                logger.debug(
                    "MF numeric row found but scheme name missing: %s",
                    line,
                )
                continue

            # Validate values.
            if (
                _to_decimal(units) is None
                or _to_decimal(current_price) is None
                or _to_decimal(current_value) is None
            ):
                continue

            holding = RawHolding(
                name=pending_name,
                isin=pending_isin,
                units=units,
                average_cost=None,
                current_value=current_value,
                current_price=current_price,
                asset_type=AssetType.MUTUAL_FUND,
                folio_number=pending_folio,
            )

            holdings.append(holding)

            logger.debug(
                "Parsed MF: %s | %s | units=%s | NAV=%s | value=%s",
                pending_name,
                pending_isin,
                units,
                current_price,
                current_value,
            )

            # Reset for next MF.
            pending_isin = None
            pending_name = None
            pending_folio = None

            continue

        # --------------------------------------------------------
        # Scheme name line
        # --------------------------------------------------------

        if (
            not pending_name
            and len(line) > 3
            and not _looks_like_short_code(line)
            and not _looks_like_header(line)
            and not _looks_like_transaction(line)
        ):
            pending_name = line

    logger.info(
        "CDSL parser: parsed %d mutual fund holdings",
        len(holdings),
    )

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
        name = _clean_spaces(
            match.group("name")
        )

        body = match.group("body")

        if not name:
            continue

        if _looks_like_transaction(name):
            continue

        isin = _extract_isin(body)

        units_match = re.search(
            r"(?:UNITS?|BALANCE|UNITS\s+HELD)"
            r"\s*[:\-]?\s*"
            r"([0-9][0-9,]*(?:\.\d+)?)",
            body,
            re.I,
        )

        value_match = re.search(
            r"(?:CURRENT\s+VALUE|MARKET\s+VALUE|VALUATION|VALUE)"
            r"\s*[:\-]?\s*"
            r"([0-9][0-9,]*(?:\.\d+)?)",
            body,
            re.I,
        )

        average_match = re.search(
            r"(?:AVERAGE\s+(?:COST|PRICE)|COST\s+PRICE)"
            r"\s*[:\-]?\s*"
            r"([0-9][0-9,]*(?:\.\d+)?)",
            body,
            re.I,
        )

        price_match = re.search(
            r"(?:NAV|CURRENT\s+PRICE|PRICE)"
            r"\s*[:\-]?\s*"
            r"([0-9][0-9,]*(?:\.\d+)?)",
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

        end = min(
            index + 5,
            len(lines),
        )

        block_lines = lines[index:end]
        block = " ".join(block_lines)

        numbers = _extract_numbers(block)

        if len(numbers) < 2:
            continue

        units = numbers[0]
        current_value = numbers[-1]

        current_price = (
            numbers[-2]
            if len(numbers) >= 3
            else None
        )

        name: str | None = None

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
                "VALUE IN RS",
            }:
                continue

            if re.fullmatch(
                r"[\d,\.\s]+",
                cleaned,
            ):
                continue

            if _looks_like_short_code(
                cleaned
            ):
                continue

            if _looks_like_transaction(
                cleaned
            ):
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
        RawHolding,
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

        # ISIN is the strongest identity.
        if isin_key:
            key = (
                isin_key,
                name_key,
            )
        else:
            key = (
                name_key,
                None,
            )

        if key not in unique:
            unique[key] = holding

    return list(unique.values())


# ============================================================
# MAIN CAS PARSER
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

    format_str = _format_string(
        cas_format
    )

    logger.info(
        "parse_cas: detected format = %s",
        format_str,
    )

    # ========================================================
    # CAMS
    # ========================================================

    if _is_cams_format(
        cas_format,
        normalized_text,
    ):
        try:
            return parse_cams(
                normalized_text
            )
        except ValueError as error:
            logger.warning(
                "CAMS parser failed, falling back to generic parser: %s",
                error,
            )

    # ========================================================
    # CDSL / DEPOSITORY
    # ========================================================

    lines = normalized_text.splitlines()

    holdings: list[RawHolding] = []

    if (
        _looks_like_cdsl(normalized_text)
        or format_str == "DEPOSITORY"
    ):
        equity_holdings = (
            _parse_cdsl_equity_lines(
                lines
            )
        )

        mutual_fund_holdings = (
            _parse_cdsl_mutual_funds(
                lines
            )
        )

        holdings.extend(
            equity_holdings
        )

        holdings.extend(
            mutual_fund_holdings
        )

        logger.info(
            "CDSL parser result: %d equity + %d mutual funds = %d total",
            len(equity_holdings),
            len(mutual_fund_holdings),
            len(holdings),
        )

    # ========================================================
    # GENERIC FALLBACK
    # ========================================================

    if not holdings:
        holdings.extend(
            _parse_label_based_holdings(
                normalized_text
            )
        )

    # ========================================================
    # ISIN FALLBACK
    # ========================================================

    if not holdings:
        holdings.extend(
            _parse_isin_fallback(
                normalized_text
            )
        )

    # ========================================================
    # DEDUPLICATE
    # ========================================================

    holdings = _deduplicate_holdings(
        holdings
    )

    logger.info(
        "parse_cas: successfully parsed %d total holdings",
        len(holdings),
    )

    # ========================================================
    # VALIDATION
    # ========================================================

    if not holdings:
        raise CasParseError(
            "No supported holding records found"
        )

    return RawCASData(
        format_name=format_str,
        holdings=holdings,
        transactions=[],
        statement_period=_period(
            normalized_text
        ),
    )