from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine, SessionLocal
from . import models

from .routers import employees, members, menu, transactions, inventory, categories

# Base.metadata.drop_all(bind=engine) # Uncomment this if you want to wipe everything once
Base.metadata.create_all(bind=engine)


# =========================
# 🌟 SEED DATA
# =========================
def seed_data():
    db = SessionLocal()

    try:
        # Check if we need to seed Categories
        if not db.query(models.Category).first():
            cat_coffee = models.Category(name="☕️ กาแฟ")
            cat_tea = models.Category(name="🍵 ชา")
            cat_bakery = models.Category(name="🥐 ขนมอบ")
            
            db.add_all([cat_coffee, cat_tea, cat_bakery])
            db.commit()
            print("✅ Category seed data inserted")
        else:
            cat_coffee = db.query(models.Category).filter(models.Category.name == "☕️ กาแฟ").first()
            cat_tea = db.query(models.Category).filter(models.Category.name == "🍵 ชา").first()

        # Check if we need to seed Employees
        if not db.query(models.Employee).first():
            employees_data = [
                models.Employee(name="Dev", pin="999999", role="admin"),
                models.Employee(name="Cashier", pin="111111", role="staff"),
            ]
            db.add_all(employees_data)
            db.commit()

        # Check if we need to seed Menu
        if not db.query(models.MenuItem).first():
            menu_data = [
                models.MenuItem(name="Americano", category=cat_coffee, price=60),
                models.MenuItem(name="Latte", category=cat_coffee, price=70),
                models.MenuItem(name="Mocha", category=cat_coffee, price=80),
                models.MenuItem(name="Matcha", category=cat_tea, price=75),
            ]
            db.add_all(menu_data)
            db.commit()
            print("✅ Menu seed data inserted")

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
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(inventory.router)


@app.get("/")
def root():
    return {"message": "SriBrown backend is running"}