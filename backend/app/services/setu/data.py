from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.services.setu.client import SetuClient


class SetuDataService:

    def __init__(self):
        self.client = SetuClient()

    async def create_session(
        self,
        consent_id: str,
        data_from: str,
        data_to: str,
    ) -> dict[str, Any]:

        payload = {
            "consentId": consent_id,

            "dataRange": {
                "from": data_from,
                "to": data_to,
            },

            "format": "json",
        }

        return await self.client.create_data_session(payload)

    async def get_session(
        self,
        session_id: str,
    ) -> dict[str, Any]:

        return await self.client.get_data_session(
            session_id
        )

    async def create_session_for_consent(
        self,
        consent_id: str,
    ) -> dict[str, Any]:
        """
        Fetch the consent first, then create a data session
        using the same data range.
        """

        consent = await self.client.get_consent(
            consent_id
        )

        detail = consent.get("detail", {})

        data_range = detail.get("dataRange")

        if not data_range:
            # fallback
            now = datetime.now(timezone.utc)

            data_range = {
                "from": now.replace(
                    year=now.year - 1
                ).isoformat(),

                "to": now.isoformat(),
            }

        return await self.create_session(
            consent_id=consent_id,
            data_from=data_range["from"],
            data_to=data_range["to"],
        )

    def extract_accounts(
        self,
        data_session: dict,
    ) -> list[dict]:
        """
        Extract account objects from Setu's FI response.

        This intentionally does not assume every FIP uses
        exactly the same optional fields.
        """

        accounts: list[dict] = []

        for fip in data_session.get("fips", []) or []:

            for account in fip.get("accounts", []) or []:

                data = account.get("data") or {}

                accounts.append(
                    {
                        "fip_id": fip.get("fipId"),

                        "link_ref_number": account.get(
                            "linkRefNumber"
                        ),

                        "masked_account_number": account.get(
                            "maskedAccNumber"
                        ),

                        "status": account.get(
                            "status"
                        ),

                        "data": data,
                    }
                )

        return accounts

    def extract_transactions(
        self,
        data_session: dict,
    ) -> list[dict]:
        """
        Best-effort transaction extraction from
        ReBIT-style deposit FI data.
        """

        transactions = []

        for account in self.extract_accounts(
            data_session
        ):

            data = account.get("data") or {}

            account_data = data.get("account") or {}

            txns = (
                account_data
                .get("transactions", {})
                .get("transaction", [])
            )

            for txn in txns or []:
                transactions.append(
                    {
                        "account": account.get(
                            "masked_account_number"
                        ),
                        **txn,
                    }
                )

        return transactions