from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

# pyrefly: ignore [missing-import]
from ..database import get_db
from .. import models
# pyrefly: ignore [missing-import]
from ..schemas import MemberCreate, MemberUpdate, MemberOut

router = APIRouter(prefix="/members", tags=["members"])


# GET /members/ — ดึงรายชื่อสมาชิกทั้งหมด
@router.get("/", response_model=list[MemberOut])
def get_members(db: Session = Depends(get_db)):
    return db.query(models.Member).order_by(models.Member.id.desc()).all()


# GET /members/{id} — ดึงสมาชิกรายคน
@router.get("/{member_id}", response_model=MemberOut)
def get_member(member_id: int, db: Session = Depends(get_db)):
    member = db.query(models.Member).filter(models.Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member


# POST /members/ — เพิ่มสมาชิกใหม่
@router.post("/", response_model=MemberOut, status_code=201)
def create_member(data: MemberCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Member).filter(models.Member.phone == data.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="เบอร์โทรนี้มีในระบบแล้ว")

    member = models.Member(**data.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


# PUT /members/{id} — แก้ไขข้อมูล / เติม wallet / อัปเดต points
@router.put("/{member_id}", response_model=MemberOut)
def update_member(member_id: int, data: MemberUpdate, db: Session = Depends(get_db)):
    member = db.query(models.Member).filter(models.Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member.name = data.name
    member.phone = data.phone
    member.pin = data.pin
    if data.points is not None:
        member.points = data.points
    if data.wallet is not None:
        member.wallet = data.wallet
    if data.age is not None:
        member.age = data.age
    if data.dob is not None:
        member.dob = data.dob

    db.commit()
    db.refresh(member)
    return member


# DELETE /members/{id} — ลบสมาชิก
@router.delete("/{member_id}", status_code=204)
def delete_member(member_id: int, db: Session = Depends(get_db)):
    member = db.query(models.Member).filter(models.Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()