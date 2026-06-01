from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/employees", tags=["employees"])
roles_router = APIRouter(prefix="/employees/roles", tags=["roles"])


# ─── Role Endpoints ───────────────────────────────────────────────

@roles_router.get("/", response_model=list[schemas.RoleOut])
def get_roles(db: Session = Depends(get_db)):
    return db.query(models.Role).all()


@roles_router.post("/", response_model=schemas.RoleOut)
def create_role(role: schemas.RoleCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Role).filter(models.Role.name == role.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Role '{role.name}' มีอยู่แล้ว")
    db_role = models.Role(**role.model_dump())
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role


@roles_router.put("/{role_id}", response_model=schemas.RoleOut)
def update_role(role_id: int, role: schemas.RoleCreate, db: Session = Depends(get_db)):
    db_role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not db_role:
        raise HTTPException(status_code=404, detail="ไม่พบโรลนี้")
    old_name = db_role.name
    for key, value in role.model_dump().items():
        setattr(db_role, key, value)
    db.commit()
    # อัปเดต role ของพนักงานที่ใช้ชื่อโรลเก่า
    if old_name != role.name:
        db.query(models.Employee).filter(models.Employee.role == old_name).update({"role": role.name})
        db.commit()
    db.refresh(db_role)
    return db_role


@roles_router.delete("/{role_id}")
def delete_role(role_id: int, db: Session = Depends(get_db)):
    db_role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not db_role:
        raise HTTPException(status_code=404, detail="ไม่พบโรลนี้")
    # ถ้ายังมีพนักงานใช้โรลนี้อยู่ ให้ fallback เป็น 'staff'
    db.query(models.Employee).filter(models.Employee.role == db_role.name).update({"role": "staff"})
    db.delete(db_role)
    db.commit()
    return {"status": "success"}


# ─── Employee Endpoints ───────────────────────────────────────────

@router.get("/", response_model=list[schemas.EmployeeOut])
def get_employees(db: Session = Depends(get_db)):
    return db.query(models.Employee).all()


@router.post("/", response_model=schemas.EmployeeOut)
def create_employee(employee: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    db_employee = models.Employee(**employee.model_dump())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee


@router.put("/{employee_id}", response_model=schemas.EmployeeOut)
def update_employee(employee_id: int, employee: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    db_employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if db_employee:
        for key, value in employee.model_dump().items():
            setattr(db_employee, key, value)
        db.commit()
        db.refresh(db_employee)
    return db_employee


@router.delete("/{employee_id}")
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    db_employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if db_employee:
        db.delete(db_employee)
        db.commit()
    return {"status": "success"}


@router.post("/login")
def login(payload: dict, db: Session = Depends(get_db)):
    pin = payload.get("pin")
    employee = db.query(models.Employee).filter(models.Employee.pin == pin).first()

    if not employee:
        raise HTTPException(status_code=401, detail="PIN ไม่ถูกต้อง")

    return {
        "message": "เข้าสู่ระบบสำเร็จ",
        "employee": {
            "id": employee.id,
            "name": employee.name,
            "role": employee.role,
            "pin": employee.pin
        }
    }