from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class EmployeeBase(BaseModel):
    name: str
    pin: str
    role: Optional[str] = "staff"


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeOut(BaseModel):
    id: int
    name: str
    role: str
    pin: str

    class Config:
        from_attributes = True


class MemberBase(BaseModel):
    name: str
    phone: str
    pin: str
    points: Optional[float] = 0.0
    wallet: Optional[float] = 0.0
    tier: Optional[str] = "Bronze"
    age: Optional[int] = None
    dob: Optional[date] = None


class MemberCreate(MemberBase):
    pass


class MemberUpdate(BaseModel):
    name: str
    phone: str
    pin: str
    points: Optional[float] = None
    wallet: Optional[float] = None
    age: Optional[int] = None
    dob: Optional[date] = None


class MemberOut(MemberBase):
    id: int

    class Config:
        from_attributes = True


class CategoryBase(BaseModel):
    name_th: str
    name_en: str | None = None


class CategoryCreate(CategoryBase):
    pass


class CategoryOut(CategoryBase):
    id: int

    class Config:
        from_attributes = True


class MenuItemBase(BaseModel):
    name_th: str
    name_en: str | None = None
    price: float
    category_id: int | None = None
    image: str | None = None
    color: str | None = None


class MenuItemCreate(MenuItemBase):
    category_name_th: str | None = None
    category_name_en: str | None = None


class MenuItemOut(MenuItemBase):
    id: int

    class Config:
        from_attributes = True


class TransactionBase(BaseModel):
    bill_id: Optional[str] = None
    date_raw: Optional[str] = None
    type: str
    amount: float
    method: Optional[str] = None
    desc: Optional[str] = None
    cashier: Optional[str] = None
    items: Optional[str] = None
    subtotal: Optional[float] = 0.0
    discount: Optional[float] = 0.0
    promotionName: Optional[str] = None
    beforeVat: Optional[float] = 0.0
    vatAmount: Optional[float] = 0.0
    status: Optional[str] = "COMPLETED"
    void_reason: Optional[str] = None


class TransactionCreate(TransactionBase):
    pass


class TransactionOut(TransactionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class VoidRequest(BaseModel):
    pin: str
    reason: Optional[str] = None

    class Config:
        from_attributes = True


class InventoryItemBase(BaseModel):
    name: str
    category: Optional[str] = None
    quantity: Optional[float] = 0
    unit: Optional[str] = None
    min_level: Optional[float] = 0


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemOut(InventoryItemBase):
    id: int

    class Config:
        from_attributes = True


class PromotionBase(BaseModel):
    name: str
    targetCategories: Optional[str] = None
    targetItems: Optional[str] = None
    minQty: Optional[int] = 1
    discountValue: Optional[float] = 0.0
    discountType: Optional[str] = "pct"
    active: Optional[int] = 1
    eligibleFor: Optional[str] = "all"
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    daysOfWeek: Optional[str] = None

class PromotionCreate(PromotionBase):
    pass

class PromotionOut(PromotionBase):
    id: int
    class Config:
        from_attributes = True

class CouponBase(BaseModel):
    name: str
    type: str
    value: Optional[float] = 0.0
    icon: Optional[str] = "sell"
    eligibleFor: Optional[str] = "all"

class CouponCreate(CouponBase):
    pass

class CouponOut(CouponBase):
    id: int
    class Config:
        from_attributes = True
