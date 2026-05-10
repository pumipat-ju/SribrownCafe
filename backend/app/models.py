# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Date, ForeignKey
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    pin = Column(String(255), nullable=False)
    role = Column(String(255), default="staff")


class Member(Base):
    __tablename__ = "members"

    id     = Column(Integer, primary_key=True, index=True)
    name   = Column(String(255), nullable=False)   # "nickname (fullname)"
    phone  = Column(String(20), unique=True, nullable=False)
    pin    = Column(String(10), nullable=False)
    points = Column(Float, default=0.0)
    wallet = Column(Float, default=0.0)
    tier   = Column(String(50), default="Bronze")
    age    = Column(Integer, nullable=True)
    dob    = Column(Date, nullable=True)


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name_th = Column(String(100), nullable=False)
    name_en = Column(String(100), nullable=True)

    menu_items = relationship("MenuItem", back_populates="category")


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    name_th = Column(String(100), nullable=False)
    name_en = Column(String(100), nullable=True)
    price = Column(Float, nullable=False)
    image = Column(Text, nullable=True)
    color = Column(String(100), nullable=True)

    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    category = relationship("Category", back_populates="menu_items")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    bill_id = Column(String(50), nullable=True)
    type = Column(String(255), nullable=False)      # SALE / EXPENSE / TOPUP / INCOME
    amount = Column(Float, nullable=False)
    method = Column(String(255), nullable=True)     # CASH / QR / WALLET
    desc = Column(Text, nullable=True)
    cashier = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    date_raw = Column(String(255), nullable=True)
    items = Column(Text, nullable=True)

    subtotal = Column(Float, nullable=True, default=0.0)
    discount = Column(Float, nullable=True, default=0.0)
    promotionName = Column(String(255), nullable=True)
    couponName = Column(String(255), nullable=True)

    beforeVat = Column(Float, nullable=True, default=0.0)
    vatAmount = Column(Float, nullable=True, default=0.0)

    status = Column(String(50), default="COMPLETED")
    void_reason = Column(Text, nullable=True)


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(255), nullable=True)
    quantity = Column(Float, default=0)
    unit = Column(String(255), nullable=True)
    min_level = Column(Float, default=0)

class Promotion(Base):
    __tablename__ = "promotions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    targetCategories = Column(String(255), nullable=True) # json string
    targetItems = Column(String(255), nullable=True) # json string
    minQty = Column(Integer, default=1)
    discountValue = Column(Float, default=0.0)
    discountType = Column(String(50), default="pct")
    active = Column(Integer, default=1)
    eligibleFor = Column(String(50), default="all")
    startDate = Column(String(50), nullable=True)
    endDate = Column(String(50), nullable=True)
    startTime = Column(String(50), nullable=True)
    endTime = Column(String(50), nullable=True)
    daysOfWeek = Column(String(255), nullable=True) # json string

class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)
    value = Column(Float, default=0.0)
    icon = Column(String(50), default="sell")
    eligibleFor = Column(String(50), default="all")
