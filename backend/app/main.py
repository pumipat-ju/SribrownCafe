from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine, SessionLocal
from . import models

from .routers import employees, members, menu, transactions, inventory

Base.metadata.create_all(bind=engine)


# =========================
# 🌟 SEED DATA
# =========================
def seed_data():
    db = SessionLocal()

    try:
        # ถ้ามี employee แล้ว ไม่ต้อง seed ซ้ำ
        if db.query(models.Employee).first():
            return

        # -------------------
        # Employees
        # -------------------
        employees_data = [
            models.Employee(name="Dev", pin="999999", role="admin"),
            models.Employee(name="Cashier", pin="111111", role="staff"),
        ]

        db.add_all(employees_data)

        # -------------------
        # Menu
        # -------------------
        menu_data = [
            models.MenuItem(name="Americano", category="Coffee", price=60),
            models.MenuItem(name="Latte", category="Coffee", price=70),
            models.MenuItem(name="Mocha", category="Coffee", price=80),
            models.MenuItem(name="Matcha", category="Tea", price=75),
        ]

        db.add_all(menu_data)

        # -------------------
        # Members
        # -------------------
        members_data = [
            models.Member(name="John", phone="0800000000", pin="000000", wallet=200, age=30, dob="1994-01-01"),
            models.Member(name="Jane", phone="0811111111", pin="000000", wallet=150, age=25, dob="1998-05-15"),
        ]

        db.add_all(members_data)

        # -------------------
        # Inventory
        # -------------------
        inventory_data = [
            models.InventoryItem(name="Coffee Beans", quantity=1000, unit="g"),
            models.InventoryItem(name="Milk", quantity=10, unit="L"),
        ]

        db.add_all(inventory_data)

        db.commit()

        print("✅ Seed data inserted")

    finally:
        db.close()


# เรียก seed ตอน start
seed_data()


# =========================
# FastAPI App
# =========================

app = FastAPI(title="SriBrown Cafe Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(employees.router)
app.include_router(members.router)
app.include_router(menu.router)
app.include_router(transactions.router)
app.include_router(inventory.router)


@app.get("/")
def root():
    return {"message": "SriBrown backend is running"}