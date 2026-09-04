import os

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app.core.security import get_current_user_id
from app.db.dependencies import get_db
from app.services.cas.decrypt import CasPdfError, decrypt_cas_pdf
from app.services.cas.import_service import CasImportError, import_cas, save_temp_pdf
from app.services.amfi.client import AMFIClient, AMFIClientConfig
from app.services.amfi.service import AMFIPortfolioService
router = APIRouter(prefix="/imports")


@router.post("/cas")
async def post_cas_import(
    request: Request,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    path: str | None = None
    try:
        form = await request.form()
        file = form.get("file")
        password = form.get("password", "")
        # Starlette's multipart parser returns its UploadFile implementation.
        if not hasattr(file, "read") or not hasattr(file, "filename") or not isinstance(password, str) or len(password) > 512:
            raise CasImportError("INVALID_PDF", "A PDF file and valid password are required")
        path, document_hash = await save_temp_pdf(file)  # type: ignore[arg-type]
        text = decrypt_cas_pdf(path, password)
        if not text.strip():
            raise CasImportError("UNSUPPORTED_CAS", "PDF contains no extractable CAS text")
        return import_cas(db, user_id, file.filename, document_hash, text)
    except CasPdfError as error:
        raise HTTPException(status_code=422, detail={"code": error.code, "message": "Unable to read this PDF"}) from error
    except CasImportError as error:
        raise HTTPException(status_code=422, detail={"code": error.code, "message": error.message}) from error
    finally:
        if path and os.path.exists(path):
            os.unlink(path)
@router.post("/amfi")
async def post_amfi_import(
    file: UploadFile,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_FILE",
                "message": "An AMFI XLSX file is required",
            },
        )

    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_FILE",
                "message": "Only XLSX files are supported",
            },
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "EMPTY_FILE",
                "message": "The uploaded file is empty",
            },
        )

    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail={
                "code": "FILE_TOO_LARGE",
                "message": "AMFI XLSX file must be 25 MB or smaller",
            },
        )

    try:
        client = AMFIClient(
            AMFIClientConfig(
                base_url="https://www.amfiindia.com",
            )
        )

        service = AMFIPortfolioService(client)

        result = service.import_xlsx(
            db=db,
            content=content,
        )

        return {
            "status": "completed",
            "filename": file.filename,
            **result,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "AMFI_IMPORT_ERROR",
                "message": str(error),
            },
        ) from error