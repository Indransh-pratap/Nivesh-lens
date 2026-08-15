from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api.health import router as health_router
from app.api.portfolio import router as portfolio_router
from app.core.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    logging.basicConfig(level=settings.log_level)
    yield


app = FastAPI(title="Portfolio X-Ray API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "X-Portfolio-User-ID", "X-Portfolio-Timestamp", "X-Portfolio-Signature"],
)
app.include_router(health_router, prefix="/api", tags=["health"])
app.include_router(portfolio_router, prefix="/api", tags=["portfolios"])


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": {"code": code, "message": message}})


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, __: RequestValidationError) -> JSONResponse:
    return error_response(422, "VALIDATION_ERROR", "Request validation failed")


@app.exception_handler(HTTPException)
async def http_error_handler(_: Request, error: HTTPException) -> JSONResponse:
    messages = {401: ("UNAUTHORIZED", "Authentication required"), 403: ("FORBIDDEN", "You do not have access to this resource"), 404: ("PORTFOLIO_NOT_FOUND", "Portfolio not found"), 503: ("DATABASE_ERROR", "Database unavailable")}
    code, message = messages.get(error.status_code, ("REQUEST_ERROR", "Request failed"))
    return error_response(error.status_code, code, message)


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(_: Request, error: SQLAlchemyError) -> JSONResponse:
    logger.exception("Database error", exc_info=error)
    return error_response(503, "DATABASE_ERROR", "Database operation failed")


@app.exception_handler(Exception)
async def unhandled_error_handler(_: Request, error: Exception) -> JSONResponse:
    logger.exception("Unhandled API error", exc_info=error)
    return error_response(500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred")
