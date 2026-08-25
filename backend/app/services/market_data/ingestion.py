import logging
from datetime import date
from sqlalchemy.orm import Session

from app.models.market_data import FundScheme, FundNAVHistory
from app.services.external.mf.nav_provider import MFAPINAVProvider, NAVProvider
from app.services.market_data.cache import MarketDataCache
from app.services.market_data.seed_data import seed_market_baseline

logger = logging.getLogger(__name__)


def ingest_scheme_nav_history(db: Session, scheme_code: str, provider: NAVProvider | None = None) -> int:
    """
    Ingests and caches daily NAV history for a given fund scheme code.
    Returns count of new/updated NAV records.
    """
    if provider is None:
        provider = MFAPINAVProvider()

    scheme = db.query(FundScheme).filter(FundScheme.scheme_code == scheme_code).first()
    if not scheme:
        # Check if baseline market data needs seeding
        seed_market_baseline(db)
        scheme = db.query(FundScheme).filter(FundScheme.scheme_code == scheme_code).first()

    nav_points = provider.get_history(scheme_code)
    if not nav_points:
        return 0

    if not scheme:
        # Create scheme if not present
        scheme = FundScheme(scheme_code=scheme_code, scheme_name=f"Scheme {scheme_code}")
        db.add(scheme)
        db.commit()
        db.refresh(scheme)

    inserted_count = 0
    for pt in nav_points:
        existing = db.query(FundNAVHistory).filter(FundNAVHistory.scheme_id == scheme.id, FundNAVHistory.nav_date == pt.nav_date).first()
        if not existing:
            db.add(FundNAVHistory(scheme_id=scheme.id, nav_date=pt.nav_date, nav=pt.nav))
            inserted_count += 1

    db.commit()

    cache = MarketDataCache(db)
    cache.record_sync(
        source=f"NAV:{scheme_code}",
        provider=provider.__class__.__name__,
        as_of_date=date.today(),
        status="SUCCESS",
        details=f"Ingested {inserted_count} new NAV data points",
    )
    return inserted_count
