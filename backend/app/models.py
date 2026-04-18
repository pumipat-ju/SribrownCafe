from sqlalchemy import Column, Integer, String, Float, DateTime, Text
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

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(255), nullable=True)
    points = Column(Integer, default=0)
    wallet = Column(Float, default=0.0)


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(255), nullable=True)
    price = Column(Float, nullable=False)
    stock = Column(Integer, default=0)
    image = Column(String(255), nullable=True)


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(255), nullable=False)      # SALE / EXPENSE / TOPUP / INCOME
    amount = Column(Float, nullable=False)
    method = Column(String(255), nullable=True)     # CASH / QR / WALLET
    desc = Column(Text, nullable=True)
    cashier = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(255), nullable=True)
    quantity = Column(Float, default=0)
    unit = Column(String(255), nullable=True)
    min_level = Column(Float, default=0)