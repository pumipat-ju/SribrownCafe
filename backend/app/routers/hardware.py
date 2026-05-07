import socket
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(
    prefix="/hardware",
    tags=["hardware"]
)

# Mockup IP - คุณสามารถเปลี่ยนเป็น IP จริงของเครื่องพิมพ์ได้ที่นี่
PRINTER_IP = "192.168.1.200"
PRINTER_PORT = 9100

class DrawerRequest(BaseModel):
    ip: str = None

@router.post("/open-drawer")
async def open_drawer(request: DrawerRequest = None):
    """
    ส่งคำสั่ง Esc/Pos ไปยังเครื่องพิมพ์ผ่าน Network เพื่อดีดเก๊ะเก็บเงิน
    โดยไม่ทำให้กระดาษออกมา (Zero Waste)
    """
    target_ip = (request and request.ip) or PRINTER_IP
    
    # คำสั่ง Esc/Pos มาตรฐานสำหรับเปิดเก๊ะเก็บเงิน (Drawer Kick)
    # ESC p m t1 t2
    # m = 0 (Drawer 1), t1 = 25, t2 = 250
    kick_command = b'\x1b\x70\x00\x19\xfa'
    
    try:
        # สร้างการเชื่อมต่อ Socket ไปยังเครื่องพิมพ์
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(3.0) # Timeout 3 วินาที
            s.connect((target_ip, PRINTER_PORT))
            s.sendall(kick_command)
        
        return {"status": "success", "message": f"Drawer kick signal sent to {target_ip}"}
    
    except socket.timeout:
        # กรณีเชื่อมต่อไม่ได้ภายในเวลาที่กำหนด
        raise HTTPException(status_code=504, detail=f"Connection to printer at {target_ip} timed out.")
    except Exception as e:
        # กรณีเกิดข้อผิดพลาดอื่นๆ (เช่น IP ไม่ถูกต้อง หรือเครื่องปิดอยู่)
        raise HTTPException(status_code=500, detail=f"Failed to connect to printer: {str(e)}")
