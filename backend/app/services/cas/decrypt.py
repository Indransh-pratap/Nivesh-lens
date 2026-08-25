from pathlib import Path

from pypdf import PdfReader
from pypdf.errors import PdfReadError


class CasPdfError(Exception):
    code = "INVALID_PDF"


class WrongPasswordError(CasPdfError):
    code = "WRONG_PASSWORD"


def decrypt_cas_pdf(file_path: str, password: str) -> str:
    """Open a local temporary PDF and return extracted text only; never persists decrypted data."""
    try:
        reader = PdfReader(Path(file_path))
        if reader.is_encrypted:
            result = reader.decrypt(password)
            if result == 0:
                raise WrongPasswordError("Unable to decrypt PDF")
        text: list[str] = []
        for page in reader.pages:
            # Blank pages legitimately have no /Contents stream.
            try:
                text.append(page.extract_text(extraction_mode="layout") or "")
            except KeyError:
                text.append("")
        return "\n".join(text)
    except WrongPasswordError:
        raise
    except (PdfReadError, OSError, ValueError) as error:
        raise CasPdfError("Unable to read PDF") from error
