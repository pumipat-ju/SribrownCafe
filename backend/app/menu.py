from fastapi import APIRouter, Depends, HTTPException
from . import models
from sqlalchemy.orm import Session
from ..database import get_db
from . import schemas

router = APIRouter(prefix="/menu", tags=["menu"])

@router.get("/", response_model=list[schemas.MenuItemOut])
def get_menu(db: Session = Depends(get_db)):
    return db.query(models.MenuItem).all()

@router.post("/", response_model=schemas.MenuItemOut)
def create_menu(item: schemas.MenuItemCreate, db: Session = Depends(get_db)):
    db_item = models.MenuItem(**{
        k: v for k, v in item.model_dump().items()
        if k in ["name_th", "name_en", "price", "category_id", "image", "color"]
    })
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/{item_id}", response_model=schemas.MenuItemOut)
def update_menu(item_id: int, item: schemas.MenuItemCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in item.model_dump().items():
        if k in ["name_th", "name_en", "price", "category_id", "image", "color"]:
            setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{item_id}")
def delete_menu(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(db_item)
    db.commit()
    return {"ok": True}