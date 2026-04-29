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
    name: str


class CategoryCreate(CategoryBase):
    pass


class CategoryOut(CategoryBase):
    id: int

    class Config:
        from_attributes = True


class MenuItemBase(BaseModel):
    name: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    price: float
    stock: Optional[int] = 0
    image: Optional[str] = None


class MenuItemCreate(MenuItemBase):
    pass


class MenuItemOut(MenuItemBase):
    id: int
    category: Optional[CategoryOut] = None

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


class TransactionCreate(TransactionBase):
    pass


class TransactionOut(TransactionBase):
    id: int
    created_at: datetime

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