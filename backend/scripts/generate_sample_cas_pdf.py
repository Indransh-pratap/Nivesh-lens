#!/usr/bin/env python3
"""
Generate realistic sample CAMS/KFintech CAS PDFs for testing the Smart CAS PDF Parser.
Generates:
1. test-data/cams_sample_unlocked.pdf (no password)
2. test-data/cams_sample_password_protected.pdf (encrypted with password: 'password123')
"""
from pathlib import Path
from pypdf import PdfWriter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import io

SAMPLE_CAS_TEXT = """Consolidated Account Statement
Statement Period: 01-Jan-2024 to 31-Dec-2024
Investor Name: Anubhav Thakur | PAN: ABCDE1234F

Folio No: 10293847 / 01
AMC: Nippon India Mutual Fund | PAN: ABCDE1234F
Nominee 1: Pooja Thakur

Nippon India Small Cap Fund - Direct Plan - Growth ISIN: INF204K01E03
Advisor: DIRECT
Date Description Amount (Rs.) Units NAV (Rs.) Unit Balance
01-Jan-2024 Purchase 1,00,000.00 700.500 142.75 700.500
15-Mar-2024 SIP Purchase - Instalment 1 10,000.00 68.200 146.62 768.700
15-Apr-2024 SIP Purchase - Instalment 2 10,000.00 67.500 148.15 836.200
20-Jun-2024 Switch In 50,000.00 330.120 151.46 1,166.320
15-Sep-2024 Redemption -25,000.00 -160.200 156.05 1,006.120
10-Oct-2024 Dividend Reinvestment 2,500.00 15.800 158.22 1,021.920
Closing Unit Balance: 1,021.920 NAV as on 31-Dec-2024: Rs. 165.40 Value: Rs. 1,69,025.57

Folio No: 88776655 / 99
AMC: Mirae Asset Mutual Fund | PAN: ABCDE1234F
Nominee: Not Registered

Mirae Asset Large Cap Fund - Direct Plan - Growth ISIN: INF769K01010
Advisor: DIRECT
Date Description Amount (Rs.) Units NAV (Rs.) Unit Balance
05-Feb-2024 Purchase 50,000.00 520.400 96.08 520.400
Closing Unit Balance: 520.400 NAV as on 31-Dec-2024: Rs. 112.50 Value: Rs. 58,545.00
"""

def create_raw_pdf_bytes() -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.setFont("Courier", 9)
    
    y = 750
    for line in SAMPLE_CAS_TEXT.strip().split("\n"):
        c.drawString(40, y, line)
        y -= 13
        if y < 40:
            c.showPage()
            c.setFont("Courier", 9)
            y = 750
            
    c.save()
    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data

def main():
    target_dir = Path(__file__).resolve().parent.parent / "test-data"
    target_dir.mkdir(parents=True, exist_ok=True)
    
    raw_pdf = create_raw_pdf_bytes()
    
    # 1. Unlocked sample
    unlocked_path = target_dir / "cams_sample_unlocked.pdf"
    with open(unlocked_path, "wb") as f:
        f.write(raw_pdf)
    print(f"Created unlocked sample: {unlocked_path}")
    
    # 2. Password protected sample
    reader_buf = io.BytesIO(raw_pdf)
    writer = PdfWriter(clone_from=reader_buf)
    writer.encrypt("password123")
    
    protected_path = target_dir / "cams_sample_password_protected.pdf"
    with open(protected_path, "wb") as f:
        writer.write(f)
    print(f"Created password-protected sample (password='password123'): {protected_path}")

if __name__ == "__main__":
    main()
