from pydantic import BaseModel
from typing import Optional
from datetime import datetime


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

    class Config:
        from_attributes = True


class MemberBase(BaseModel):
    name: str
    phone: Optional[str] = None
    points: Optional[int] = 0
    wallet: Optional[float] = 0.0


class MemberCreate(MemberBase):
    pass


class MemberOut(MemberBase):
    id: int

    class Config:
        from_attributes = True


class MenuItemBase(BaseModel):
    name: str
    category: Optional[str] = None
    price: float
    stock: Optional[int] = 0
    image: Optional[str] = None


class MenuItemCreate(MenuItemBase):
    pass


class MenuItemOut(MenuItemBase):
    id: int

    class Config:
        from_attributes = True


class TransactionBase(BaseModel):
    type: str
    amount: float
    method: Optional[str] = None
    desc: Optional[str] = None
    cashier: Optional[str] = None


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