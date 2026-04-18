import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# ตั้งค่า Database URL เป็น MySQL ตามที่ต้องการ 
# รูปแบบ: mysql+pymysql://<username>:<password>@<host>:<port>/<database_name>
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:@localhost:3306/sribrowncafe")

connect_args = {}
# สำหรับ SQLite ต้องใช้ check_same_thread=False
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()