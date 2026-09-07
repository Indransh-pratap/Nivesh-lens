from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user_id
from app.db.dependencies import get_db
from app.schemas.cas import (
    CasOtpRequest,
    CasOtpRequestResponse,
    CasOtpVerifyRequest,
    CasOtpVerifyResponse,
)
from app.services.cas.nsdl_client import NsdlClient
from app.services.cas.otp_service import (
    CasOtpService,
    CasOtpServiceError,
)
from app.core.config import settings

router = APIRouter(
    prefix="/api/cas",
    tags=["CAS"],
)


def get_nsdl_client() -> NsdlClient:
    is_live = bool(settings.nsdl_base_url and settings.nsdl_api_key)
    return NsdlClient(
        base_url=settings.nsdl_base_url or "",
        api_key=settings.nsdl_api_key or "",
        timeout=settings.nsdl_timeout,
        is_sandbox=not is_live,
    )


def get_otp_service(
    nsdl_client: NsdlClient = Depends(get_nsdl_client),
) -> CasOtpService:
    return CasOtpService(nsdl_client)


@router.post(
    "/otp/request",
    response_model=CasOtpRequestResponse,
    status_code=status.HTTP_200_OK,
)
async def request_cas_otp(
    payload: CasOtpRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    otp_service: CasOtpService = Depends(get_otp_service),
) -> CasOtpRequestResponse:
    try:
        session = await otp_service.request_otp(
            db=db,
            user_id=user_id,
            identifier=payload.identifier,
        )

        return CasOtpRequestResponse(
            request_id=session.request_id,
            status=session.status,
            expires_at=session.expires_at,
        )

    except CasOtpServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.post(
    "/otp/verify",
    response_model=CasOtpVerifyResponse,
    status_code=status.HTTP_200_OK,
)
async def verify_cas_otp(
    payload: CasOtpVerifyRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    otp_service: CasOtpService = Depends(get_otp_service),
) -> CasOtpVerifyResponse:
    try:
        result = await otp_service.verify_otp(
            db=db,
            user_id=user_id,
            request_id=payload.request_id,
            otp=payload.otp,
        )

        return CasOtpVerifyResponse(
            request_id=result.request_id,
            status=result.status,
            portfolio_id=result.portfolio_id,
            holdings_count=result.holdings_count,
            total_value=result.total_value,
            sync_id=result.request_id,
        )

    except CasOtpServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc