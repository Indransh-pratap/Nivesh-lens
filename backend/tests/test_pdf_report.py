from decimal import Decimal
import pytest

from app.services.reports.pdf_generator import generate_portfolio_diagnostic_pdf


def test_generate_portfolio_diagnostic_pdf_bytes():
    mock_diagnostics = {
        "portfolio_id": "test-port-1",
        "total_value": Decimal("1500000.00"),
        "diversification_score": {
            "score": 780,
            "rating": "Healthy Portfolio",
            "pillars": {
                "single_company_exposure": {
                    "score": 80.0,
                    "max_score": 100,
                    "weight_percent": 35.0,
                    "status": "Healthy",
                    "note": "Top exposure under control.",
                },
                "asset_spread": {
                    "score": 75.0,
                    "max_score": 100,
                    "weight_percent": 25.0,
                    "status": "Optimal",
                    "note": "Good equity/debt spread.",
                },
                "scheme_overlap_ter": {
                    "score": 70.0,
                    "max_score": 100,
                    "weight_percent": 20.0,
                    "status": "Moderate",
                    "note": "Low overlap.",
                },
                "nominee_compliance": {
                    "score": 90.0,
                    "max_score": 100,
                    "weight_percent": 20.0,
                    "status": "Compliant",
                    "note": "All accounts registered.",
                },
            },
        },
        "concentration": {
            "hhi_score": 1450.0,
            "inverse_hhi_effective_count": 6.9,
            "category": "Diversified",
        },
        "top_company_exposures": [
            {
                "company_name": "Reliance Industries Ltd",
                "isin": "INE002A01018",
                "direct_value": Decimal("200000.00"),
                "mutual_fund_value": Decimal("50000.00"),
                "combined_value": Decimal("250000.00"),
                "combined_percent": Decimal("16.67"),
            }
        ],
        "fee_analysis": {
            "total_annual_cost": 15000,
            "regular_plan_annual_bleed": 8000,
            "potential_duplicate_ter_cost": 3000,
            "compounded_loss_projections": {
                "5_year": 95000,
                "10_year": 265000,
                "15_year": 560000,
                "20_year": 1080000,
            },
        },
        "nominee_audit": {
            "accounts_checked": 3,
            "accounts_confirmed": 2,
            "accounts_missing": 0,
            "accounts_unknown": 1,
            "accounts": [
                {
                    "account_name": "Zerodha Demat",
                    "account_type": "Demat",
                    "masked_account_number": "************1234",
                    "nominee_status": "CONFIRMED",
                    "nominee_name": "Pooja Thakur",
                }
            ],
        },
    }

    pdf_bytes = generate_portfolio_diagnostic_pdf(
        portfolio_name="Retirement Corpus",
        diagnostics=mock_diagnostics,
        client_name="Anubhav Thakur",
    )

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000
    # PDF Magic Header
    assert pdf_bytes.startswith(b"%PDF-")


def test_pdf_endpoint(client):
    create_resp = client.post("/api/portfolios", json={"name": "PDF Export Test"})
    assert create_resp.status_code == 201
    port_id = create_resp.json()["id"]

    pdf_resp = client.get(f"/api/portfolios/{port_id}/pdf")
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["Content-Type"] == "application/pdf"
    assert "attachment" in pdf_resp.headers["Content-Disposition"]
    assert pdf_resp.content.startswith(b"%PDF-")
