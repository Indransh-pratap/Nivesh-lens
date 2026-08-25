from pathlib import Path

import pytest
from pypdf import PdfWriter

from app.services.cas.decrypt import WrongPasswordError, decrypt_cas_pdf


def test_password_protected_pdf_distinguishes_wrong_password(tmp_path: Path):
    path = tmp_path / "statement.pdf"
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    writer.encrypt("correct-password")
    with path.open("wb") as target:
        writer.write(target)
    with pytest.raises(WrongPasswordError):
        decrypt_cas_pdf(str(path), "wrong-password")
    assert decrypt_cas_pdf(str(path), "correct-password") == ""
