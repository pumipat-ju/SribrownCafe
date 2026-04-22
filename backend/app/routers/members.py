from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/members", tags=["members"])


TIERS = ["Bronze", "Silver", "Gold", "Platinum"]

def get_tier_name(points: float) -> str:
    if points >= 15000: return "Platinum"
    if points >= 5000: return "Gold"
    if points >= 1000: return "Silver"
    return "Bronze"

@router.get("/", response_model=list[schemas.MemberOut])
def get_members(db: Session = Depends(get_db)):
    return db.query(models.Member).all()


@router.post("/", response_model=schemas.MemberOut)
def create_member(member: schemas.MemberCreate, db: Session = Depends(get_db)):
    member_data = member.model_dump()
    points = member_data.get("points", 0)
    member_data["tier"] = get_tier_name(points)
    
    db_member = models.Member(**member_data)
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member


@router.put("/{member_id}", response_model=schemas.MemberOut)
def update_member(member_id: int, member: schemas.MemberCreate, db: Session = Depends(get_db)):
    db_member = db.query(models.Member).filter(models.Member.id == member_id).first()
    if db_member:
        member_data = member.model_dump()
        new_points = member_data.get("points", 0)
        new_tier = get_tier_name(new_points)
        
        # 🌟 Logic: ห้ามลดระดับ (Only Upgrade)
        current_tier = db_member.tier or "Bronze"
        if TIERS.index(new_tier) > TIERS.index(current_tier):
            db_member.tier = new_tier
        
        for key, value in member_data.items():
            if key != "tier": # ปล่อยให้ Logic ด้านบนจัดการ tier เอง
                setattr(db_member, key, value)
        
        db.commit()
        db.refresh(db_member)
    return db_member


@router.delete("/{member_id}")
def delete_member(member_id: int, db: Session = Depends(get_db)):
    db_member = db.query(models.Member).filter(models.Member.id == member_id).first()
    if db_member:
        db.delete(db_member)
        db.commit()
    return {"status": "success"}