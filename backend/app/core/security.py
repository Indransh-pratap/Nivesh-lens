import hashlib
import hmac
import time

from fastapi import Header, HTTPException, Request, status

from app.core.config import settings


def build_request_signature(timestamp: str, method: str, path: str, user_id: str, body: bytes) -> str:
    payload = b".".join([timestamp.encode(), method.encode(), path.encode(), user_id.encode(), body])
    return hmac.new(settings.internal_api_secret.encode(), payload, hashlib.sha256).hexdigest()


async def get_current_user_id(
    request: Request,
    x_portfolio_user_id: str | None = Header(default=None),
    x_portfolio_timestamp: str | None = Header(default=None),
    x_portfolio_signature: str | None = Header(default=None),
) -> str:
    if not all([x_portfolio_user_id, x_portfolio_timestamp, x_portfolio_signature]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        timestamp = int(x_portfolio_timestamp)
    except ValueError as error:
        raise HTTPException(status_code=401, detail="Invalid authentication signature") from error
    if abs(time.time() - timestamp) > 300:
        raise HTTPException(status_code=401, detail="Expired authentication signature")
    expected = build_request_signature(x_portfolio_timestamp, request.method, request.url.path, x_portfolio_user_id, await request.body())
    if not hmac.compare_digest(expected, x_portfolio_signature):
        raise HTTPException(status_code=401, detail="Invalid authentication signature")
    return x_portfolio_user_id
