import React, { createContext, useState } from 'react';

export const AppContext = createContext();

export function AppProvider({ children }) {
    // 1. ข้อมูลพนักงานและลูกค้า
    const [employees, setEmployees] = useState([
        { id: 1, phone: '0812345678', name: 'บอส', role: 'Owner', pin: '999999', isClockedIn: false },
        { id: 2, phone: '0822222222', name: 'นัท', role: 'Administrator', pin: '111111', isClockedIn: false }
    ]);
    const [members, setMembers] = useState([
        { id: 1, nickname: 'พลอย', name: 'พลอยไพลิน ใจดี', dob: '1995-05-15', age: 30, phone: '0811234567', pin: '999999', points: 15500, wallet: 5000 },
        { id: 2, nickname: 'นัท', name: 'ณัฐพงษ์ รักกาแฟ', dob: '1992-10-20', age: 33, phone: '0899876543', pin: '888888', points: 1200, wallet: 500 },
        { id: 3, nickname: 'อ้น', name: 'อ้น ศรีบราวน์', dob: '1996-01-01', age: 29, phone: '0952253450', pin: '221044', points: 0, wallet: 0 }
    ]);

    // 🌟 ข้อมูลการตลาด (CRM)
    const [marketing, setMarketing] = useState({
        tiers: [
            { id: 'b', name: 'BRONZE', minSpent: 0, maxSpent: 999, discountPct: 0 },
            { id: 's', name: 'SILVER', minSpent: 1000, maxSpent: 4999, discountPct: 5 },
            { id: 'g', name: 'GOLD', minSpent: 5000, maxSpent: 14999, discountPct: 10 },
            { id: 'p', name: 'PLATINUM', minSpent: 15000, maxSpent: null, discountPct: 15 }
        ],
        promotions: [
            { id: 'p1', name: 'แก้วที่ 2 ลด 50%', targetCat: 'coffee', minQty: 2, discountPct: 50, active: false, eligibleFor: 'all', startDate: '', endDate: '', startTime: '', endTime: '' }
        ],
        coupons: [
            { id: 'ct1', name: 'ส่วนลด 20 บาท', type: 'fixed_discount', value: 20, icon: 'sell', eligibleFor: 'all' },
            { id: 'ct2', name: 'ฟรีเครื่องดื่ม 1 แก้ว', type: 'free_drink', value: 0, icon: 'local_cafe', eligibleFor: 'members' }
        ]
    });

    // 2. ข้อมูลเมนู, หมวดหมู่ และ "ตัวเลือกเสริม (Option Groups)"
    const [categories, setCategories] = useState([
        { id: 'coffee', name: '☕️ กาแฟ' },
        { id: 'tea', name: '🍵 ชา' },
        { id: 'bakery', name: '🥐 ขนมอบ' }
    ]);

    // 🌟 เพิ่ม optionGroups ตรงนี้ครับ (สเต็ปที่ 1) 🌟
    const [optionGroups, setOptionGroups] = useState([
        { id: 'og_roast', name: 'เมล็ดกาแฟ', choices: [{ n: 'คั่วเข้ม', p: 0 }, { n: 'คั่วกลาง', p: 0 }, { n: 'คั่วอ่อน', p: 0 }], applyTo: ['coffee'] },
        { id: 'og_type', name: 'รูปแบบ (ร้อน/เย็น/ปั่น)', choices: [{ n: 'ร้อน', p: -20 }, { n: 'เย็น', p: 0 }, { n: 'ปั่น', p: 20 }], applyTo: ['coffee', 'tea'] },
        { id: 'og_sweet', name: 'ความหวาน', choices: [{ n: '100%', p: 0 }, { n: '50%', p: 0 }, { n: '25%', p: 0 }, { n: '0%', p: 0 }], applyTo: ['coffee', 'tea'] }
    ]);

    const [menuItems, setMenuItems] = useState([
        { id: 1, cat: 'coffee', name: 'เอสเพรสโซ่', price: 100, color: 'bg-white' },
        { id: 2, cat: 'coffee', name: 'อเมริกาโน่', price: 90, color: 'bg-white' },
        { id: 3, cat: 'tea', name: 'ชาไทย', price: 80, color: 'bg-orange-50' },
        { id: 4, cat: 'bakery', name: 'ครัวซองต์เนยสด', price: 85, color: 'bg-yellow-50' }
    ]);

    // 3. ระบบสถานะของ POS (ตะกร้า และ การเปิดกะ)
    const [cart, setCart] = useState([]);
    const [shift, setShift] = useState({
        isOpen: false, startCash: 0, salesCash: 0, cashIn: 0, cashOut: 0
    });
    const [currentEmployee, setCurrentEmployee] = useState(employees[0]);
    const [transactions, setTransactions] = useState([]);

    // 🌟 อย่าลืมเพิ่ม optionGroups เข้าไปใน value ด้วยครับ 🌟
    const value = {
        employees, setEmployees, currentEmployee, setCurrentEmployee,
        members, setMembers,
        categories, setCategories,
        optionGroups, setOptionGroups, // เพิ่มตรงนี้
        menuItems, setMenuItems,
        cart, setCart,
        shift, setShift,
        transactions, setTransactions,
        marketing, setMarketing
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}