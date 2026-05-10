from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..schemas import MemberCreate, MemberUpdate, MemberOut

router = APIRouter(prefix="/members", tags=["members"])

# 🌟 ฟังก์ชันคำนวณระดับลูกค้าแบบปลอดภัย (รองรับ Diamond ชัวร์ๆ)
def get_tier_name(points: float) -> str:
    if points >= 15000: return "Diamond"
    if points >= 5000: return "Gold"
    if points >= 1000: return "Silver"
    return "Bronze"

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

    member_dict = data.model_dump()
    points = member_dict.get("points", 0)
    if points is None: points = 0
    # 🌟 ให้ระบบคำนวณ Tier ให้ตั้งแต่ตอนสมัคร
    member_dict["tier"] = get_tier_name(points)
    
    member = models.Member(**member_dict)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member

# PUT /members/{id} — แก้ไขข้อมูล / เติม wallet / อัปเดต points (ตัวที่เคยทำพัง)
@router.put("/{member_id}", response_model=MemberOut)
def update_member(member_id: int, data: MemberUpdate, db: Session = Depends(get_db)):
    member = db.query(models.Member).filter(models.Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # 🌟 อัปเดตข้อมูลทั่วไป
    member.name = data.name
    member.phone = data.phone
    member.pin = data.pin
    
    if data.points is not None:
        member.points = data.points
        # 🌟 อัปเดต Tier อัตโนมัติเมื่อแต้มเพิ่มขึ้น! 
        member.tier = get_tier_name(member.points)
        
    if data.wallet is not None:
        member.wallet = data.wallet
    if data.age is not None:
        member.age = data.age
    if data.dob is not None:
        member.dob = data.dob

    try:
        db.commit()
        db.refresh(member)
    except Exception as e:
        db.rollback()
        # ถ้ามีอะไรแปลกๆ ให้พ่น Error บอกตรงๆ จะได้ไม่เงียบ
        raise HTTPException(status_code=500, detail=str(e))
        
    return member

# DELETE /members/{id} — ลบสมาชิก
@router.delete("/{member_id}", status_code=204)
def delete_member(member_id: int, db: Session = Depends(get_db)):
    member = db.query(models.Member).filter(models.Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()