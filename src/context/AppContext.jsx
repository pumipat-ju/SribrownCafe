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
            { id: 'p', name: 'DIAMOND', minSpent: 15000, maxSpent: null, discountPct: 15 }
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
    // 🌟 1. ดึงข้อมูลกะจาก LocalStorage ก่อน ถ้าไม่มีค่อยตั้งค่าเริ่มต้น
    const [shift, setShift] = useState(() => {
        const savedShift = localStorage.getItem('sribrown_shift');
        return savedShift ? JSON.parse(savedShift) : { isOpen: false };
    });
    // 🌟 2. สั่งให้เซฟลง LocalStorage ทุกครั้งที่เปิดกะ/ปิดกะ หรือมีการเปลี่ยนค่า shift
    useEffect(() => {
        localStorage.setItem('sribrown_shift', JSON.stringify(shift));
    }, [shift]);

    // 🌟 แก้ไข: โหลดข้อมูลพนักงานจาก localStorage (ถ้ามี)
    const [currentEmployee, setCurrentEmployee] = useState(() => {
        const saved = localStorage.getItem('sribrown_employee');
        return saved ? JSON.parse(saved) : null;
    });

    const [transactions, setTransactions] = useState([]);

    // 🌟 บันทึกพนักงานลง localStorage ทุกครั้งที่เปลี่ยน
    useEffect(() => {
        if (currentEmployee) {
            localStorage.setItem('sribrown_employee', JSON.stringify(currentEmployee));
        } else {
            localStorage.removeItem('sribrown_employee');
        }
    }, [currentEmployee]);

    // 🌟 ฟังก์ชันสำหรับโหลดข้อมูล (แยกออกมาเพื่อให้เรียกซ้ำได้)
    const refreshData = () => {
        fetchJSON('/employees').then(setEmployees).catch(e => console.error("Employee fetch error", e));
        fetchJSON('/members').then(setMembers).catch(e => console.error("Member fetch error", e));
        fetchJSON('/categories').then(setCategories).catch(e => console.error("Category fetch error", e));

        fetchJSON('/marketing/promotions').then(promos => {
            const parsedPromos = (promos || []).map(p => ({
                ...p,
                targetCategories: p.targetCategories ? JSON.parse(p.targetCategories) : [],
                targetItems: p.targetItems ? JSON.parse(p.targetItems) : [],
                daysOfWeek: p.daysOfWeek ? JSON.parse(p.daysOfWeek) : []
            }));
            setMarketing(prev => ({ ...prev, promotions: parsedPromos }));
        }).catch(e => console.error("Promotions fetch error", e));

        fetchJSON('/marketing/coupons').then(coups => {
            setMarketing(prev => ({ ...prev, coupons: coups || [] }));
        }).catch(e => console.error("Coupons fetch error", e));

        // 🌟 จุดที่ 1: เปลี่ยนจาก /menu เป็น /products เพื่อให้ตรงกับ Database
        fetchJSON('/menu').then(data => {
            setMenuItems(data.map(item => ({
                id: item.id,
                cat: item.category?.id ?? item.category_id ?? null,
                name: item.name,
                name_th: item.name_th || item.name || '',
                name_en: item.name_en || '',
                price: item.price,
                color: item.image || 'bg-white'
            })));
        }).catch(e => console.error("Menu fetch error", e));

        fetchJSON('/transactions').then(data => {
            setTransactions(data.map(t => {
                // 🌟 จุดที่ 2: ดึงเวลาที่เซฟใน DB (created_at) มาสร้าง dateRaw ให้ระบบคำนวณกะได้
                const dt = new Date(t.created_at);
                return {
                    ...t,
                    dateRaw: t.created_at,
                    date: dt.toLocaleDateString('th-TH'),
                    time: dt.toLocaleTimeString('th-TH').slice(0, 5) + ' น.'
                };
            }));
        }).catch(e => console.error("Transaction fetch error", e));
    };

    // 🌟 โหลดข้อมูลครั้งแรก และตั้งเวลา Auto-Refresh (Polling)
    useEffect(() => {
        refreshData();

        // ดึงข้อมูลใหม่ทุกๆ 10 วินาที
        const interval = setInterval(refreshData, 10000);

        return () => clearInterval(interval); // ล้าง Interval เมื่อปิดแอป
    }, []);

    // 🌟 เพิ่มฟังก์ชันรันเลขบิลอัตโนมัติ
    const generateBillId = (type, currentTransactions) => {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const dateStr = `${yy}${mm}${dd}`;

        const prefixes = { SALE: 'SO', TOPUP: 'DP', EXPENSE: 'PV', INCOME: 'RV' };
        const prefix = prefixes[type] || 'TXN';
        const todayPrefix = `${prefix}-${dateStr}`;

        // 1. กรองเฉพาะบิลของวันนี้และประเภทนี้
        const todayTxns = (currentTransactions || []).filter(t => {
            const targetId = String(t.bill_id || t.id || '');
            return targetId.startsWith(todayPrefix);
        });

        // 2. หาเลขรันลำดับที่สูงที่สุด (เช่น จาก SO-260426-005 ดึงมาแค่ 5)
        let maxNum = 0;
        todayTxns.forEach(t => {
            const targetId = String(t.bill_id || t.id || '');
            const parts = targetId.split('-');
            const lastPart = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastPart) && lastPart > maxNum) {
                maxNum = lastPart;
            }
        });

        // 3. เลขต่อไปคือเลขที่สูงที่สุด + 1
        const nextNum = maxNum + 1;
        return `${todayPrefix}-${String(nextNum).padStart(3, '0')}`;
    };

    const value = {
        employees, setEmployees, currentEmployee, setCurrentEmployee,
        members, setMembers,
        categories, setCategories,
        optionGroups, setOptionGroups,
        menuItems, setMenuItems,
        cart, setCart,
        shift, setShift,
        transactions, setTransactions,
        marketing, setMarketing,
        generateBillId // 👈 เติมคำนี้ลงไปเพื่อให้หน้าอื่นเรียกใช้ได้ครับ!
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}