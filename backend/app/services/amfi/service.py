import hashlib
from datetime import date

from sqlalchemy.orm import Session

from app.models.market_data import FundScheme, SchemeHolding
from app.services.amfi.client import AMFIClient
from app.services.amfi.parser import (
    parse_portfolio_csv,
    parse_portfolio_xlsx,
)
from app.services.market_data.cache import MarketDataCache


class AMFIPortfolioService:
    """
    Retrieves, parses and persists MF portfolio disclosures.
    """

    def __init__(self, client: AMFIClient):
        self.client = client

    def import_csv(
        self,
        db: Session,
        url: str,
        scheme_isin: str,
        as_of_date: date,
    ) -> int:
        content = self.client.fetch(url)
        holdings = parse_portfolio_csv(content)

        scheme_isin = scheme_isin.strip().upper()

        scheme = (
            db.query(FundScheme)
            .filter(FundScheme.isin == scheme_isin)
            .first()
        )

        if scheme is None:
            raise ValueError(
                f"Fund scheme not found for ISIN: {scheme_isin}"
            )

        db.query(SchemeHolding).filter(
            SchemeHolding.scheme_id == scheme.id,
            SchemeHolding.as_of_date == as_of_date,
        ).delete(synchronize_session=False)

        for item in holdings:
            db.add(
                SchemeHolding(
                    scheme_id=scheme.id,
                    as_of_date=as_of_date,
                    company_name=item.company_name,
                    company_isin=item.company_isin,
                    sector=item.sector,
                    weight_percentage=item.weight_percentage,
                )
            )

        db.commit()

        checksum = hashlib.sha256(
            content.encode("utf-8")
        ).hexdigest()

        MarketDataCache(db).record_sync(
            source=f"AMFI_PORTFOLIO:{scheme_isin}",
            provider=self.client.__class__.__name__,
            as_of_date=as_of_date,
            status="SUCCESS",
            details=(
                f"Imported {len(holdings)} holdings "
                f"for scheme {scheme.scheme_name}; "
                f"checksum={checksum}"
            ),
        )

        return len(holdings)

    def import_xlsx(
        self,
        db: Session,
        content: bytes,
    ) -> dict:
        """
        Import scheme portfolio disclosures from an AMFI/AMC XLSX workbook.

        Existing FundScheme records are matched by scheme_code.
        Holdings for the same scheme and disclosure date are replaced.
        Unknown schemes are skipped and reported.
        """

        portfolios = parse_portfolio_xlsx(content)

        imported_schemes = 0
        skipped_schemes: list[str] = []
        total_holdings = 0

        for portfolio in portfolios:
            scheme = (
                db.query(FundScheme)
                .filter(
                    FundScheme.scheme_code == portfolio.scheme_code
                )
                .first()
            )

            if scheme is None:
                skipped_schemes.append(
                    f"{portfolio.scheme_code}: {portfolio.scheme_name}"
                )
                continue

            db.query(SchemeHolding).filter(
                SchemeHolding.scheme_id == scheme.id,
                SchemeHolding.as_of_date == portfolio.as_of_date,
            ).delete(synchronize_session=False)

            for item in portfolio.holdings:
                db.add(
                    SchemeHolding(
                        scheme_id=scheme.id,
                        as_of_date=portfolio.as_of_date,
                        company_name=item.company_name,
                        company_isin=item.company_isin,
                        sector=item.sector,
                        weight_percentage=item.weight_percentage,
                    )
                )

            imported_schemes += 1
            total_holdings += len(portfolio.holdings)

        db.commit()

        as_of_date = max(
            (
                portfolio.as_of_date
                for portfolio in portfolios
            ),
            default=date.today(),
        )

        checksum = hashlib.sha256(content).hexdigest()

        MarketDataCache(db).record_sync(
            source="AMFI_PORTFOLIO_XLSX",
            provider="AMFI",
            as_of_date=as_of_date,
            status="SUCCESS",
            details=(
                f"Imported {imported_schemes} schemes with "
                f"{total_holdings} holdings; "
                f"skipped {len(skipped_schemes)} schemes; "
                f"checksum={checksum}"
            ),
        )

        return {
            "imported_schemes": imported_schemes,
            "skipped_schemes": len(skipped_schemes),
            "total_holdings": total_holdings,
            "skipped_scheme_codes": skipped_schemes,
        }