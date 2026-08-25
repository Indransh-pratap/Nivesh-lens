import os

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app.core.security import get_current_user_id
from app.db.dependencies import get_db
from app.services.cas.decrypt import CasPdfError, decrypt_cas_pdf
from app.services.cas.import_service import CasImportError, import_cas, save_temp_pdf

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
