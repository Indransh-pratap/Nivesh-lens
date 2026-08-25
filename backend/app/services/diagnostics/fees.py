from decimal import Decimal


def calculate_fee_metrics() -> dict[str, Decimal | None]:
    """Reserved for expense-ratio data; this keeps the diagnostics boundary source-agnostic."""
    return {"weighted_expense_ratio": None}
