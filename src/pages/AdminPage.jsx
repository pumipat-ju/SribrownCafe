import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { fetchJSON } from '../api.js';

// นำเข้าแท็บต่างๆ
import HistoryTab from '../components/HistoryTab';
import CRMTab from '../components/CRMTab';
import MembersTab from '../components/MembersTab';
import EmployeesTab from '../components/EmployeesTab';
import CashTab from '../components/CashTab';
import MarketingTab from '../components/MarketingTab';
import InventoryTab from '../components/InventoryTab';
import DashboardTab from '../components/DashboardTab';
import PosMenuTab from '../components/PosMenuTab';
import ReceiptPrintout from '../components/ReceiptPrintout';

export default function AdminPage() {
    const { currentEmployee, shift, setShift, orders, transactions } = useContext(AppContext);
    const navigate = useNavigate();

    // --- Shift Logic States ---
    const [isOpenShiftModal, setIsOpenShiftModal] = useState(false);
    const [isCloseShiftModal, setIsCloseShiftModal] = useState(false);
    const [cashAmount, setCashAmount] = useState('');
    const [shiftReceipt, setShiftReceipt] = useState(null);

    // 🌟 1. เพิ่ม State สำหรับ Custom Modals แจ้งเตือนและยืนยัน
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, actualCash: 0 });

    // --- UI States ---
    const [activeTab, setActiveTab] = useState('pos-menu');
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [timeStr, setTimeStr] = useState('');

    // 🛡️ บังคับเปิดกะ (Safe Check)
    useEffect(() => {
        if (!shift?.isOpen) {
            setIsOpenShiftModal(true);
        }
    }, [shift?.isOpen]);

    // 🕒 ระบบนาฬิกา
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
            setTimeStr(`${now.toLocaleDateString('th-TH', options)} | ${now.toLocaleTimeString('th-TH')}`);
        };
        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    // ⌨️ ระบบดักฟังแป้นพิมพ์ (Keyboard Support)
    useEffect(() => {
        const handleKeyDown = (e) => {
            // ไม่ให้กดคีย์บอร์ดตอน Modal แจ้งเตือนเปิดอยู่
            if (alertModal.isOpen || confirmModal.isOpen) return;
            if (!isOpenShiftModal && !isCloseShiftModal) return;

            if (e.key >= '0' && e.key <= '9') {
                if (cashAmount.length < 8) setCashAmount(prev => prev + e.key);
            } else if (e.key === 'Backspace') {
                setCashAmount(prev => prev.slice(0, -1));
            } else if (e.key === 'Enter') {
                if (isOpenShiftModal && cashAmount) handleOpenShift();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpenShiftModal, isCloseShiftModal, cashAmount, alertModal.isOpen, confirmModal.isOpen]);

    // ==========================================
    // 🌟 เพิ่ม Smart Date Parser (ฟังก์ชันประกอบร่างเวลา)
    // ==========================================
    const getTxnDate = (t) => {
        const isoTime = t.created_at || t.timestamp || t.date_raw || t.dateRaw;
        if (isoTime) {
            const parsed = new Date(isoTime);
            if (!isNaN(parsed) && parsed.getTime() !== 0) return parsed;
        }

        if (t.date) {
            try {
                const dateParts = t.date.split('/');
                if (dateParts.length === 3) {
                    let day = parseInt(dateParts[0]);
                    let month = parseInt(dateParts[1]) - 1; // JS นับเดือน 0-11
                    let year = parseInt(dateParts[2]);

                    // แปลง พ.ศ. เป็น ค.ศ. อัตโนมัติ
                    if (year > 2500) year -= 543;

                    let hour = 0, minute = 0;
                    if (t.time) {
                        const timeStr = t.time.replace('น.', '').trim();
                        const timeParts = timeStr.split(':');
                        if (timeParts.length >= 2) {
                            hour = parseInt(timeParts[0]);
                            minute = parseInt(timeParts[1]);
                        }
                    }
                    return new Date(year, month, day, hour, minute);
                }
            } catch (e) {
                console.warn("Date parse error", e);
            }
        }
        return new Date(0);
    };

    // ===============================================
    // 🌟 ระบบคำนวณปิดกะ (แกะตะกร้าสินค้าระดับ Enterprise)
    // ==========================================
    const getStats = () => {
        const start = parseFloat(shift?.startCash || 0);

        if (!shift?.isOpen || !shift?.startTime || !transactions) {
            return { start, salesCash: 0, salesOther: 0, topupCash: 0, cashIn: 0, cashOut: 0, expected: start, actual: 0, diff: 0 };
        }

        // 🌟 ใช้ Smart Date Parser
        const currentShiftTxns = transactions.filter(t => {
            const txTime = getTxnDate(t);
            return txTime > new Date(shift.startTime);
        });

        // --- ตัวแปรสำหรับเก็บข้อมูลเชิงลึก ---
        let salesCash = 0, salesOther = 0, topupCash = 0, cashIn = 0, cashOut = 0;
        let subTotal = 0, totalDiscount = 0, netSales = 0;
        let totalBills = 0;

        let salesByGroup = {};
        let salesByCategory = {};
        let discountsBreakdown = {};

        currentShiftTxns.forEach(t => {
            const method = String(t.method || t.paymentMethod || '').toUpperCase();
            const isCash = method === 'CASH' || method === 'เงินสด';
            const amt = parseFloat(t.amount || t.total || 0);
            const disc = parseFloat(t.discount || 0);

            if (t.type === 'SALE') {
                totalBills++;
                netSales += amt;
                totalDiscount += disc;

                if (isCash) salesCash += amt;
                else salesOther += amt;

                // --- ส่วนลด ---
                if (disc > 0) {
                    const promoName = t.promotionName || 'ส่วนลดทั่วไป';
                    if (!discountsBreakdown[promoName]) discountsBreakdown[promoName] = { count: 0, amount: 0 };
                    discountsBreakdown[promoName].count += 1;
                    discountsBreakdown[promoName].amount += disc;
                }

                // --- แกะรายการสินค้าในบิล ---
                let items = [];
                try { items = typeof t.items === 'string' ? JSON.parse(t.items) : (t.items || []); } catch (e) { }

                let billSubTotal = 0;
                items.forEach(item => {
                    const qty = parseInt(item.qty || 1);
                    const price = parseFloat(item.price || 0);
                    const itemTotal = qty * price;
                    billSubTotal += itemTotal;

                    // 💡 Logic จัดหมวดหมู่อัตโนมัติ
                    let cat = item.category || 'อื่นๆ';
                    let group = 'หมวดเบ็ดเตล็ด';
                    const name = (item.name || '').toLowerCase();

                    if (name.includes('กาแฟ') || name.includes('ชา') || name.includes('ลาเต้') || name.includes('อเมริกาโน่') || name.includes('มัทฉะ') || name.includes('โซดา') || name.includes('นม')) {
                        group = 'เครื่องดื่ม';
                        if (name.includes('กาแฟ') || name.includes('อเมริกาโน่') || name.includes('ลาเต้')) cat = 'กาแฟ';
                        else if (name.includes('ชา') || name.includes('มัทฉะ')) cat = 'ชา';
                        else cat = 'Non Caffeine';
                    } else if (name.includes('เค้ก') || name.includes('ครัวซองต์') || name.includes('บราวนี่') || name.includes('โทสต์') || name.includes('คุกกี้')) {
                        group = 'ขนม';
                        if (name.includes('เค้ก')) cat = 'เค้ก';
                        else cat = 'ขนมอบ';
                    } else if (name.includes('เมล็ด')) {
                        group = 'หมวดเบ็ดเตล็ด';
                        cat = 'เมล็ดกาแฟ';
                    }

                    // นับเข้า Group (หมวดใหญ่)
                    if (!salesByGroup[group]) salesByGroup[group] = { qty: 0, amount: 0 };
                    salesByGroup[group].qty += qty;
                    salesByGroup[group].amount += itemTotal;

                    // นับเข้า Category (หมวดย่อย)
                    if (!salesByCategory[cat]) salesByCategory[cat] = { qty: 0, amount: 0 };
                    salesByCategory[cat].qty += qty;
                    salesByCategory[cat].amount += itemTotal;
                });

                subTotal += billSubTotal;
            }
            else if (t.type === 'TOPUP') {
                if (isCash) topupCash += amt;
                else salesOther += amt;
            }
            else if (t.type === 'INCOME') cashIn += amt;
            else if (t.type === 'EXPENSE') cashOut += Math.abs(amt);
        });

        // --- คำนวณภาษีและค่าเฉลี่ย ---
        const vatRate = 0.07; // ภาษี 7% (Include VAT)
        const salesBeforeVat = netSales / (1 + vatRate);
        const vatAmount = netSales - salesBeforeVat;
        const avgTrans = totalBills > 0 ? netSales / totalBills : 0;

        const expected = start + salesCash + topupCash + cashIn - cashOut;
        const actual = parseFloat(cashAmount || 0);
        const diff = actual - expected;

        // โยน Data ก้อนใหญ่ทั้งหมดออกไป
        return {
            start, salesCash, salesOther, topupCash, cashIn, cashOut, expected, actual, diff,
            subTotal, totalDiscount, netSales, salesBeforeVat, vatAmount, totalBills, avgTrans,
            salesByGroup, salesByCategory, discountsBreakdown
        };
    };

    const stats = getStats();

    // ==========================================
    // 🌟 Action Handlers
    // ==========================================
    const handleKeypadClick = (val) => {
        if (val === 'C') setCashAmount('');
        else if (val === 'DEL') setCashAmount(prev => prev.slice(0, -1));
        else if (cashAmount.length < 8) setCashAmount(prev => prev + val);
    };

    const handleOpenShift = () => {
        const amount = parseFloat(cashAmount || 0);
        setShift({
            isOpen: true,
            startTime: new Date().toISOString(),
            startCash: amount,
            cashIn: 0,
            cashOut: 0,
            employeeName: currentEmployee?.name || 'พนักงาน'
        });
        setIsOpenShiftModal(false);
        setCashAmount('');
    };

    const handleCloseShiftRequest = () => {
        const actualCash = parseFloat(cashAmount || 0);
        if (!cashAmount && cashAmount !== '0') {
            setAlertModal({ isOpen: true, message: 'กรุณากรอกยอดเงินสดที่นับได้จริงก่อนทำการปิดกะครับ' });
            return;
        }
        setConfirmModal({ isOpen: true, actualCash });
    };

    const executeCloseShift = async () => {
        setConfirmModal({ isOpen: false, actualCash: 0 });
        const endShiftTime = new Date();
        const zReportData = {
            id: `SHIFT-${Math.floor(Date.now() / 1000)}`,
            type: 'Z_REPORT',
            cashier: currentEmployee?.name || 'พนักงาน',
            startTime: shift.startTime,
            endTime: endShiftTime.toISOString(),
            startCash: stats.start,
            salesCash: stats.salesCash,
            salesOther: stats.salesOther,
            topupCash: stats.topupCash,
            cashIn: stats.cashIn,
            cashOut: stats.cashOut,
            expectedCash: stats.expected,
            actualCash: stats.actual,
            difference: stats.diff,
            subTotal: stats.subTotal,
            totalDiscount: stats.totalDiscount,
            netSales: stats.netSales,
            salesBeforeVat: stats.salesBeforeVat,
            vatAmount: stats.vatAmount,
            totalBills: stats.totalBills,
            avgTrans: stats.avgTrans,
            salesByGroup: stats.salesByGroup,
            salesByCategory: stats.salesByCategory,
            discountsBreakdown: stats.discountsBreakdown
        };

        try {
            await fetchJSON('/transactions/', {
                method: 'POST',
                body: JSON.stringify({
                    bill_id: zReportData.id,
                    type: 'SHIFT_CLOSE',
                    amount: zReportData.actualCash,
                    method: 'CASH',
                    desc: `สรุปปิดกะ (เงินส่วนต่าง: ${stats.diff >= 0 ? '+' : ''}${stats.diff} บาท)`,
                    cashier: zReportData.cashier,
                    date_raw: endShiftTime.toISOString(),
                    time: endShiftTime.toLocaleTimeString('th-TH').slice(0, 5) + ' น.',
                    date: endShiftTime.toLocaleDateString('th-TH'),
                    items: JSON.stringify([zReportData])
                })
            });
        } catch (e) {
            console.warn('Shift save offline fallback:', e);
        }

        setShiftReceipt(zReportData);

        setTimeout(() => {
            window.print();
            setShift({ isOpen: false, startCash: 0 });
            setIsCloseShiftModal(false);
            setCashAmount('');
            setShiftReceipt(null);
            navigate('/');
        }, 500);
    };

    // 🌟 4. อัปเดตข้อมูลให้ครบถ้วนใน X-Report
    const handlePrintXReport = () => {
        const currentTime = new Date();
        const xReportData = {
            id: `X-REPORT (ระหว่างกะ)`,
            type: 'X_REPORT',
            cashier: currentEmployee?.name || 'พนักงาน',
            startTime: shift.startTime,
            endTime: currentTime.toISOString(),
            startCash: stats.start,
            salesCash: stats.salesCash,
            salesOther: stats.salesOther,
            topupCash: stats.topupCash,
            cashIn: stats.cashIn,
            cashOut: stats.cashOut,
            expectedCash: stats.expected,
            actualCash: parseFloat(cashAmount || stats.expected),
            difference: parseFloat(cashAmount || stats.expected) - stats.expected,

            // 🌟 เพิ่มข้อมูล 4 ส่วนหลักส่งไปให้ X-Report พิมพ์ด้วย
            subTotal: stats.subTotal,
            totalDiscount: stats.totalDiscount,
            netSales: stats.netSales,
            salesBeforeVat: stats.salesBeforeVat,
            vatAmount: stats.vatAmount,
            totalBills: stats.totalBills,
            avgTrans: stats.avgTrans,
            salesByGroup: stats.salesByGroup,
            salesByCategory: stats.salesByCategory,
            discountsBreakdown: stats.discountsBreakdown
        };

        setShiftReceipt(xReportData);

        setTimeout(() => {
            window.print();
            setTimeout(() => setShiftReceipt(null), 500);
        }, 500);
    };

    const navItems = [
        { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
        { id: 'pos-menu', icon: 'point_of_sale', label: 'Menu' },
        { id: 'crm', icon: 'campaign', label: 'Membership' },
        { id: 'employees', icon: 'badge', label: 'Employees' },
        { id: 'inventory', icon: 'inventory_2', label: 'Inventory' },
        { id: 'cash', icon: 'payments', label: 'Cash Drawer' },
        { id: 'history', icon: 'receipt_long', label: 'Transaction History' },
    ];

    return (
        <div className="flex h-screen bg-[#fafaf5] text-stone-800 font-body overflow-hidden relative">

            <style>{`
                .neumorph-btn { background: #f8fafc; box-shadow: 4px 4px 8px #d1d5db, -4px -4px 8px #ffffff; transition: all 0.2s ease; }
                .neumorph-btn:active { box-shadow: inset 4px 4px 8px #d1d5db, inset -4px -4px 8px #ffffff; transform: translateY(1px); }
                @keyframes flow { 0% { background-position: 0% 50% } 50% { background-position: 100% 50% } 100% { background-position: 0% 50% } }
                .animate-sribrown { background: linear-gradient(-45deg, #861b00, #a12c12, #5a1200, #861b00); background-size: 300% 300%; animation: flow 6s ease infinite; }
            `}</style>

            <div className={`fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${isNavOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsNavOpen(false)}></div>

            <aside className={`fixed top-0 left-0 h-full w-72 bg-[#f4f4f4] border-r border-stone-200 flex flex-col z-50 transition-transform duration-300 shadow-2xl rounded-r-[2rem] ${isNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="relative p-6 pt-10 pb-8 flex flex-col items-center text-center border-b border-stone-200/50">
                    <button onClick={() => setIsNavOpen(false)} className="absolute top-4 right-4 text-stone-400 hover:text-[#861b00] hover:bg-stone-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors lg:hidden">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>

                    <div className="flex flex-col items-center gap-3">
                        <div className="w-20 h-20 rounded-[1.25rem] overflow-hidden shadow-[0_8px_16px_-6px_rgba(134,27,0,0.3)] border-2 border-white bg-white shrink-0 transition-transform hover:scale-105 duration-300">
                            <img src="/sribrown-logo-(brown).jpg" alt="SRI BROWN Logo" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h1 className="text-[18px] font-black text-[#861b00] tracking-tight leading-tight mt-1">SRI BROWN</h1>
                            <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Coffee Roastery</p>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id); setIsNavOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[13px] font-bold transition-all ${activeTab === item.id ? 'bg-white shadow-md text-[#861b00]' : 'text-stone-500 hover:bg-white'}`}>
                            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>{item.label}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-stone-200/50">
                    <button onClick={() => navigate('/')} className="w-full py-4 text-stone-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all">
                        <span className="material-symbols-outlined">logout</span> Logout
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 md:h-20 border-b border-stone-200 flex justify-between items-center px-4 md:px-8 bg-[#fafaf5]/80 backdrop-blur-md z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsNavOpen(true)} className="w-10 h-10 rounded-full hover:bg-stone-200 flex items-center justify-center text-stone-700 transition-colors"><span className="material-symbols-outlined text-[24px]">menu</span></button>
                        <div className="hidden sm:block text-[11px] font-bold text-stone-500 bg-stone-100 px-4 py-2 rounded-full">{timeStr}</div>
                    </div>
                    <div className="flex items-center gap-3">
                        {shift?.isOpen && (
                            <button onClick={() => { setCashAmount(''); setIsCloseShiftModal(true); }} className="px-5 py-2 bg-stone-800 hover:bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Close Shift</button>
                        )}
                        {!shift?.isOpen && <span className="px-4 py-1.5 bg-red-100 text-red-600 rounded-full text-[10px] font-black animate-pulse">ยังไม่เปิดกะ</span>}
                        <div className="w-9 h-9 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-bold border border-stone-300/50 uppercase ml-2">{currentEmployee?.name?.charAt(0)}</div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
                    <div key={activeTab} className="h-full animate-in fade-in zoom-in-95 duration-500">
                        {activeTab === 'dashboard' && <DashboardTab />}
                        {activeTab === 'pos-menu' && <PosMenuTab />}
                        {activeTab === 'history' && <HistoryTab />}
                        {activeTab === 'crm' && <CRMTab />}
                        {activeTab === 'employees' && <EmployeesTab />}
                        {activeTab === 'cash' && <CashTab />}
                        {activeTab === 'inventory' && <InventoryTab />}
                    </div>
                </main>
            </div>

            {/* ========================================================= */}
            {/* 🛡️ MODAL: OPEN SHIFT */}
            {/* ========================================================= */}
            {isOpenShiftModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
                    <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-8 w-full max-w-[320px] shadow-2xl border-2 border-white animate-in zoom-in-95 text-center">
                        <div className="w-14 h-14 animate-sribrown rounded-2xl flex items-center justify-center mx-auto mb-4 text-white"><span className="material-symbols-outlined text-3xl">stadium</span></div>
                        <h2 className="text-xl font-black text-stone-800 mb-1">เริ่มวันทำงานใหม่</h2>
                        <p className="text-stone-400 text-[11px] font-bold mb-5 uppercase tracking-widest">เงินทอนเริ่มต้นในลิ้นชัก</p>
                        <div className="relative mb-5">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-[#861b00]/50">฿</span>
                            <input type="text" value={cashAmount ? parseFloat(cashAmount).toLocaleString() : ''} readOnly className="w-full pl-10 pr-4 py-3.5 bg-stone-50 border-2 border-stone-100 rounded-2xl font-black text-4xl text-center text-[#861b00] outline-none shadow-inner" placeholder="0" />
                        </div>
                        <div className="grid grid-cols-3 gap-2.5 mb-6">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                <button key={num} onClick={() => handleKeypadClick(num)} className="neumorph-btn h-14 text-xl font-black rounded-xl text-stone-700">{num === 'DEL' ? <span className="material-symbols-outlined">backspace</span> : num}</button>
                            ))}
                        </div>
                        <button onClick={handleOpenShift} disabled={!cashAmount} className={`w-full py-4 rounded-xl font-black text-base shadow-xl transition-all active:scale-95 ${cashAmount ? 'animate-sribrown text-white shadow-[#861b00]/30' : 'bg-stone-100 text-stone-300'}`}>เริ่มกะขาย</button>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 🛡️ MODAL: CLOSE SHIFT (โฟกัสเฉพาะเงินสดในลิ้นชัก) */}
            {/* ========================================================= */}
            {isCloseShiftModal && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md overflow-y-auto">
                    <div className="bg-[#f8fafc] rounded-[2.5rem] p-6 md:p-8 w-full max-w-[700px] shadow-2xl border-2 border-white animate-in slide-in-from-bottom-8 mt-10">
                        <div className="flex flex-col lg:flex-row gap-8">

                            {/* ส่วนซ้าย: สรุปยอด (Shift Stats) */}
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-black text-stone-800 tracking-tight">สรุปยอดเงินสดในลิ้นชัก</h2>
                                    <button onClick={() => setIsCloseShiftModal(false)} className="lg:hidden text-stone-400"><span className="material-symbols-outlined">close</span></button>
                                </div>

                                <div className="space-y-3 mb-6 bg-white p-5 rounded-3xl border border-stone-100 shadow-sm">
                                    <StatRow label="เงินทอนเริ่มต้น" value={stats.start} />
                                    <StatRow label="ยอดขายสินค้า (เงินสด)" value={stats.salesCash} isAdd />
                                    <StatRow label="ยอดเติม E-Wallet (เงินสด)" value={stats.topupCash} isAdd />
                                    <StatRow label="บันทึกรับ (นำเงินเข้า)" value={stats.cashIn} isAdd />
                                    <StatRow label="บันทึกจ่าย (นำเงินออก)" value={stats.cashOut} isSub />
                                    <div className="border-t border-dashed border-stone-200 my-2 pt-2"></div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-black text-stone-500">เงินสดที่ควรมีในลิ้นชัก</span>
                                        <span className="text-2xl font-black text-[#861b00]">฿{stats.expected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-blue-600">
                                            <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                                            <span className="text-[11px] font-bold">ยอดโอน/QR (ตัดอัตโนมัติ)</span>
                                        </div>
                                        <span className="text-sm font-black text-blue-700">฿{stats.salesOther.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                <div className={`p-5 rounded-3xl border-2 flex flex-col items-center justify-center transition-all ${stats.diff === 0 ? 'bg-white border-stone-100' : stats.diff < 0 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">ส่วนต่างเงินสด (Over/Short)</p>
                                    <p className="text-3xl font-black">
                                        {stats.diff > 0 ? '+' : ''}{stats.diff.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            {/* ส่วนขวา: Keypad ใส่เงินที่มีจริง */}
                            <div className="w-full lg:w-[300px] flex flex-col">
                                <div className="hidden lg:flex justify-end mb-4">
                                    <button onClick={() => setIsCloseShiftModal(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-stone-400 shadow-sm hover:bg-stone-50"><span className="material-symbols-outlined">close</span></button>
                                </div>

                                <div className="bg-white border-2 border-stone-100 rounded-3xl p-5 mb-5 shadow-inner">
                                    <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest text-center mb-1">นับเงินสดที่มีจริงในเก๊ะ</p>
                                    <input type="text" value={cashAmount ? parseFloat(cashAmount).toLocaleString() : ''} readOnly className="w-full py-2 bg-transparent font-black text-4xl text-center text-stone-800 outline-none" placeholder="0" />
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-6">
                                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                        <button key={num} onClick={() => handleKeypadClick(num)} className="neumorph-btn h-12 text-xl font-black rounded-xl text-stone-700">{num === 'DEL' ? <span className="material-symbols-outlined text-2xl">backspace</span> : num}</button>
                                    ))}
                                </div>

                                <div className="flex flex-col gap-3 mt-auto">
                                    <button onClick={handlePrintXReport} className="w-full py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-black rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 border border-stone-200 active:scale-95">
                                        <span className="material-symbols-outlined text-[20px]">print</span> พิมพ์รายงาน (X-Report)
                                    </button>
                                    <button onClick={handleCloseShiftRequest} className="w-full py-4 bg-stone-800 hover:bg-black text-white font-black rounded-2xl shadow-xl transition-all active:scale-95">
                                        ยืนยันปิดกะการขาย
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 🚨 CUSTOM ALERT MODAL (แทนที่ window.alert) */}
            {/* ========================================================= */}
            {alertModal.isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 text-center flex flex-col items-center border border-white">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner">
                            <span className="material-symbols-outlined text-4xl">error</span>
                        </div>
                        <h3 className="text-xl font-black text-stone-800 mb-2">ข้อมูลไม่ครบถ้วน</h3>
                        <p className="text-sm font-bold text-stone-500 mb-8">{alertModal.message}</p>
                        <button onClick={() => setAlertModal({ isOpen: false, message: '' })} className="w-full py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-black rounded-xl transition-all active:scale-95">
                            ตกลง
                        </button>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* ❓ CUSTOM CONFIRM MODAL (แทนที่ window.confirm) */}
            {/* ========================================================= */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 text-center flex flex-col items-center border border-white">
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner">
                            <span className="material-symbols-outlined text-4xl">help</span>
                        </div>
                        <h3 className="text-xl font-black text-stone-800 mb-2">ยืนยันปิดกะการขาย?</h3>
                        <p className="text-[13px] font-bold text-stone-500 mb-2">เมื่อปิดกะแล้วระบบจะทำการออกจากระบบทันที</p>
                        <div className="bg-stone-50 border border-stone-100 p-3 rounded-xl w-full mb-8">
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">ยอดเงินสดที่นับได้จริง</p>
                            <p className="text-2xl font-black text-[#861b00]">฿{confirmModal.actualCash.toLocaleString()}</p>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setConfirmModal({ isOpen: false, actualCash: 0 })} className="flex-1 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-black rounded-xl transition-all active:scale-95">
                                ยกเลิก
                            </button>
                            <button onClick={executeCloseShift} className="flex-[1.5] py-3.5 bg-[#861b00] hover:bg-black text-white font-black rounded-xl shadow-lg transition-all active:scale-95">
                                ปิดกะการขาย
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🛡️ สแตนด์บาย Component สำหรับพิมพ์ใบสรุปยอด (Z-Report / X-Report) */}
            {shiftReceipt && (
                <ReceiptPrintout txn={shiftReceipt} />
            )}

        </div>
    );
}

// --- Helper UI Components ---
function StatRow({ label, value, isAdd, isSub }) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="font-bold text-stone-400">{label}</span>
            <span className={`font-black ${isAdd ? 'text-emerald-500' : isSub ? 'text-red-500' : 'text-stone-600'}`}>
                {isAdd ? '+' : isSub ? '-' : ''} ฿{parseFloat(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
        </div>
    );
}