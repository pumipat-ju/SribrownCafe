import React, { createContext, useState, useEffect } from 'react';
import { fetchJSON } from '../api.js';

export const AppContext = createContext();

export function AppProvider({ children }) {
    // 1. ข้อมูลพนักงานและลูกค้า
    const [employees, setEmployees] = useState([]);
    const [members, setMembers] = useState([]);

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
    const [categories, setCategories] = useState([]);

    const [optionGroups, setOptionGroups] = useState([
        { id: 'og_roast', name: 'เมล็ดกาแฟ', choices: [{ n: 'คั่วเข้ม', p: 0 }, { n: 'คั่วกลาง', p: 0 }, { n: 'คั่วอ่อน', p: 0 }], applyTo: [1] },
        { id: 'og_type', name: 'รูปแบบ (ร้อน/เย็น/ปั่น)', choices: [{ n: 'ร้อน', p: -20 }, { n: 'เย็น', p: 0 }, { n: 'ปั่น', p: 20 }], applyTo: [1, 2] },
        { id: 'og_sweet', name: 'ความหวาน', choices: [{ n: '100%', p: 0 }, { n: '50%', p: 0 }, { n: '25%', p: 0 }, { n: '0%', p: 0 }], applyTo: [1, 2] }
    ]);

    const [menuItems, setMenuItems] = useState([]);

    // 3. ระบบสถานะของ POS (ตะกร้า และ การเปิดกะ)
    const [cart, setCart] = useState([]);
    const [shift, setShift] = useState({
        isOpen: false, startCash: 0, salesCash: 0, cashIn: 0, cashOut: 0
    });
    const [currentEmployee, setCurrentEmployee] = useState(null);
    const [transactions, setTransactions] = useState([]);

    // 🌟 โหลดข้อมูลจาก Backend อัตโนมัติเมื่อเริ่มแอป
    useEffect(() => {
        fetchJSON('/employees').then(data => {
            setEmployees(data);
        }).catch(e => console.error("Employee fetch error", e));

        fetchJSON('/members').then(setMembers).catch(e => console.error("Member fetch error", e));

        fetchJSON('/categories').then(setCategories).catch(e => console.error("Category fetch error", e));

        fetchJSON('/menu').then(data => {
            setMenuItems(data.map(item => ({
                id: item.id,
                // ✅ แก้: รองรับทั้ง nested object (category.id) และ flat field (category_id)
                cat: item.category?.id ?? item.category_id ?? null,
                // ✅ แก้: map name_th และ name_en ให้ครบ เพื่อให้ MenuTab filter/แสดงผลได้
                name: item.name,
                name_th: item.name_th || item.name || '',
                name_en: item.name_en || '',
                price: item.price,
                color: item.image || 'bg-white'
            })));
        }).catch(e => console.error("Menu fetch error", e));

        fetchJSON('/transactions').then(setTransactions).catch(e => console.error("Transaction fetch error", e));
    }, []);

    const value = {
        employees, setEmployees, currentEmployee, setCurrentEmployee,
        members, setMembers,
        categories, setCategories,
        optionGroups, setOptionGroups,
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