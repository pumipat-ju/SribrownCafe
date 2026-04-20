from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/menu", tags=["menu"])


@router.get("/", response_model=list[schemas.MenuItemOut])
def get_menu(db: Session = Depends(get_db)):
    return db.query(models.MenuItem).all()


@router.post("/", response_model=schemas.MenuItemOut)
def create_menu(item: schemas.MenuItemCreate, db: Session = Depends(get_db)):
    item_data = item.model_dump()
    cat_name = item_data.pop("category_name", None)
    
    # Smart Mapping Logic
    if cat_name:
        db_cat = db.query(models.Category).filter(models.Category.name == cat_name).first()
        if not db_cat:
            db_cat = models.Category(name=cat_name)
            db.add(db_cat)
            db.commit()
            db.refresh(db_cat)
        item_data["category_id"] = db_cat.id

    db_item = models.MenuItem(**item_data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.put("/{item_id}", response_model=schemas.MenuItemOut)
def update_menu(item_id: int, item: schemas.MenuItemCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if db_item:
        item_data = item.model_dump()
        cat_name = item_data.pop("category_name", None)

        # Smart Mapping Logic
        if cat_name:
            db_cat = db.query(models.Category).filter(models.Category.name == cat_name).first()
            if not db_cat:
                db_cat = models.Category(name=cat_name)
                db.add(db_cat)
                db.commit()
                db.refresh(db_cat)
            item_data["category_id"] = db_cat.id

        for key, value in item_data.items():
            setattr(db_item, key, value)
        db.commit()
        db.refresh(db_item)
    return db_item


@router.delete("/{item_id}")
def delete_menu(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
    return {"status": "success"}