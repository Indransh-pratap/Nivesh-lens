import io
from datetime import datetime
from decimal import Decimal
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def generate_portfolio_diagnostic_pdf(
    portfolio_name: str,
    diagnostics: dict[str, Any],
    client_name: str = "Valued Investor",
) -> bytes:
    """
    Generates a professional, institutional-grade PDF Portfolio Diagnostic Report.
    Adheres strictly to Phase 1 specs:
    - Diversification Health Score (300-900) + 4 Explainable Pillars
    - HHI Concentration Index (0-10,000) & Effective constituent count
    - True Company Exposure (Direct + Indirect look-through)
    - Wasted Fee & Duplicate TER Breakdown + Compounded Loss Horizon
    - Legal Nominee & Unclaimed Wealth Audit (Masked accounts, UNKNOWN != MISSING)
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Modern FinTech Color Palette
    PRIMARY = colors.HexColor("#0F172A")    # Slate 900
    SECONDARY = colors.HexColor("#1E293B")  # Slate 800
    ACCENT = colors.HexColor("#2563EB")     # Royal Blue
    SUCCESS = colors.HexColor("#059669")    # Emerald 600
    WARNING = colors.HexColor("#D97706")    # Amber 600
    DANGER = colors.HexColor("#DC2626")     # Rose/Red 600
    MUTED = colors.HexColor("#64748B")      # Slate 500
    BG_LIGHT = colors.HexColor("#F8FAFC")   # Slate 50
    BORDER_COLOR = colors.HexColor("#E2E8F0")

    # Custom typography styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=PRIMARY,
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=MUTED,
    )
    h2_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=PRIMARY,
        spaceBefore=10,
        spaceAfter=4,
    )
    cell_bold = ParagraphStyle(
        "CellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=PRIMARY,
    )
    cell_normal = ParagraphStyle(
        "CellNormal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=SECONDARY,
    )
    cell_muted = ParagraphStyle(
        "CellMuted",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=10,
        textColor=MUTED,
    )
    badge_green = ParagraphStyle(
        "BadgeGreen",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=SUCCESS,
    )
    badge_red = ParagraphStyle(
        "BadgeRed",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=DANGER,
    )
    badge_amber = ParagraphStyle(
        "BadgeAmber",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=WARNING,
    )

    story = []

    # 1. Header Banner
    header_data = [
        [
            Paragraph(f"<b>NIVESH LENS</b> | Institutional Portfolio X-Ray", subtitle_style),
            Paragraph(f"Date: <b>{datetime.now().strftime('%d %b %Y')}</b>", subtitle_style),
        ],
        [
            Paragraph(f"Portfolio Diagnostic Audit: <b>{portfolio_name}</b>", title_style),
            Paragraph(f"Client: <b>{client_name}</b>", subtitle_style),
        ]
    ]
    header_table = Table(header_data, colWidths=[380, 160])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT, spaceAfter=12))

    # 2. Executive Scorecards
    health = diagnostics.get("diversification_score") or {}
    health_val = health.get("score") or 0
    health_rating = health.get("rating") or "N/A"
    total_val = float(diagnostics.get("total_value") or 0)

    conc = diagnostics.get("concentration") or {}
    hhi = conc.get("hhi_score") or 0
    eff_count = conc.get("inverse_hhi_effective_count") or 0
    conc_cat = conc.get("category") or "N/A"

    fee = diagnostics.get("fee_analysis") or {}
    annual_cost = fee.get("total_annual_cost") or 0
    reg_bleed = fee.get("regular_plan_annual_bleed") or 0

    nom = diagnostics.get("nominee_audit") or {}
    nom_confirmed = nom.get("accounts_confirmed") or 0
    nom_missing = nom.get("accounts_missing") or 0
    nom_unknown = nom.get("accounts_unknown") or 0

    score_cards = [
        [
            Paragraph("<b>HEALTH SCORE</b>", cell_muted),
            Paragraph("<b>TOTAL WEALTH</b>", cell_muted),
            Paragraph("<b>HHI CONCENTRATION</b>", cell_muted),
            Paragraph("<b>ANNUAL FEE BLEED</b>", cell_muted),
            Paragraph("<b>NOMINEE SAFEGUARD</b>", cell_muted),
        ],
        [
            Paragraph(f"<font size=14 color='{SUCCESS.hexval()}'><b>{health_val}</b></font> / 900", cell_normal),
            Paragraph(f"<font size=12><b>₹{total_val:,.0f}</b></font>", cell_normal),
            Paragraph(f"<font size=12><b>{hhi:,.0f}</b></font> ({eff_count} eq)", cell_normal),
            Paragraph(f"<font size=12 color='{DANGER.hexval()}'><b>₹{annual_cost:,.0f}</b></font>/yr", cell_normal),
            Paragraph(f"<b>{nom_confirmed}</b> Ok, <b>{nom_missing}</b> Req", cell_normal),
        ],
        [
            Paragraph(f"<b>{health_rating}</b>", badge_green if health_val >= 700 else badge_amber),
            Paragraph("Total Ingested", cell_muted),
            Paragraph(f"{conc_cat}", cell_muted),
            Paragraph(f"₹{reg_bleed:,.0f} Comm.", cell_muted),
            Paragraph(f"{nom_unknown} Undisclosed", cell_muted),
        ]
    ]
    card_table = Table(score_cards, colWidths=[108, 108, 108, 108, 108])
    card_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))
    story.append(card_table)
    story.append(Spacer(1, 14))

    # 3. Four Pillars of Health Score
    story.append(Paragraph("1. Health Score Breakdown (Proprietary 300–900 Scale)", h2_style))
    pillars = health.get("pillars", {})
    pillar_rows = [
        [
            Paragraph("<b>Pillar</b>", cell_bold),
            Paragraph("<b>Weight</b>", cell_bold),
            Paragraph("<b>Score</b>", cell_bold),
            Paragraph("<b>Status</b>", cell_bold),
            Paragraph("<b>Diagnostic Finding / Impact</b>", cell_bold),
        ]
    ]
    pillar_keys = [
        ("Single-Company Exposure", "single_company_exposure"),
        ("Asset Class Spread", "asset_spread"),
        ("Scheme Overlap & TER", "scheme_overlap_ter"),
        ("Nominee Safeguard", "nominee_compliance"),
    ]
    for label, key in pillar_keys:
        p = pillars.get(key) or {}
        p_score = p.get("score") or 0
        p_max = p.get("max_score") or 100
        p_wt = p.get("weight_percent") or 0
        p_status = p.get("status") or "N/A"
        p_note = p.get("note") or ""
        style = badge_green if p_score >= 70 else (badge_amber if p_score >= 50 else badge_red)
        pillar_rows.append([
            Paragraph(label, cell_bold),
            Paragraph(f"{p_wt:.0f}%", cell_normal),
            Paragraph(f"{p_score:.1f} / {p_max}", cell_normal),
            Paragraph(p_status, style),
            Paragraph(p_note, cell_normal),
        ])

    p_table = Table(pillar_rows, colWidths=[130, 45, 65, 75, 225])
    p_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(p_table)
    story.append(Spacer(1, 14))

    # 4. Top Company Exposures (Look-Through)
    story.append(Paragraph("2. Combined True Company Exposure (Direct + Indirect Look-Through)", h2_style))
    top_exposures = diagnostics.get("top_company_exposures", [])[:6]
    exp_rows = [
        [
            Paragraph("<b>Company / Security</b>", cell_bold),
            Paragraph("<b>ISIN</b>", cell_bold),
            Paragraph("<b>Direct ₹</b>", cell_bold),
            Paragraph("<b>Indirect (via MF) ₹</b>", cell_bold),
            Paragraph("<b>Total Combined ₹</b>", cell_bold),
            Paragraph("<b>Exposure %</b>", cell_bold),
        ]
    ]
    for item in top_exposures:
        c_name = item.get("company_name", "Unknown")
        isin = item.get("isin") or "—"
        d_val = float(item.get("direct_value", 0))
        mf_val = float(item.get("mutual_fund_value", 0))
        tot_val = float(item.get("combined_value", 0))
        tot_pct = float(item.get("combined_percent", 0))
        exp_rows.append([
            Paragraph(c_name, cell_bold),
            Paragraph(isin, cell_muted),
            Paragraph(f"₹{d_val:,.0f}", cell_normal),
            Paragraph(f"₹{mf_val:,.0f}", cell_normal),
            Paragraph(f"₹{tot_val:,.0f}", cell_bold),
            Paragraph(f"<b>{tot_pct:.2f}%</b>", badge_red if tot_pct > 10 else cell_bold),
        ])

    if len(exp_rows) == 1:
        exp_rows.append([Paragraph("No equity exposures found.", cell_normal), Paragraph("", cell_normal), Paragraph("", cell_normal), Paragraph("", cell_normal), Paragraph("", cell_normal), Paragraph("", cell_normal)])

    exp_table = Table(exp_rows, colWidths=[150, 75, 75, 95, 85, 60])
    exp_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
    ]))
    story.append(exp_table)
    story.append(Spacer(1, 14))

    # 5. Wasted Fee Analysis & Compounding
    story.append(Paragraph("3. Wasted Fee & Duplicate Expense Ratio Audit", h2_style))
    projections = fee.get("compounded_loss_projections", {})
    loss5 = projections.get("5_year", 0)
    loss10 = projections.get("10_year", 0)
    loss15 = projections.get("15_year", 0)
    loss20 = projections.get("20_year", 0)
    dup_cost = fee.get("potential_duplicate_ter_cost", 0)

    fee_summary_rows = [
        [
            Paragraph("<b>Fee Category</b>", cell_bold),
            Paragraph("<b>Annual Cost</b>", cell_bold),
            Paragraph("<b>Wealth Compounding Loss (12% CAGR Opportunity Cost)</b>", cell_bold),
        ],
        [
            Paragraph("Regular Plan Broker Commission Bleed", cell_normal),
            Paragraph(f"₹{reg_bleed:,.0f} / yr", cell_bold),
            Paragraph(f"5-Year Loss: <b>₹{loss5:,.0f}</b>", cell_normal),
        ],
        [
            Paragraph("Estimated Duplicate TER (Stock Overlap)", cell_normal),
            Paragraph(f"₹{dup_cost:,.0f} / yr", cell_bold),
            Paragraph(f"10-Year Loss: <b>₹{loss10:,.0f}</b>", cell_normal),
        ],
        [
            Paragraph("<b>Total Annual Wasted Wealth Leakage</b>", cell_bold),
            Paragraph(f"<font color='{DANGER.hexval()}'><b>₹{annual_cost:,.0f} / yr</b></font>", cell_bold),
            Paragraph(f"20-Year Loss: <font color='{DANGER.hexval()}'><b>₹{loss20:,.0f}</b></font>", cell_bold),
        ],
    ]
    fee_table = Table(fee_summary_rows, colWidths=[200, 110, 230])
    fee_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(fee_table)
    story.append(Spacer(1, 14))

    # 6. Nominee Audit
    story.append(Paragraph("4. Nominee & Unclaimed Wealth Compliance Audit", h2_style))
    accounts = nom.get("accounts", [])
    nom_rows = [
        [
            Paragraph("<b>Account / Holding</b>", cell_bold),
            Paragraph("<b>Category</b>", cell_bold),
            Paragraph("<b>Masked Account #</b>", cell_bold),
            Paragraph("<b>Nominee Status</b>", cell_bold),
            Paragraph("<b>Registered Nominee</b>", cell_bold),
        ]
    ]
    for acc in accounts[:6]:
        acc_name = acc.get("account_name", "Account")
        acc_type = acc.get("account_type", "MF")
        acc_num = acc.get("masked_account_number", "****")
        status = acc.get("nominee_status", "UNKNOWN")
        nom_name = acc.get("nominee_name") or ("Registered" if status == "CONFIRMED" else ("Missing" if status == "MISSING" else "Undisclosed"))
        badge = badge_green if status == "CONFIRMED" else (badge_red if status == "MISSING" else badge_amber)
        nom_rows.append([
            Paragraph(acc_name, cell_bold),
            Paragraph(acc_type, cell_normal),
            Paragraph(acc_num, cell_muted),
            Paragraph(status, badge),
            Paragraph(nom_name, cell_normal),
        ])

    if len(nom_rows) == 1:
        nom_rows.append([Paragraph("No accounts audited.", cell_normal), Paragraph("", cell_normal), Paragraph("", cell_normal), Paragraph("", cell_normal), Paragraph("", cell_normal)])

    nom_table = Table(nom_rows, colWidths=[160, 95, 105, 80, 100])
    nom_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(nom_table)
    story.append(Spacer(1, 16))

    # 7. Disclaimer
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceAfter=6))
    disclaimer_text = (
        "<b>DISCLAIMER:</b> This report is generated strictly using deterministic mathematical modeling "
        "and data extracted from your uploaded CAS statements or verified Account Aggregator sync. "
        "No generative AI is used in calculating scores. Past performance does not guarantee future results. "
        "Consult a SEBI-registered investment advisor (RIA) before making allocation decisions."
    )
    story.append(Paragraph(disclaimer_text, cell_muted))

    # Build document
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
