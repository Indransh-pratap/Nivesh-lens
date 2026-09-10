from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api.cas import router as cas_router
from app.api.health import router as health_router
from app.api.portfolio import router as portfolio_router
from app.api.imports import router as imports_router
from app.api.phase2 import router as phase2_router
from app.api.ai import router as ai_router
from app.api.admin_amfi import router as admin_amfi_router
from app.core.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    logging.basicConfig(level=settings.log_level)
    logger.info("Nivesh Lens Backend initialized with AI layer active")
    yield


app = FastAPI(title="Portfolio X-Ray API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "https://nivesh-lens.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health_router, prefix="/api", tags=["health"])
app.include_router(portfolio_router, prefix="/api", tags=["portfolios"])
app.include_router(imports_router, prefix="/api", tags=["imports"])
app.include_router(cas_router)
app.include_router(phase2_router, prefix="/api", tags=["phase2"])
app.include_router(ai_router, prefix="/api", tags=["ai"])
app.include_router(admin_amfi_router, prefix="/api", tags=["admin-amfi"])


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}, "detail": message},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, __: RequestValidationError) -> JSONResponse:
    return error_response(422, "VALIDATION_ERROR", "Request validation failed")


@app.exception_handler(HTTPException)
async def http_error_handler(_: Request, error: HTTPException) -> JSONResponse:
    if isinstance(error.detail, dict) and "code" in error.detail:
        return error_response(error.status_code, error.detail["code"], error.detail.get("message", "Request failed"))
    messages = {
        401: ("UNAUTHORIZED", "Authentication required"),
        403: ("FORBIDDEN", "You do not have access to this resource"),
        404: ("PORTFOLIO_NOT_FOUND", "Portfolio not found"),
        503: ("DATABASE_ERROR", "Database unavailable"),
    }
    if error.status_code in messages:
        default_code, default_msg = messages[error.status_code]
        msg = error.detail if isinstance(error.detail, str) and error.detail else default_msg
        return error_response(error.status_code, default_code, msg)

    code = "REQUEST_ERROR"
    message = error.detail if isinstance(error.detail, str) and error.detail else "Request failed"
    return error_response(error.status_code, code, message)


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(_: Request, error: SQLAlchemyError) -> JSONResponse:
    logger.exception("Database error", exc_info=error)
    return error_response(503, "DATABASE_ERROR", "Database operation failed")


@app.exception_handler(Exception)
async def unhandled_error_handler(_: Request, error: Exception) -> JSONResponse:
    logger.exception("Unhandled API error", exc_info=error)
    return error_response(500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred")
