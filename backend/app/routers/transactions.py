from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
import re

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/", response_model=list[schemas.TransactionOut])
def get_transactions(db: Session = Depends(get_db)):
    return db.query(models.Transaction).order_by(models.Transaction.created_at.desc()).all()


@router.post("/", response_model=schemas.TransactionOut)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db)):
    db_transaction = models.Transaction(**transaction.model_dump())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction


@router.put("/{tx_id}/void", response_model=schemas.TransactionOut)
def void_transaction(tx_id: int, req: schemas.VoidRequest, db: Session = Depends(get_db)):
    print(f"DEBUG: Voiding transaction {tx_id} with PIN {req.pin}")
    # 1. Verify PIN and Role (Dev only)
    employee = db.query(models.Employee).filter(models.Employee.pin == req.pin).first()
    if not employee:
        raise HTTPException(status_code=403, detail="Invalid PIN")
    allowed_roles = ["dev", "admin", "manager", "owner"]
    if employee.role.lower() not in allowed_roles:
        raise HTTPException(status_code=403, detail=f"Permission denied. Required roles: {', '.join(allowed_roles)}. Your role: {employee.role}")

    # 2. Fetch Transaction
    txn = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn.status == "VOIDED":
        raise HTTPException(status_code=400, detail="Transaction is already voided")

    # 3. Handle EWALLET Refund
    if txn.type == "SALE" and txn.method == "EWALLET" and txn.desc:
        # Extract member name from desc (e.g., "ขายให้: John (Espresso x1)")
        match = re.search(r'ขายให้:\s*([^\(]+)', txn.desc)
        if match:
            member_name = match.group(1).strip()
            member = db.query(models.Member).filter(models.Member.name == member_name).first()
            if member:
                # Refund the amount
                member.wallet = (member.wallet or 0.0) + txn.amount
                db.add(member)

    # Note: What about TOPUP? If a TOPUP is voided, we should deduct from wallet.
    if txn.type == "TOPUP" and txn.desc:
        match = re.search(r'เติมเงินให้:\s*(.*)', txn.desc)
        if match:
            member_name = match.group(1).strip()
            member = db.query(models.Member).filter(models.Member.name == member_name).first()
            if member:
                member.wallet = max(0.0, (member.wallet or 0.0) - txn.amount)
                db.add(member)

    # 4. Mark as VOIDED and save reason
    txn.status = "VOIDED"
    txn.void_reason = req.reason
    db.commit()
    db.refresh(txn)
    return txn