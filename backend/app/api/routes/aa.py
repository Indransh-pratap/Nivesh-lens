from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import hashlib
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.security import get_current_user_id
from app.core.config import settings
from app.db.dependencies import get_db
from app.models.aa import AAConsent, AASync, BankAccount, BankTransaction
from app.services.setu.client import SetuClient
from app.services.setu.consent import create_account_aggregator_consent

router=APIRouter(prefix="/api/aa",tags=["Account Aggregator"])
client=SetuClient()
class ConsentRequest(BaseModel):
    mobile_number:str=Field(min_length=10,max_length=15); redirect_url:str|None=None

def _dt(value):
    if not value: return None
    try: return datetime.fromisoformat(str(value).replace("Z","+00:00"))
    except ValueError: return None
def _money(value):
    try: return Decimal(str(value)) if value is not None else None
    except (InvalidOperation, ValueError): return None
def _session_response(sync): return {"session_id":sync.session_id,"status":sync.status,"error":sync.error_message,"completed_at":sync.completed_at}

@router.post("/consent")
async def create_consent(request:ConsentRequest, db:Session=Depends(get_db), user_id:str=Depends(get_current_user_id)):
    try:
        result=await create_account_aggregator_consent(request.mobile_number,request.redirect_url)
        detail=result.get("detail") or {}; rng=detail.get("dataRange") or {}
        row=AAConsent(user_id=user_id,consent_id=result["consent_id"],status=result.get("status","PENDING"),environment=settings.setu_environment.upper(),data_from=rng.get("from"),data_to=rng.get("to")); db.add(row); db.commit()
        return {"consent_id":row.consent_id,"consent_url":result["consent_url"],"status":row.status,"provenance":row.environment}
    except ValueError as e: raise HTTPException(422,detail=str(e)) from e
    except Exception as e: raise HTTPException(502,detail="Unable to create the Account Aggregator consent.") from e

async def _refresh_consent(row, db):
    result=await client.get_consent(row.consent_id); detail=result.get("detail") or {}; rng=detail.get("dataRange") or {}
    row.status=str(result.get("status","UNKNOWN")).upper(); row.data_from=rng.get("from",row.data_from); row.data_to=rng.get("to",row.data_to); db.commit(); return result

@router.get("/consent/{consent_id}")
async def consent_status(consent_id:str, db:Session=Depends(get_db), user_id:str=Depends(get_current_user_id)):
    row=db.scalar(select(AAConsent).where(AAConsent.consent_id==consent_id,AAConsent.user_id==user_id))
    if not row: raise HTTPException(404,detail="Consent not found")
    try: result=await _refresh_consent(row,db)
    except Exception as e: raise HTTPException(502,detail="Unable to check consent status.") from e
    return {"consent_id":row.consent_id,"status":row.status,"accounts_linked":result.get("accountsLinked") or []}

def _persist(session_data, consent, sync, db):
    now=datetime.now(timezone.utc)
    for fip in session_data.get("fips") or []:
      for entry in fip.get("accounts") or []:
        data=entry.get("data") or entry.get("decryptedFI") or {}; account=data.get("account") or {}; link=entry.get("linkRefNumber") or account.get("linkedAccRef")
        if not link: continue
        bank=db.scalar(select(BankAccount).where(BankAccount.user_id==consent.user_id,BankAccount.link_ref_number==str(link)))
        summary=account.get("summary") or {}
        if not bank:
            bank=BankAccount(user_id=consent.user_id,consent_id=consent.id,link_ref_number=str(link)); db.add(bank); db.flush()
        bank.masked_account_number=entry.get("maskedAccNumber") or account.get("maskedAccNumber"); bank.bank_name=fip.get("fipID") or fip.get("fipId"); bank.account_type=summary.get("type") or account.get("type"); bank.currency=summary.get("currency"); bank.current_balance=_money(summary.get("currentBalance")); bank.balance_at=_dt(summary.get("balanceDateTime")); bank.last_synced_at=now
        txs=((account.get("transactions") or {}).get("transaction") or [])
        for tx in txs:
            when=_dt(tx.get("transactionTimestamp") or tx.get("valueDate"))
            amount=_money(tx.get("amount"))
            if not when or amount is None: continue
            external=str(tx.get("txnId") or tx.get("reference") or hashlib.sha256((str(link)+str(when)+str(amount)+str(tx.get("narration",""))).encode()).hexdigest())
            exists=db.scalar(select(BankTransaction.id).where(BankTransaction.bank_account_id==bank.id,BankTransaction.external_id==external))
            if not exists: db.add(BankTransaction(user_id=consent.user_id,bank_account_id=bank.id,external_id=external,transaction_at=when,description=tx.get("narration"),amount=amount,currency=summary.get("currency"),transaction_type=tx.get("type"),status=tx.get("status"),available_balance=_money(tx.get("currentBalance"))))
    sync.status=str(session_data.get("status","COMPLETED")).upper(); sync.completed_at=now; db.commit()

@router.post("/consent/{consent_id}/data-session")
async def create_session(consent_id:str, db:Session=Depends(get_db), user_id:str=Depends(get_current_user_id)):
    row=db.scalar(select(AAConsent).where(AAConsent.consent_id==consent_id,AAConsent.user_id==user_id))
    if not row: raise HTTPException(404,detail="Consent not found")
    try: await _refresh_consent(row,db)
    except Exception as e: raise HTTPException(502,detail="Unable to check consent status.") from e
    if row.status not in {"ACTIVE","APPROVED"}: raise HTTPException(409,detail=f"Consent is awaiting approval ({row.status}).")
    if not row.data_from or not row.data_to: raise HTTPException(502,detail="Approved consent does not include an authorized data range.")
    existing=db.scalar(select(AASync).where(AASync.consent_id==row.id,AASync.status.in_(["PENDING","PARTIAL"])).order_by(AASync.created_at.desc()))
    if existing: return _session_response(existing)
    try: remote=await client.create_data_session(row.consent_id,row.data_from,row.data_to)
    except Exception as e: raise HTTPException(502,detail="Unable to create the data session.") from e
    sid=remote.get("id") or remote.get("sessionId")
    if not sid: raise HTTPException(502,detail="Setu did not return a data-session ID.")
    sync=AASync(user_id=user_id,consent_id=row.id,session_id=str(sid),status=str(remote.get("status","PENDING")).upper()); db.add(sync); db.commit(); return _session_response(sync)

@router.post("/sessions/{session_id}/poll")
async def poll_session(session_id:str, db:Session=Depends(get_db), user_id:str=Depends(get_current_user_id)):
    sync=db.scalar(select(AASync).where(AASync.session_id==session_id,AASync.user_id==user_id));
    if not sync: raise HTTPException(404,detail="Data session not found")
    if sync.status in {"COMPLETED","PARTIAL"}: return _session_response(sync)
    try: remote=await client.get_data_session(session_id)
    except Exception as e: raise HTTPException(502,detail="Unable to check data-session status.") from e
    status=str(remote.get("status","PENDING")).upper(); sync.status=status
    if status in {"COMPLETED","PARTIAL"}:
        consent=db.get(AAConsent,sync.consent_id); _persist(remote,consent,sync,db)
    elif status in {"FAILED","EXPIRED"}: sync.error_message="Setu could not prepare financial information."; db.commit()
    else: db.commit()
    return _session_response(sync)

@router.get("/accounts")
def accounts(db:Session=Depends(get_db),user_id:str=Depends(get_current_user_id)):
    rows=db.scalars(select(BankAccount).where(BankAccount.user_id==user_id).order_by(BankAccount.last_synced_at.desc())).all()
    return [{"id":str(x.id),"bank_name":x.bank_name,"masked_account_number":x.masked_account_number,"balance":x.current_balance,"currency":x.currency,"balance_at":x.balance_at,"last_synced_at":x.last_synced_at} for x in rows]

@router.get("/transactions")
def transactions(page:int=1,page_size:int=50,db:Session=Depends(get_db),user_id:str=Depends(get_current_user_id)):
    page=max(page,1); page_size=min(max(page_size,1),100); rows=db.execute(select(BankTransaction,BankAccount).join(BankAccount).where(BankTransaction.user_id==user_id).order_by(BankTransaction.transaction_at.desc()).offset((page-1)*page_size).limit(page_size)).all()
    return {"items":[{"id":str(t.id),"transaction_at":t.transaction_at,"description":t.description,"amount":t.amount,"currency":t.currency,"type":t.transaction_type,"status":t.status,"available_balance":t.available_balance,"account":a.masked_account_number,"bank_name":a.bank_name} for t,a in rows],"page":page}
