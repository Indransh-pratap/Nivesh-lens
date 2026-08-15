import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_serializer


class PortfolioCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class PortfolioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    total_value: Decimal
    created_at: datetime
    updated_at: datetime

    @field_serializer("total_value")
    def serialize_total_value(self, value: Decimal) -> float:
        return float(value)
