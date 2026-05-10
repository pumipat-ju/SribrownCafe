from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/menu", tags=["menu"])


def get_or_create_category(
    db: Session,
    category_name_th: str | None,
    category_name_en: str | None,
):
    """
    รับชื่อหมวดหมู่ TH/EN แล้วหา category เดิม
    ถ้าไม่มีให้สร้างใหม่
    """

    if not category_name_th and not category_name_en:
        return None

    db_cat = None

    # หาโดย name_th ก่อน
    if category_name_th:
        db_cat = (
            db.query(models.Category)
            .filter(models.Category.name_th == category_name_th)
            .first()
        )

    # ถ้าไม่เจอ ลองหาโดย name_en
    if not db_cat and category_name_en:
        db_cat = (
            db.query(models.Category)
            .filter(models.Category.name_en == category_name_en)
            .first()
        )

    # ถ้าไม่มีจริง ๆ ค่อยสร้างใหม่
    if not db_cat:
        db_cat = models.Category(
            name_th=category_name_th or category_name_en,
            name_en=category_name_en or category_name_th,
        )
        db.add(db_cat)
        db.commit()
        db.refresh(db_cat)

    return db_cat


@router.get("/", response_model=list[schemas.MenuItemOut])
def get_menu(db: Session = Depends(get_db)):
    return db.query(models.MenuItem).all()


@router.post("/", response_model=schemas.MenuItemOut)
def create_menu(item: schemas.MenuItemCreate, db: Session = Depends(get_db)):
    item_data = item.model_dump()

    category_name_th = item_data.pop("category_name_th", None)
    category_name_en = item_data.pop("category_name_en", None)

    db_cat = get_or_create_category(
        db=db,
        category_name_th=category_name_th,
        category_name_en=category_name_en,
    )

    if db_cat:
        item_data["category_id"] = db_cat.id

    db_item = models.MenuItem(**item_data)

    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    return db_item


@router.put("/{item_id}", response_model=schemas.MenuItemOut)
def update_menu(
    item_id: int,
    item: schemas.MenuItemCreate,
    db: Session = Depends(get_db),
):
    db_item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()

    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    item_data = item.model_dump()

    category_name_th = item_data.pop("category_name_th", None)
    category_name_en = item_data.pop("category_name_en", None)

    db_cat = get_or_create_category(
        db=db,
        category_name_th=category_name_th,
        category_name_en=category_name_en,
    )

    if db_cat:
        item_data["category_id"] = db_cat.id

    for key, value in item_data.items():
        setattr(db_item, key, value)

    db.commit()
    db.refresh(db_item)

    return db_item


@router.delete("/{item_id}")
def delete_menu(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()

    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    db.delete(db_item)
    db.commit()

    return {"status": "success"}