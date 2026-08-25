from datetime import date, datetime
import hashlib
from sqlalchemy.orm import Session

from app.models.market_data import DataSyncRecord


class MarketDataCache:
    def __init__(self, db: Session):
        self.db = db

    def record_sync(self, source: str, provider: str, as_of_date: date | None = None, status: str = "SUCCESS", details: str | None = None) -> DataSyncRecord:
        checksum = hashlib.sha256(f"{source}:{provider}:{as_of_date}:{datetime.utcnow().isoformat()}".encode("utf-8")).hexdigest()[:16]
        sync_rec = DataSyncRecord(
            source=source,
            provider=provider,
            as_of_date=as_of_date,
            status=status,
            checksum=checksum,
            details=details,
        )
        self.db.add(sync_rec)
        self.db.commit()
        self.db.refresh(sync_rec)
        return sync_rec

    def get_last_sync(self, source: str) -> DataSyncRecord | None:
        return self.db.query(DataSyncRecord).filter(DataSyncRecord.source == source).order_by(DataSyncRecord.fetched_at.desc()).first()
