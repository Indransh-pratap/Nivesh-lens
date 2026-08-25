from datetime import date
from decimal import Decimal


def normalize_returns_series(series: list[tuple[date, Decimal]]) -> list[tuple[date, float]]:
    """
    Given a list of (date, value) sorted by date ascending, computes daily percentage returns.
    """
    if len(series) < 2:
        return []

    returns: list[tuple[date, float]] = []
    for i in range(1, len(series)):
        prev_dt, prev_val = series[i - 1]
        curr_dt, curr_val = series[i]
        if prev_val <= 0:
            continue
        daily_ret = float((curr_val - prev_val) / prev_val)
        returns.append((curr_dt, daily_ret))
    return returns
