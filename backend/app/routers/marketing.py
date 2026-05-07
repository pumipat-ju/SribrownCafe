from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/marketing",
    tags=["marketing"]
)

# --- Promotions ---

@router.get("/promotions", response_model=List[schemas.PromotionOut])
def read_promotions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    promotions = db.query(models.Promotion).offset(skip).limit(limit).all()
    return promotions

@router.post("/promotions", response_model=schemas.PromotionOut)
def create_promotion(promotion: schemas.PromotionCreate, db: Session = Depends(get_db)):
    db_promotion = models.Promotion(**promotion.model_dump())
    db.add(db_promotion)
    db.commit()
    db.refresh(db_promotion)
    return db_promotion

@router.put("/promotions/{promotion_id}", response_model=schemas.PromotionOut)
def update_promotion(promotion_id: int, promotion: schemas.PromotionCreate, db: Session = Depends(get_db)):
    db_promotion = db.query(models.Promotion).filter(models.Promotion.id == promotion_id).first()
    if not db_promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    for key, value in promotion.model_dump().items():
        setattr(db_promotion, key, value)
        
    db.commit()
    db.refresh(db_promotion)
    return db_promotion

@router.delete("/promotions/{promotion_id}")
def delete_promotion(promotion_id: int, db: Session = Depends(get_db)):
    db_promotion = db.query(models.Promotion).filter(models.Promotion.id == promotion_id).first()
    if not db_promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    db.delete(db_promotion)
    db.commit()
    return {"message": "Promotion deleted successfully"}

# --- Coupons ---

@router.get("/coupons", response_model=List[schemas.CouponOut])
def read_coupons(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    coupons = db.query(models.Coupon).offset(skip).limit(limit).all()
    return coupons

@router.post("/coupons", response_model=schemas.CouponOut)
def create_coupon(coupon: schemas.CouponCreate, db: Session = Depends(get_db)):
    db_coupon = models.Coupon(**coupon.model_dump())
    db.add(db_coupon)
    db.commit()
    db.refresh(db_coupon)
    return db_coupon

@router.put("/coupons/{coupon_id}", response_model=schemas.CouponOut)
def update_coupon(coupon_id: int, coupon: schemas.CouponCreate, db: Session = Depends(get_db)):
    db_coupon = db.query(models.Coupon).filter(models.Coupon.id == coupon_id).first()
    if not db_coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
        
    for key, value in coupon.model_dump().items():
        setattr(db_coupon, key, value)
        
    db.commit()
    db.refresh(db_coupon)
    return db_coupon

@router.delete("/coupons/{coupon_id}")
def delete_coupon(coupon_id: int, db: Session = Depends(get_db)):
    db_coupon = db.query(models.Coupon).filter(models.Coupon.id == coupon_id).first()
    if not db_coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    db.delete(db_coupon)
    db.commit()
    return {"message": "Coupon deleted successfully"}
