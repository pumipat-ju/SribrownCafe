# SriBrown Cafe POS System

โปรเจกต์ระบบ POS สำหรับร้าน SriBrown Cafe พัฒนาด้วย React (Frontend) และ FastAPI + MySQL (Backend) ผ่าน Docker

## ระบบต้องการ (Requirements)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) (สำหรับรัน Frontend ในการพัฒนา)

## ขั้นตอนการติดตั้ง (Setup Instructions)

### 1. โคลนโปรเจกต์
```bash
git clone https://github.com/pumipat-ju/SribrownCafe.git
cd SribrownCafe
```

### 2. ตั้งค่า Environment Variables
โปรเจกต์นี้ใช้ข้อมูลความลับผ่านไฟล์ `.env` ให้คัดลอกไฟล์ตัวอย่างและเปลี่ยนรหัสตามต้องการ:
```bash
cp env.example .env
```
*(ใน MacOS/Linux ใช้คำสั่งด้านบนได้เลย ส่วน Windows ให้ Copy ไฟล์ `env.example` แล้วเปลี่ยนชื่อเป็น `.env`)*

### 3. รันระบบ Backend และ Database (ด้วย Docker)
คำสั่งนี้จะทำการติดตั้ง MySQL, Backend และ phpMyAdmin ให้โดยอัตโนมัติ:
```bash
docker-compose up -d --build
```
ระบบจะรันที่พอร์ตดังนี้:
- **Backend API**: `http://localhost:8000`
- **phpMyAdmin**: `http://localhost:8080` (จัดการฐานข้อมูลผ่านหน้าเว็บ)
- **MySQL**: `localhost:3307`

### 4. รันระบบ Frontend
เปิด Terminal อีกหน้าต่างหนึ่ง แล้วรันคำสั่ง:
```bash
npm install
npm run dev
```
ระบบจะเปิดที่ `http://localhost:5173`

---

## ข้อมูลการเข้าใช้งานเริ่มต้น (Seed Data)
- **Admin**: PIN `999999`
- **Cashier**: PIN `111111`

## โครงสร้างโปรเจกต์
- `/src`: โค้ดฝั่ง React Frontend
- `/backend`: โค้ดฝั่ง FastAPI Backend
- `docker-compose.yml`: การตั้งค่าระบบ Infrastructure (MySQL/API)
