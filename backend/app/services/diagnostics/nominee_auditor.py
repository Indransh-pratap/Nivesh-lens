from dataclasses import dataclass
from enum import Enum
import re
from typing import Sequence


class NomineeStatus(str, Enum):
    CONFIRMED = "CONFIRMED"
    MISSING = "MISSING"
    UNKNOWN = "UNKNOWN"


@dataclass(frozen=True)
class AuditedAccount:
    account_id: str
    account_name: str
    account_type: str  # Demat | Mutual Fund Folio | Bank Account | Fixed Deposit | EPFO | Other
    masked_account_number: str
    nominee_status: NomineeStatus
    nominee_name: str | None = None
    relationship: str | None = None
    allocation_percentage: float | None = None
    source: str = "CAS"
    action_required: str | None = None


@dataclass(frozen=True)
class NomineeAuditResult:
    accounts_checked: int
    accounts_confirmed: int
    accounts_missing: int
    accounts_unknown: int
    compliance_percentage: float
    is_fully_compliant: bool
    red_flags: list[dict]
    accounts: list[dict]


def mask_account_number(acc: str | None) -> str:
    if not acc:
        return "XXXX-XXXX"
    cleaned = acc.strip()
    if len(cleaned) <= 4:
        return f"****{cleaned}"
    # Keep last 4 digits, mask everything prior
    prefix_len = max(0, len(cleaned) - 4)
    return "*" * prefix_len + cleaned[-4:]


def audit_portfolio_nominees(
    accounts: Sequence[dict],
) -> NomineeAuditResult:
    """
    Performs a deterministic legal compliance audit across Demat accounts,
    MF folios, Bank accounts, FDs, and other holdings.

    Strictly adheres to: UNKNOWN != MISSING.
    If an account source does not disclose nominee info, it is marked UNKNOWN,
    not falsely flagged as MISSING.
    """
    audited: list[AuditedAccount] = []
    confirmed_count = 0
    missing_count = 0
    unknown_count = 0
    red_flags: list[dict] = []

    for acc in accounts:
        acc_id = str(acc.get("id", ""))
        name = str(acc.get("account_name") or acc.get("name", "Account"))
        acc_type = str(acc.get("account_type", "Mutual Fund Folio"))
        raw_number = acc.get("account_number") or acc.get("folio_number") or ""
        masked_num = mask_account_number(raw_number)

        raw_status = str(acc.get("nominee_status", "")).upper()
        nominee_name = acc.get("nominee_name")
        relationship = acc.get("relationship")
        allocation = acc.get("allocation_percentage")
        source = str(acc.get("source", "CAS"))

        # Determine status
        if raw_status in ("CONFIRMED", "VERIFIED", "YES", "REGISTERED"):
            status = NomineeStatus.CONFIRMED
            confirmed_count += 1
            action = None
        elif raw_status in ("MISSING", "NOT_REGISTERED", "UNASSIGNED", "ACTION REQUIRED", "ACTION_REQUIRED", "NONE"):
            status = NomineeStatus.MISSING
            missing_count += 1
            action = f"Register nominee details with {name} or depository portal to prevent succession delays."
            red_flags.append({
                "severity": "CRITICAL",
                "account_name": name,
                "account_number": masked_num,
                "account_type": acc_type,
                "warning": "Nominee information missing",
                "action": action,
            })
        elif nominee_name and nominee_name.strip().upper() not in ("UNASSIGNED", "NONE", "NIL", ""):
            status = NomineeStatus.CONFIRMED
            confirmed_count += 1
            action = None
        elif raw_status in ("UNKNOWN", "UNAVAILABLE", ""):
            status = NomineeStatus.UNKNOWN
            unknown_count += 1
            action = "Nominee status not reported by data provider. Verify on provider portal if not already set."
        else:
            status = NomineeStatus.UNKNOWN
            unknown_count += 1
            action = None

        audited.append(
            AuditedAccount(
                account_id=acc_id,
                account_name=name,
                account_type=acc_type,
                masked_account_number=masked_num,
                nominee_status=status,
                nominee_name=nominee_name if status == NomineeStatus.CONFIRMED else (None if status == NomineeStatus.MISSING else "Unknown"),
                relationship=relationship if status == NomineeStatus.CONFIRMED else None,
                allocation_percentage=float(allocation) if allocation is not None else (100.0 if status == NomineeStatus.CONFIRMED else None),
                source=source,
                action_required=action,
            )
        )

    total = len(audited)
    comp_pct = (
        round((confirmed_count / total) * 100.0, 1)
        if total > 0
        else 100.0
    )

    return NomineeAuditResult(
        accounts_checked=total,
        accounts_confirmed=confirmed_count,
        accounts_missing=missing_count,
        accounts_unknown=unknown_count,
        compliance_percentage=comp_pct,
        is_fully_compliant=(missing_count == 0 and total > 0),
        red_flags=red_flags,
        accounts=[
            {
                "id": a.account_id,
                "account_name": a.account_name,
                "account_type": a.account_type,
                "masked_account_number": a.masked_account_number,
                "nominee_status": a.nominee_status.value,
                "nominee_name": a.nominee_name,
                "relationship": a.relationship,
                "allocation_percentage": a.allocation_percentage,
                "source": a.source,
                "action_required": a.action_required,
            }
            for a in audited
        ],
    )
