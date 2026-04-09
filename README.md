# SRI BROWN Refactor

รอบนี้แยกไฟล์ให้ครบเป็นก้อนหลักสำหรับ prototype แล้ว โดยยังคงใช้โค้ดเดิมเป็นฐาน

## โครงสร้าง

```text
sribrown_refactor_v5/
├─ index.html
├─ js/
│  ├─ app.js
│  ├─ state.js
│  ├─ utils.js
│  ├─ services/
│  │  ├─ checkoutService.js
│  │  ├─ dashboardService.js
│  │  ├─ employeeService.js
│  │  ├─ historyService.js
│  │  ├─ marketingService.js
│  │  ├─ memberService.js
│  │  ├─ menuService.js
│  │  ├─ permissionService.js
│  │  ├─ pricingService.js
│  │  ├─ receiptService.js
│  │  └─ shiftService.js
│  └─ renderers/
│     ├─ cartRenderer.js
│     ├─ dashboardRenderer.js
│     ├─ employeeRenderer.js
│     ├─ historyRenderer.js
│     ├─ marketingRenderer.js
│     ├─ memberRenderer.js
│     ├─ menuRenderer.js
│     └─ shiftRenderer.js
```

## แยกแล้วอะไรบ้าง

- pricing / coupon / promo / tier / VAT
- permission / PIN override
- checkout / receipt
- member helper
- employee helper
- marketing helper
- shift helper
- menu helper
- dashboard summary
- renderer แยกตามโดเมนหลัก

## หมายเหตุ

ชุดนี้เป็น **refactor starter ที่ครบไฟล์หลัก** แล้ว  
แต่ `app.js` ยังเป็นตัว orchestration หลักอยู่ และยังไม่ได้ย้าย event ทุกตัวออกจากไฟล์นี้ 100%

ถ้าจะ clean ต่อจริงจัง ขั้นถัดไปคือ
- แยก `controllers/`
- เปลี่ยน inline `onclick` เป็น event listeners
- ย้าย seed/mock data ออกจาก frontend
- ต่อ backend/API จริง
