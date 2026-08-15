import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.holding import AssetType
from app.models.transaction import TransactionType


class HoldingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    asset_type: AssetType
    symbol: str | None
    name: str
    isin: str | None
    quantity: Decimal
    average_price: Decimal
    current_price: Decimal
    invested_value: Decimal
    current_value: Decimal
    created_at: datetime
    updated_at: datetime


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    holding_id: uuid.UUID | None
    transaction_type: TransactionType
    transaction_date: date
    quantity: Decimal
    price: Decimal
    amount: Decimal
    created_at: datetime
