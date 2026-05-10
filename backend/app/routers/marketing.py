from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/marketing", tags=["marketing"])


# =========================
# Promotions
# =========================

@router.get("/promotions", response_model=list[schemas.PromotionOut])
def get_promotions(db: Session = Depends(get_db)):
    return db.query(models.Promotion).all()


@router.post("/promotions", response_model=schemas.PromotionOut)
def create_promotion(promotion: schemas.PromotionCreate, db: Session = Depends(get_db)):
    db_promo = models.Promotion(**promotion.model_dump())
    db.add(db_promo)
    db.commit()
    db.refresh(db_promo)
    return db_promo


@router.put("/promotions/{promotion_id}", response_model=schemas.PromotionOut)
def update_promotion(
    promotion_id: int,
    promotion: schemas.PromotionCreate,
    db: Session = Depends(get_db),
):
    db_promo = db.query(models.Promotion).filter(models.Promotion.id == promotion_id).first()

    if not db_promo:
        raise HTTPException(status_code=404, detail="Promotion not found")

    for key, value in promotion.model_dump().items():
        setattr(db_promo, key, value)

    db.commit()
    db.refresh(db_promo)
    return db_promo


@router.delete("/promotions/{promotion_id}")
def delete_promotion(promotion_id: int, db: Session = Depends(get_db)):
    db_promo = db.query(models.Promotion).filter(models.Promotion.id == promotion_id).first()

    if not db_promo:
        raise HTTPException(status_code=404, detail="Promotion not found")

    db.delete(db_promo)
    db.commit()

    return {"status": "success"}


# =========================
# Coupons
# =========================

@router.get("/coupons", response_model=list[schemas.CouponOut])
def get_coupons(db: Session = Depends(get_db)):
    return db.query(models.Coupon).all()


@router.post("/coupons", response_model=schemas.CouponOut)
def create_coupon(coupon: schemas.CouponCreate, db: Session = Depends(get_db)):
    db_coupon = models.Coupon(**coupon.model_dump())
    db.add(db_coupon)
    db.commit()
    db.refresh(db_coupon)
    return db_coupon


@router.put("/coupons/{coupon_id}", response_model=schemas.CouponOut)
def update_coupon(
    coupon_id: int,
    coupon: schemas.CouponCreate,
    db: Session = Depends(get_db),
):
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

    return {"status": "success"}