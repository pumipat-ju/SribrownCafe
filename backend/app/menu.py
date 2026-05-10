from fastapi import APIRouter, Depends
from . import models
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from ..database import get_db
from . import schemas

router = APIRouter(prefix="/menu", tags=["menu"])

@router.get("/", response_model=list[schemas.MenuItemOut])
def get_menu(db: Session = Depends(get_db)):
    return db.query(models.MenuItem).all()

@router.post("/", response_model=schemas.MenuItemOut)
def create_menu(item: schemas.MenuItemCreate, db: Session = Depends(get_db)):
    db_item = models.MenuItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item