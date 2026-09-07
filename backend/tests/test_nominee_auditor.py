import pytest

from app.services.diagnostics.nominee_auditor import (
    audit_portfolio_nominees,
    mask_account_number,
    NomineeStatus,
)


def test_mask_account_number():
    assert mask_account_number("1208160012345678") == "************5678"
    assert mask_account_number("11223344 / 56") == "*********/ 56"
    assert mask_account_number("1234") == "****1234"
    assert mask_account_number(None) == "XXXX-XXXX"


def test_nominee_audit_classification():
    accounts = [
        {
            "id": "1",
            "name": "Zerodha Demat",
            "account_type": "Demat",
            "account_number": "1208160012345678",
            "nominee_status": "CONFIRMED",
            "nominee_name": "Pooja Thakur",
            "relationship": "Spouse",
        },
        {
            "id": "2",
            "name": "Axis MF Folio",
            "account_type": "Mutual Fund Folio",
            "account_number": "9988776612",
            "nominee_status": "MISSING",
            "nominee_name": None,
        },
        {
            "id": "3",
            "name": "HDFC Fixed Deposit",
            "account_type": "Fixed Deposit",
            "account_number": "503019283746",
            "nominee_status": "UNKNOWN",
            "nominee_name": None,
        },
    ]

    res = audit_portfolio_nominees(accounts)
    assert res.accounts_checked == 3
    assert res.accounts_confirmed == 1
    assert res.accounts_missing == 1
    assert res.accounts_unknown == 1
    assert res.is_fully_compliant is False

    # UNKNOWN != MISSING
    # Only 1 red flag for the MISSING account, NOT for the UNKNOWN account!
    assert len(res.red_flags) == 1
    flag = res.red_flags[0]
    assert flag["account_name"] == "Axis MF Folio"
    assert flag["account_number"] == "******1212" or "12" in flag["account_number"]
    assert "missing" in flag["warning"].lower()


def test_nominee_100_percent_compliant():
    accounts = [
        {
            "id": "1",
            "name": "Zerodha Demat",
            "nominee_status": "CONFIRMED",
            "nominee_name": "Pooja Thakur",
        },
        {
            "id": "2",
            "name": "Groww Demat",
            "nominee_status": "VERIFIED",
            "nominee_name": "Pooja Thakur",
        },
    ]
    res = audit_portfolio_nominees(accounts)
    assert res.accounts_checked == 2
    assert res.accounts_confirmed == 2
    assert res.accounts_missing == 0
    assert res.compliance_percentage == 100.0
    assert res.is_fully_compliant is True
    assert len(res.red_flags) == 0
