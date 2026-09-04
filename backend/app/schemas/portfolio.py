import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_serializer


class PortfolioCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=120,
    )


class HoldingResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: uuid.UUID
    portfolio_id: uuid.UUID

    asset_type: str
    name: str
    isin: str | None = None

    quantity: Decimal
    average_price: Decimal
    current_price: Decimal
    invested_value: Decimal
    current_value: Decimal

    @field_serializer(
        "quantity",
        "average_price",
        "current_price",
        "invested_value",
        "current_value",
    )
    def serialize_decimal(
        self,
        value: Decimal,
    ) -> float:
        return float(value)


class PortfolioResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: uuid.UUID
    name: str
    total_value: Decimal
    created_at: datetime
    updated_at: datetime

    holdings: list[HoldingResponse] = Field(
        default_factory=list,
    )

    @field_serializer("total_value")
    def serialize_total_value(
        self,
        value: Decimal,
    ) -> float:
        return float(value)