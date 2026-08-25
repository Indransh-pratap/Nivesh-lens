from enum import StrEnum


class CASFormat(StrEnum):
    CAMS = "CAMS"
    KFINTECH = "KFINTECH"
    DEPOSITORY = "DEPOSITORY"


class UnsupportedCASError(Exception):
    code = "UNSUPPORTED_CAS"


def detect_cas_format(text: str) -> CASFormat:
    candidate = " ".join(text.upper().split())
    if "CAMS" in candidate and ("CONSOLIDATED ACCOUNT STATEMENT" in candidate or "CAS" in candidate):
        return CASFormat.CAMS
    if ("KFINTECH" in candidate or "KARVY" in candidate) and ("CONSOLIDATED ACCOUNT STATEMENT" in candidate or "CAS" in candidate):
        return CASFormat.KFINTECH
    if ("NSDL" in candidate or "CDSL" in candidate) and "CONSOLIDATED" in candidate:
        return CASFormat.DEPOSITORY
    raise UnsupportedCASError("Document is not a supported CAS")
