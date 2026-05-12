# SriBrownCafe POS System

ระบบบริหารจัดการหน้าร้าน (POS) สำหรับร้าน SriBrownCafe พัฒนาด้วย React (Frontend), FastAPI (Backend) และรองรับการเชื่อมต่อเครื่องพิมพ์ใบเสร็จ/เก๊ะเก็บเงินผ่าน Hardware Agent

---

## 1. ภาพรวมโปรเจกต์
ระบบประกอบด้วย 4 ส่วนหลักที่ทำงานร่วมกัน:
- **Frontend**: React + Vite (รันบนเครื่อง Host)
- **Backend**: FastAPI (รันใน Docker Container)
- **Database**: MySQL (รันใน Docker Container)
- **Hardware Agent**: FastAPI (รันบนเครื่อง Host) สำหรับควบคุม Printer และ Cash Drawer

### Architecture:
`Frontend (React/Vite)`  
&nbsp;&nbsp;&nbsp;&nbsp;→ `Backend (FastAPI Docker)`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ `MySQL`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ `Hardware Agent (localhost:9100)`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ `Receipt Printer / Cash Drawer`

---

## 2. โครงสร้างโฟลเดอร์
```text
SribrownCafe/
├─ backend/             # ส่วน Backend API (FastAPI)
│  ├─ app/              # โค้ดหลักของ API
│  ├─ Dockerfile        # การตั้งค่า Docker สำหรับ Backend
│  └─ requirements.txt  # Python dependencies ของ Backend
├─ hardware_agent/      # ส่วนเชื่อมต่อ Printer/Drawer (ต้องรันนอก Docker)
│  ├─ hardware_agent.py # โค้ดหลักของ Hardware Agent
│  ├─ requirements.txt  # Python dependencies ของ Hardware Agent
│  ├─ start.bat         # สคริปต์รันสำหรับ Windows
│  └─ start.sh          # สคริปต์รันสำหรับ macOS/Linux
├─ src/                 # ส่วน Frontend (React)
├─ public/              # ไฟล์ Static ต่างๆ
├─ docker-compose.yml   # ไฟล์จัดการ Container (DB, Backend, phpMyAdmin)
├─ .env.example         # ตัวอย่างไฟล์ตั้งค่า
├─ package.json         # Node.js dependencies ของ Frontend
└─ README.md            # คู่มือการใช้งาน
```

---

## 3. สิ่งที่ต้องติดตั้งก่อนเริ่ม

### Windows
- **Git**: สำหรับโคลนโปรเจกต์
- **Node.js (LTS)**: สำหรับรัน Frontend
- **Docker Desktop**: สำหรับรัน Backend และ Database
- **Python 3.11+**: สำหรับรัน Hardware Agent
- **VS Code**: แนะนำสำหรับแก้ไขโค้ด
- **Printer Driver**: ติดตั้ง Driver ของเครื่องพิมพ์ใบเสร็จ (เช่น Star TSP100IIIU) ให้เรียบร้อย

### macOS
- **Git**: ติดตั้งผ่าน Xcode Select หรือ Homebrew
- **Node.js (LTS)**: ติดตั้งผ่าน Official Installer หรือ `nvm`
- **Docker Desktop for Mac**: สำหรับรัน Backend และ Database
- **Python 3.11+**: มาพร้อม macOS หรือติดตั้งเพิ่มผ่าน Homebrew
- **CUPS**: ระบบจัดการการพิมพ์ของ macOS (ปกติมีมาให้อยู่แล้ว)
- **Printer Setup**: ติดตั้งเครื่องพิมพ์ใน System Settings ให้ macOS มองเห็นและสั่งพิมพ์ Test Page ได้ก่อน

---

## 4. วิธี Clone และติดตั้ง Dependencies

### ทั้ง Windows และ macOS
```bash
# 1. โคลนโปรเจกต์
git clone https://github.com/pumipat-ju/SribrownCafe.git
cd SribrownCafe

# 2. ติดตั้ง dependencies ของ Frontend
npm install
```

---

## 5. การตั้งค่า Environment

ให้สร้างไฟล์ `.env` โดยคัดลอกมาจากไฟล์ตัวอย่าง

### Windows (PowerShell)
```powershell
Copy-Item .env.example .env
```

### macOS / Linux
```bash
cp .env.example .env
```

### การตั้งค่าที่สำคัญใน `.env`:
- `VITE_API_BASE=http://localhost:8000` (URL ของ Backend API)
- `HARDWARE_AGENT_URL=http://host.docker.internal:9100` (URL ที่ Backend ใน Docker จะเรียกหา Hardware Agent)
- `HARDWARE_MOCK=true` (ตั้งเป็น `true` เพื่อทดสอบโดยไม่ต้องมีเครื่องพิมพ์จริง, `false` เมื่อใช้เครื่องจริง)
- `PRINTER_NAME=Microsoft Print to PDF` (ชื่อเครื่องพิมพ์ในระบบ ต้องตรงเป๊ะ)
- `PRINTER_ENCODING=cp874` (การเข้ารหัสภาษาไทยสำหรับ ESC/POS)

---

## 6. วิธีรัน Backend ด้วย Docker

ตรวจสอบว่า Docker Desktop เปิดอยู่ จากนั้นรันคำสั่งที่ Root Folder:

```bash
# รันระบบ Backend และ Database
docker compose up -d --build

# ตรวจสอบสถานะ Container
docker compose ps

# ดู Log ของ Backend
docker compose logs -f backend
```

### URL ที่สำคัญ:
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **phpMyAdmin**: [http://localhost:8080](http://localhost:8080)
- **MySQL (Host)**: `localhost:3307` (ข้างใน Container เป็น 3306)

---

## 7. วิธีรัน Frontend

เปิด Terminal ใหม่ที่ Root Folder:
```bash
npm run dev
```
เปิดบราวเซอร์ไปที่: [http://localhost:5173](http://localhost:5173)

---

## 8. วิธีรัน Hardware Agent

**ทำไมต้องรันแยกจาก Docker?**  
เพราะ Hardware Agent ต้องเข้าถึงพอร์ต USB/Serial ของเครื่องจริงเพื่อคุยกับ Printer และ Drawer ซึ่งการทำจากภายใน Docker Container นั้นมีความยุ่งยากและไม่เสถียรเท่าการรันบน Host โดยตรง

### ติดตั้ง Dependency
```bash
cd hardware_agent
pip install -r requirements.txt
```
*หมายเหตุ: บน macOS `pywin32` จะไม่ถูกติดตั้ง เพราะใช้เฉพาะ Windows ระบบจะใช้ CUPS แทนอัตโนมัติ*

### รันบน Windows
ดับเบิ้ลคลิกไฟล์ `start.bat` หรือรัน:
```cmd
python -m uvicorn hardware_agent:app --host 0.0.0.0 --port 9100
```

### รันบน macOS / Linux
```bash
chmod +x start.sh
./start.sh
```
หรือรัน:
```bash
python3 -m uvicorn hardware_agent:app --host 0.0.0.0 --port 9100
```

ตรวจสอบสถานะ: [http://localhost:9100/](http://localhost:9100/)

---

## 9. การตั้งค่า Printer

### Windows
ใช้ PowerShell เพื่อดูชื่อเครื่องพิมพ์ที่ถูกต้อง:
```powershell
Get-Printer | Select-Object Name
```
นำชื่อที่ได้ไปใส่ใน `.env` หรือ `hardware_agent/.env`:
`PRINTER_NAME=Star TSP100 Cutter (TSP143)`

### macOS
ตรวจสอบชื่อเครื่องพิมพ์:
```bash
lpstat -p
```
นำชื่อเครื่องพิมพ์ (คำหลังคำว่า `printer`) ไปใส่ใน `.env`:
`PRINTER_NAME=TSP143_USB_Printer`

---

## 10. การทดสอบ Hardware Agent โดยตรง

### เช็คสถานะ
- **Windows (PS)**: `Invoke-RestMethod -Uri "http://localhost:9100/" -Method Get`
- **macOS**: `curl http://localhost:9100/`

### ทดสอบเปิดเก๊ะ (Open Drawer)
- **Windows (PS)**: `Invoke-RestMethod -Uri "http://localhost:9100/open-drawer" -Method Post -ContentType "application/json" -Body "{}"`
- **Windows (PS)**: `Invoke-RestMethod -Uri "http://localhost:8000/hardware/open-drawer" -Method Post -ContentType "application/json" -Body "{}"`
- **macOS**: `curl -X POST http://localhost:9100/open-drawer -H "Content-Type: application/json" -d "{}"`
- **macOS**: `curl -X POST http://localhost:8000/hardware/open-drawer -H "Content-Type: application/json" -d "{}"`

### ทดสอบพิมพ์ใบเสร็จ (Print Receipt)
- **macOS**:
```bash
curl -X POST http://localhost:9100/print-receipt \
  -H "Content-Type: application/json" \
  -d '{"txn":{"bill_id":"TEST-001","cashier":"Admin","subtotal":60,"discount":0,"vatAmount":3.93,"amount":60,"items":[{"name_th":"อเมริกาโน่","qty":1,"price":60,"options":"เย็น, 100%"}]}}'
```

---

## 11. การทดสอบผ่าน Backend Docker
Backend จะเรียก Hardware Agent ผ่าน `http://host.docker.internal:9100`

ทดสอบเปิดเก๊ะผ่าน Backend API:
- **Windows (PS)**: `Invoke-RestMethod -Uri "http://localhost:8000/hardware/open-drawer" -Method Post -ContentType "application/json" -Body "{}"`
- **macOS**: `curl -X POST http://localhost:8000/hardware/open-drawer -H "Content-Type: application/json" -d "{}"`

หากได้ `status: success` แสดงว่า Flow ทำงานครบ:  
`Frontend` → `Backend Docker` → `Hardware Agent (Host)` → `Hardware`

---

## 12. การใช้งานระบบ POS ขั้นพื้นฐาน
1. เปิด Docker Backend
2. เปิด Hardware Agent (รัน `start.bat` หรือ `start.sh`)
3. เปิด Frontend (`npm run dev`)
4. **Login** ด้วย PIN:
   - **Admin/Dev**: `999999`
   - **Cashier**: `111111`
5. เข้าหน้า POS เลือกสินค้า
6. กด Checkout → เลือกโปรโมชั่น/คูปอง (ถ้ามี)
7. เลือกวิธีชำระเงิน
8. หากชำระเสร็จสิ้น ระบบจะสั่งพิมพ์ใบเสร็จและเปิดเก๊ะเงินสด (กรณีเงินสด)

---

## 13. Database และ phpMyAdmin
- เข้าจัดการฐานข้อมูลผ่านหน้าเว็บ: [http://localhost:8080](http://localhost:8080)
- หากต้องการล้างฐานข้อมูลใหม่ทั้งหมด (Data Loss!):
  ```bash
  docker compose down -v
  docker compose up -d --build
  ```

---

## 14. คำสั่งที่ใช้บ่อย
- `docker compose up -d` : รันระบบ
- `docker compose down` : ปิดระบบ
- `docker compose logs -f backend` : ดู Log การทำงาน
- `npm run dev` : รัน Frontend
- `python -m uvicorn hardware_agent:app --host 0.0.0.0 --port 9100` : รัน Hardware Agent

---

## 15. Troubleshooting

- **Backend เข้าไม่ได้ (localhost:8000)**: เช็คว่า Container รันอยู่หรือไม่ด้วย `docker ps` และดู error ใน `docker logs backend`
- **Login PIN ไม่ได้**: ตรวจสอบว่า API รันอยู่ และเช็ค `http://localhost:8000/employees` ว่ามีข้อมูลพนักงานหรือไม่
- **Hardware Agent Fail**: ตรวจสอบว่ารันนอก Docker และพอร์ต 9100 ไม่ถูกใช้งานโดยโปรแกรมอื่น
- **Printer ไม่พิมพ์**: 
    1. เช็คว่าตั้ง `HARDWARE_MOCK=false` 
    2. เช็คชื่อ `PRINTER_NAME` ให้ตรงกับในระบบ 
    3. เช็คการเชื่อมต่อสาย USB
- **macOS พิมพ์ไม่ได้**: ตรวจสอบว่า `lp` command ใช้งานได้ และ Printer ถูกตั้งค่าเป็น "Enabled" ใน CUPS

---

## 16. Git และความปลอดภัย
- **ห้าม Commit ไฟล์ `.env` หรือ `hardware_agent/.env` เข้า Git** เพราะมีรหัสผ่านและข้อมูลเครื่องจริง
- ใช้ไฟล์ `.env.example` เป็นแม่แบบเท่านั้น

---

## 17. หมายเหตุสำหรับการติดตั้งที่ร้านจริง
- ตั้งค่า `HARDWARE_MOCK=false` ใน `.env`
- ระบุ `PRINTER_NAME` ให้ตรงกับชื่อเครื่องพิมพ์ที่ใช้
- เสียบสายลิ้นชักเก็บเงินเข้าที่พอร์ต DK ของเครื่องพิมพ์
- สำหรับ Windows แนะนำเครื่องพิมพ์ตระกูล Star TSP100 หรือ Epson TM-Series เพื่อความเสถียรสูงสุด
