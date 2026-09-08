import logging
import re
from decimal import Decimal
from typing import Any
from sqlalchemy.orm import Session

from app.models.holding import AssetType, Holding
from app.models.portfolio import Portfolio
from app.schemas.ai import DocumentExtraction, ExtractedHolding
from app.services.ai.provider.factory import get_llm_provider
from app.services.ai.security import wrap_untrusted_input

logger = logging.getLogger(__name__)

ISIN_REGEX = re.compile(r"^IN[A-Z0-9]{10}$")


class ReconciledHolding:
    def __init__(
        self,
        isin: str,
        name: str,
        folio: str | None,
        units: Decimal,
        nav: Decimal,
        current_value: Decimal,
        asset_type: AssetType,
        is_reconciled: bool,
        reconciliation_discrepancy: Decimal = Decimal("0"),
    ):
        self.isin = isin
        self.name = name
        self.folio = folio
        self.units = units
        self.nav = nav
        self.current_value = current_value
        self.asset_type = asset_type
        self.is_reconciled = is_reconciled
        self.reconciliation_discrepancy = reconciliation_discrepancy


def validate_and_reconcile_holding(raw: ExtractedHolding) -> tuple[ReconciledHolding | None, list[str]]:
    """
    Strict deterministic validation and reconciliation:
    1. Validates 12-char ISIN format
    2. Enforces positive units and NAV
    3. Reconciles units * nav ~= current_value within 2% margin (or penny rounding)
    """
    errors: list[str] = []
    isin = raw.isin.strip().upper() if raw.isin else ""
    if not ISIN_REGEX.match(isin):
        errors.append(f"Invalid ISIN format: '{isin}'")

    if raw.units <= 0:
        errors.append(f"Holding {isin} has non-positive units: {raw.units}")
    if raw.nav_or_price <= 0:
        errors.append(f"Holding {isin} has non-positive price/NAV: {raw.nav_or_price}")
    if raw.current_value <= 0:
        errors.append(f"Holding {isin} has non-positive valuation: {raw.current_value}")

    if errors:
        return None, errors

    units_dec = Decimal(str(raw.units))
    nav_dec = Decimal(str(raw.nav_or_price))
    val_dec = Decimal(str(raw.current_value))

    expected_val = units_dec * nav_dec
    diff = abs(expected_val - val_dec)
    # Check if discrepancy is greater than 2% or 5 Rupees
    tolerance = max(val_dec * Decimal("0.02"), Decimal("5.0"))
    is_reconciled = diff <= tolerance

    if not is_reconciled:
        errors.append(
            f"Mathematical reconciliation mismatch for {isin}: "
            f"reported value ₹{val_dec} vs units*NAV ₹{expected_val:.2f} (diff: ₹{diff:.2f})"
        )

    asset_type = AssetType.MUTUAL_FUND
    if raw.asset_type == "STOCK":
        asset_type = AssetType.STOCK
    elif raw.asset_type == "ETF":
        asset_type = AssetType.ETF
    elif raw.asset_type == "BOND":
        asset_type = AssetType.BOND

    reconciled = ReconciledHolding(
        isin=isin,
        name=raw.scheme_or_stock_name.strip(),
        folio=raw.folio_number.strip() if raw.folio_number else None,
        units=units_dec,
        nav=nav_dec,
        current_value=val_dec if is_reconciled else expected_val,
        asset_type=asset_type,
        is_reconciled=is_reconciled,
        reconciliation_discrepancy=diff,
    )
    return reconciled, errors


def process_cas_ai_fallback(
    cas_text_or_ocr: str,
    user_id: str,
    db: Session,
    portfolio_name: str = "Imported Portfolio (AI Fallback)",
) -> dict[str, Any]:
    """
    Auxiliary fallback when deterministic CAS parser cannot parse PDF or returns zero items.
    1. Gemini document extraction to structured schema
    2. Deterministic validation & mathematical reconciliation
    3. Safe persistence into database only for verified holdings
    """
    system_instruction = (
        "You are an automated document data extraction system specializing in Indian Consolidated Account Statements (CAS). "
        "Extract all investment holdings and transactions present in the raw statement text. "
        "CRITICAL RULES:\n"
        "1. Extract ONLY data explicitly printed in the text.\n"
        "2. Extract valid 12-character ISINs (starts with 'IN').\n"
        "3. Extract units, latest NAV, and closing valuation for each scheme/stock.\n"
        "4. Return strictly the DocumentExtraction JSON schema."
    )

    prompt = (
        f"RAW CAS DOCUMENT TEXT:\n"
        f"{wrap_untrusted_input(cas_text_or_ocr[:20000], source_label='raw_cas_pdf')}\n\n"
        f"Extract all holdings and statements into DocumentExtraction JSON."
    )

    provider = get_llm_provider()
    try:
        extracted: DocumentExtraction = provider.generate_structured(
            prompt=prompt,
            schema=DocumentExtraction,
            system_instruction=system_instruction,
            temperature=0.0,
            model_tier="pro",
        )
    except Exception as exc:
        logger.error(f"CAS AI Fallback extraction failed: {exc}")
        return {
            "status": "FAILED",
            "error": f"AI extraction failed: {str(exc)}",
            "requires_review": True,
            "holdings_count": 0,
        }

    # Deterministic Reconciliation Layer
    reconciled_holdings: list[ReconciledHolding] = []
    reconciliation_errors: list[str] = []

    for raw_h in extracted.holdings:
        reconciled, errs = validate_and_reconcile_holding(raw_h)
        if reconciled and reconciled.is_reconciled:
            reconciled_holdings.append(reconciled)
        if errs:
            reconciliation_errors.extend(errs)

    requires_review = len(reconciliation_errors) > 0 or len(reconciled_holdings) == 0

    if not reconciled_holdings:
        return {
            "status": "REQUIRES_REVIEW",
            "message": "AI extracted potential holdings, but none passed deterministic reconciliation.",
            "review_reasons": reconciliation_errors,
            "requires_review": True,
            "holdings_count": 0,
        }

    # Persist verified reconciled holdings into canonical Portfolio DB
    portfolio = Portfolio(
        user_id=user_id,
        name=portfolio_name,
        total_value=sum(h.current_value for h in reconciled_holdings),
    )
    db.add(portfolio)
    db.flush()

    for rh in reconciled_holdings:
        db_holding = Holding(
            portfolio_id=portfolio.id,
            asset_type=rh.asset_type,
            name=rh.name,
            isin=rh.isin,
            quantity=rh.units,
            current_price=rh.nav,
            current_value=rh.current_value,
            average_price=rh.nav,
            invested_value=rh.current_value,
        )
        db.add(db_holding)

    db.commit()
    db.refresh(portfolio)

    return {
        "status": "COMPLETED_WITH_AI_FALLBACK",
        "portfolio_id": str(portfolio.id),
        "total_value": float(portfolio.total_value),
        "holdings_count": len(reconciled_holdings),
        "requires_review": requires_review,
        "review_reasons": reconciliation_errors,
        "investor_name": extracted.investor_name,
    }
