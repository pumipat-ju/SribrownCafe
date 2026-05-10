from fastapi import APIRouter, Depends
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("/", response_model=list[schemas.InventoryItemOut])
def get_inventory(db: Session = Depends(get_db)):
    return db.query(models.InventoryItem).all()


@router.post("/", response_model=schemas.InventoryItemOut)
def create_inventory_item(item: schemas.InventoryItemCreate, db: Session = Depends(get_db)):
    db_item = models.InventoryItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item