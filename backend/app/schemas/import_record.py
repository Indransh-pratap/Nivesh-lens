import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.import_record import ImportStatus, SourceType


class ImportRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    source_type: SourceType
    file_name: str | None
    status: ImportStatus
    created_at: datetime
    completed_at: datetime | None
    error_message: str | None
