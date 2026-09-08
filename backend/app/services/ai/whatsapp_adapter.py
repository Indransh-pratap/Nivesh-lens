import datetime
import logging
import uuid
from typing import Any
from sqlalchemy.orm import Session


from app.models.portfolio import Portfolio
from app.schemas.ai import WhatsAppMessageRequest, WhatsAppMessageResponse
from app.services.ai.ask_portfolio import ask_my_portfolio
from app.services.ai.security import sanitize_pii

logger = logging.getLogger(__name__)


def process_whatsapp_query(
    payload: WhatsAppMessageRequest,
    authenticated_user_id: str,
    db: Session,
) -> WhatsAppMessageResponse:
    """
    WhatsApp Adapter for Portfolio AI Assistant:
    1. Authenticates incoming user context
    2. Resolves primary user portfolio
    3. Runs Ask My Portfolio pipeline with deterministic tools
    4. Formats clean, mobile-friendly WhatsApp response
    5. Strips sensitive PII, OTPs, and tokens
    6. Strictly rejects any transaction or redemption request
    """
    # 1. Check for prohibited transactional requests
    lower_msg = payload.message.lower()
    prohibited_keywords = ["buy", "sell", "redeem", "transfer", "withdraw", "invest", "execute", "cancel sip"]
    if any(k in lower_msg for k in prohibited_keywords):
        return WhatsAppMessageResponse(
            sender_phone=payload.sender_phone,
            reply_text=(
                "⚠️ *Transaction Restricted*\n\n"
                "Nivesh-Lens AI Assistant is an informational analytics tool and cannot execute trades, "
                "redemptions, or money transfers. Please execute transactions directly through your verified broker or AMC portal."
            ),
            tools_used=[],
            timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        )

    # 2. Resolve portfolio
    portfolio = None
    if payload.portfolio_id:
        try:
            pid = uuid.UUID(payload.portfolio_id) if isinstance(payload.portfolio_id, str) else payload.portfolio_id
            portfolio = db.query(Portfolio).filter(
                Portfolio.id == pid,
                Portfolio.user_id == authenticated_user_id,
            ).first()
        except (ValueError, AttributeError):
            portfolio = None


    if not portfolio:
        portfolio = db.query(Portfolio).filter(Portfolio.user_id == authenticated_user_id).first()

    if not portfolio:
        return WhatsAppMessageResponse(
            sender_phone=payload.sender_phone,
            reply_text=(
                "👋 *Welcome to Nivesh-Lens*\n\n"
                "No active portfolio was found for your registered account. "
                "Please import your CAS statement on the web portal to begin querying your portfolio."
            ),
            tools_used=[],
            timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        )

    # 3. Query portfolio assistant
    clean_question = sanitize_pii(payload.message)
    answer_obj = ask_my_portfolio(portfolio.id, clean_question, db)

    # 4. Format for WhatsApp markdown
    facts_str = "\n".join(f"• {f}" for f in answer_obj.supporting_facts[:3])
    formatted_reply = (
        f"📊 *Nivesh-Lens Insights*\n\n"
        f"{answer_obj.answer}\n\n"
        f"*Key Facts:*\n{facts_str}\n\n"
        f"_Grounded in verified backend analytics._"
    )

    return WhatsAppMessageResponse(
        sender_phone=payload.sender_phone,
        reply_text=formatted_reply,
        tools_used=answer_obj.tools_consulted,
        timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    )
