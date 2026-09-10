from dataclasses import dataclass
from datetime import date
from decimal import Decimal
import logging
from pathlib import Path
import re
from typing import Sequence
import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.market_data import Company, FundScheme, SchemeHolding
from app.services.amfi.client import AMFIClient, AMFIClientConfig
from app.services.amfi.service import AMFIPortfolioService

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class NormalizedUnderlyingHolding:
    company_name: str
    isin: str | None
    security_identifier: str | None
    quantity: Decimal | None
    market_value: Decimal | None
    weight_percent: Decimal
    sector: str | None = None
    as_of_date: date | None = None

    # Compatibility alias for existing exposure engine
    @property
    def company_isin(self) -> str | None:
        return self.isin

    @property
    def weight_percentage(self) -> Decimal:
        return self.weight_percent


class CanonicalSchemeResolver:
    """
    Maps user portfolio holdings (identified by CAS prefix, ISIN, scheme name, or code)
    to canonical FundScheme records in the database.
    """

    @staticmethod
    def clean_scheme_name(raw_name: str) -> str:
        if not raw_name:
            return ""
        # 1. Strip HTML tags like <br/>, <br>, <b>, etc.
        cleaned = re.sub(r"<[^>]+>", " ", raw_name)
        # 2. Strip Folio: ... patterns from CAS exports
        cleaned = re.sub(r"Folio\s*:\s*[^\s]+", " ", cleaned, flags=re.IGNORECASE)
        # 3. Strip CAS prefix acronyms like 'MAELC-', 'PPFCG-', '128HFCG-', 'PPF03 ', 'UTI01 '
        cleaned = re.sub(r"^\s*([A-Za-z0-9]{2,10}-|[A-Za-z]{2,5}\d{1,5}\s+)", "", cleaned).strip()
        # 4. Strip plan/option suffixes like '- Direct Plan - Growth', '- Regular Plan', '- Regular - Dividend', etc.
        cleaned = re.sub(
            r"\s*-\s*((Direct|Regular)(\s+Plan)?(\s*-\s*(Growth|IDCW|Dividend|Bonus|Reinvestment))?|(Growth|IDCW|Dividend|Bonus|Reinvestment)).*$",
            "",
            cleaned,
            flags=re.IGNORECASE,
        ).strip()
        # 5. Strip trailing dashes or whitespace
        cleaned = re.sub(r"[-–—\s]+$", "", cleaned).strip()
        return " ".join(cleaned.split())

    @classmethod
    def clean_name(cls, raw_name: str) -> str:
        return cls.clean_scheme_name(raw_name)

    @classmethod
    def name_tokens(cls, name: str) -> set[str]:
        cleaned = cls.clean_scheme_name(name).lower()
        stopwords = {"fund", "direct", "regular", "plan", "growth", "dividend", "idcw", "cap", "index"}
        tokens = {t for t in re.split(r"[^a-zA-Z0-9]+", cleaned) if len(t) > 2 and t not in stopwords}
        return tokens

    @classmethod
    def resolve_scheme(
        cls,
        db: Session,
        scheme_identifier: str | None = None,
        scheme_isin: str | None = None,
        scheme_name: str | None = None,
    ) -> FundScheme | None:
        """
        Resolves canonical FundScheme by:
        1. Exact ISIN match
        2. Exact Scheme Code match
        3. Cleaned / normalized name match
        """
        # 1. ISIN match
        clean_isin = (scheme_isin or "").strip().upper()
        if clean_isin:
            scheme = (
                db.query(FundScheme)
                .filter(FundScheme.isin == clean_isin)
                .first()
            )
            if scheme:
                return scheme

        # 2. Scheme code match
        if scheme_identifier:
            clean_ident = str(scheme_identifier).strip()
            scheme = (
                db.query(FundScheme)
                .filter(FundScheme.scheme_code == clean_ident)
                .first()
            )
            if scheme:
                return scheme

            # Check if scheme_identifier is actually an ISIN
            if re.fullmatch(r"[A-Z]{2}[A-Z0-9]{9}[0-9]", clean_ident.upper()):
                scheme = (
                    db.query(FundScheme)
                    .filter(FundScheme.isin == clean_ident.upper())
                    .first()
                )
                if scheme:
                    return scheme

        # 3. Normalized name match
        name_to_match = scheme_name or scheme_identifier
        if name_to_match:
            cleaned_name = cls.clean_scheme_name(name_to_match)
            if len(cleaned_name) >= 3:
                # Substring match
                scheme = (
                    db.query(FundScheme)
                    .filter(FundScheme.scheme_name.ilike(f"%{cleaned_name}%"))
                    .first()
                )
                if scheme:
                    return scheme

            # Fallback: token-based matching for prominent words
            tokens = [t for t in re.split(r"[\s\-]+", cleaned_name) if len(t) > 3]
            if len(tokens) >= 2:
                q = db.query(FundScheme)
                for t in tokens[:4]:
                    q = q.filter(FundScheme.scheme_name.ilike(f"%{t}%"))
                scheme = q.first()
                if scheme:
                    return scheme

        return None


class AMFIPortfolioProvider:
    """
    Clean provider abstraction for AMFI / AMC monthly portfolio data.
    Retrieves, normalizes, and filters underlying equity disclosures.
    """

    def __init__(
        self,
        db: Session,
        client: AMFIClient | None = None,
    ):
        self.db = db
        self.client = client or AMFIClient(
            AMFIClientConfig(base_url="https://www.amfiindia.com")
        )
        self.service = AMFIPortfolioService(self.client)

    def get_scheme_portfolio(
        self,
        scheme_identifier: str,
        as_of_date: date | None = None,
    ) -> list[NormalizedUnderlyingHolding]:
        """
        Retrieves normalized underlying equity holdings for a scheme by identifier.
        """
        scheme = CanonicalSchemeResolver.resolve_scheme(
            db=self.db,
            scheme_identifier=scheme_identifier,
        )
        if not scheme:
            return []

        q = self.db.query(SchemeHolding).filter(SchemeHolding.scheme_id == scheme.id)
        if as_of_date:
            q = q.filter(SchemeHolding.as_of_date == as_of_date)
        else:
            # Pick latest available disclosure
            max_date = (
                self.db.query(func.max(SchemeHolding.as_of_date))
                .filter(SchemeHolding.scheme_id == scheme.id)
                .scalar()
            )
            if not max_date:
                return []
            q = q.filter(SchemeHolding.as_of_date == max_date)

        records = q.all()
        return self._normalize_scheme_holdings(records)

    def get_fund_holdings(
        self,
        fund_isin: str | None,
        fund_name: str,
        as_of_date: date | None = None,
    ) -> tuple[list[NormalizedUnderlyingHolding], date | None]:
        """
        Retrieves underlying holdings and disclosure date matching the interface
        expected by the true exposure calculator.
        """
        scheme = CanonicalSchemeResolver.resolve_scheme(
            db=self.db,
            scheme_isin=fund_isin,
            scheme_name=fund_name,
        )
        if not scheme:
            return [], None

        q = self.db.query(SchemeHolding).filter(SchemeHolding.scheme_id == scheme.id)
        if as_of_date:
            target_date = as_of_date
            records = q.filter(SchemeHolding.as_of_date == as_of_date).all()
        else:
            target_date = (
                self.db.query(func.max(SchemeHolding.as_of_date))
                .filter(SchemeHolding.scheme_id == scheme.id)
                .scalar()
            )
            if not target_date:
                return [], None
            records = q.filter(SchemeHolding.as_of_date == target_date).all()

        holdings = self._normalize_scheme_holdings(records)
        return holdings, target_date

    def _normalize_scheme_holdings(
        self,
        records: Sequence[SchemeHolding],
    ) -> list[NormalizedUnderlyingHolding]:
        if not records:
            return []

        # Check if weights are stored as fractions (<= 1.05) vs percentage
        raw_weights = [
            Decimal(str(r.weight_percentage))
            for r in records
            if r.weight_percentage is not None
        ]
        sum_weights = sum(raw_weights)
        is_fractional = Decimal("0") < sum_weights <= Decimal("1.05")

        results: list[NormalizedUnderlyingHolding] = []
        for r in records:
            if r.weight_percentage is None:
                continue
            weight = Decimal(str(r.weight_percentage))
            if weight <= Decimal("0"):
                continue

            if is_fractional:
                weight = weight * Decimal("100")

            results.append(
                NormalizedUnderlyingHolding(
                    company_name=r.company_name.strip(),
                    isin=r.company_isin.strip().upper() if r.company_isin else None,
                    security_identifier=r.company_isin or None,
                    quantity=Decimal(str(r.quantity)) if r.quantity is not None else None,
                    market_value=Decimal(str(r.market_value)) if r.market_value is not None else None,
                    weight_percent=weight,
                    sector=r.sector,
                    as_of_date=r.as_of_date,
                )
            )

        return results

    def ingest_monthly_data(
        self,
        content: bytes | None = None,
        file_path: Path | str | None = None,
        auto_create_schemes: bool = True,
    ) -> dict:
        """
        Idempotently ingests an AMFI monthly portfolio workbook into the database.
        """
        if content is None:
            if file_path is None:
                # Default to repository standard AMFI monthly portfolio dataset
                repo_amfi_path = (
                    Path(__file__).resolve().parents[3]
                    / "test-data"
                    / "amfi"
                    / "All-Schemes-Monthly-Portfolio---as-on-31st-July-2026.xlsx"
                )
                if repo_amfi_path.exists():
                    file_path = repo_amfi_path
                else:
                    raise FileNotFoundError("No AMFI monthly portfolio file specified or found.")

            file_path = Path(file_path)
            if not file_path.exists():
                raise FileNotFoundError(f"AMFI file not found at: {file_path}")
            content = file_path.read_bytes()

        return self.service.import_xlsx(
            db=self.db,
            content=content,
            auto_create_schemes=auto_create_schemes,
        )
