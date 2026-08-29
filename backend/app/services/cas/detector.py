from enum import StrEnum


class CASFormat(StrEnum):
    CAMS = "CAMS"
    KFINTECH = "KFINTECH"
    DEPOSITORY = "DEPOSITORY"


class UnsupportedCASError(Exception):
    code = "UNSUPPORTED_CAS"


def detect_cas_format(text: str) -> CASFormat:
    candidate = " ".join(text.upper().split())

    # Explicit CAMS identification
    if "CAMS" in candidate and (
        "CONSOLIDATED ACCOUNT STATEMENT" in candidate
        or "CAS" in candidate
    ):
        return CASFormat.CAMS

    # CAMS-style statement where provider name is not explicitly
    # present in extracted text.
    cams_signals = [
        "PORTFOLIO SUMMARY",
        "FOLIO NO",
        "AMC",
    ]

    cams_score = sum(signal in candidate for signal in cams_signals)

    if (
        "CONSOLIDATED ACCOUNT STATEMENT" in candidate
        and cams_score >= 2
    ):
        return CASFormat.CAMS

    # KFintech / Karvy-style CAS
    if any(signal in candidate for signal in ("KFINTECH", "KARVY")):
        if (
            "CONSOLIDATED ACCOUNT STATEMENT" in candidate
            or "CAS" in candidate
        ):
            return CASFormat.KFINTECH

    # Depository CAS
    if (
        ("NSDL" in candidate or "CDSL" in candidate)
        and "CONSOLIDATED" in candidate
    ):
        return CASFormat.DEPOSITORY

    raise UnsupportedCASError("Document is not a supported CAS")