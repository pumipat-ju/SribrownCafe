import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import SettingsTab from '../components/SettingsTab';
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
    const location = useLocation();
    const activeTab = location.pathname.split('/').pop() || 'pos-menu';
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
    // 🌟 ฟังก์ชันแปลงเวลา
    // ==========================================
    const getTxnDate = (t) => {
        let dateVal = t.date_raw || t.dateRaw || t.timestamp || t.created_at;
        if (!dateVal) return new Date(0);

        if (typeof dateVal === 'string' && !dateVal.includes('Z') && !dateVal.includes('+')) {
            if (dateVal.includes('-') && dateVal.includes(':')) {
                dateVal = dateVal.replace(' ', 'T') + 'Z';
            }
        }

        const parsed = new Date(dateVal);
        return isNaN(parsed.getTime()) ? new Date(0) : parsed;
    };

    // ===============================================
    // 🌟 ระบบคำนวณสรุปกะ
    // ===============================================
    // ===============================================
    // 🌟 ระบบคำนวณสรุปกะ (เวอร์ชัน Data Analyst 📊)
    // ===============================================
    const getStats = () => {
        const start = parseFloat(shift?.startCash || 0);

        if (!shift?.isOpen || !shift?.startTime || !transactions || transactions.length === 0) {
            return {
                start, salesCash: 0, salesQr: 0, salesWallet: 0,
                topupCash: 0, topupQr: 0, cashIn: 0, cashOut: 0,
                expected: start, actual: 0, diff: 0, netSales: 0,
                totalBills: 0, totalDiscount: 0, subTotal: 0, vatAmount: 0, salesBeforeVat: 0, avgTrans: 0,
                discountsBreakdown: {}, salesByCategory: {}, salesByGroup: {}
            };
        }

        const startTimeStamp = new Date(shift.startTime).getTime();
        const currentShiftTxns = transactions.filter(t => getTxnDate(t).getTime() >= startTimeStamp && t.status !== 'VOIDED');

        let salesCash = 0, salesQr = 0, salesWallet = 0;
        let topupCash = 0, topupQr = 0;
        let cashIn = 0, cashOut = 0;
        let totalDiscount = 0, totalBills = 0;
        let subTotal = 0, vatAmount = 0, salesBeforeVat = 0;
        let discountsBreakdown = {};

        // 🌟 1. สร้างถังเก็บข้อมูลเพื่อใช้วิเคราะห์
        let salesByCategory = {};

        currentShiftTxns.forEach(t => {
            const method = String(t.method || t.paymentMethod || '').toUpperCase();
            const amt = parseFloat(t.amount || t.total || 0);
            const type = String(t.type || '').toUpperCase();
            const disc = parseFloat(t.discount || 0);
            const promoName = t.promotionName || 'ส่วนลดทั่วไป';

            if (type === 'SALE') {
                totalBills++;
                totalDiscount += disc;

                subTotal += parseFloat(t.subtotal || (amt + disc));
                vatAmount += parseFloat(t.vatAmount || 0);
                salesBeforeVat += parseFloat(t.beforeVat || 0);

                if (disc > 0) {
                    if (!discountsBreakdown[promoName]) discountsBreakdown[promoName] = { count: 0, amount: 0 };
                    discountsBreakdown[promoName].count += 1;
                    discountsBreakdown[promoName].amount += disc;
                }

                if (method === 'CASH' || method === 'เงินสด') salesCash += amt;
                else if (method === 'QR' || method === 'PROMPTPAY') salesQr += amt;
                else if (method === 'WALLET' || method === 'E-WALLET' || method === 'EWALLET') salesWallet += amt;

                // 🌟 2. สายวิเคราะห์: แกะถุง items เพื่อนับยอดแยกหมวดหมู่
                let parsedItems = [];
                if (typeof t.items === 'string') {
                    try { parsedItems = JSON.parse(t.items); } catch (e) { }
                } else if (Array.isArray(t.items)) {
                    parsedItems = t.items;
                }

                parsedItems.forEach(item => {
                    // หาชื่อหมวดหมู่ ถ้าสินค้าไหนไม่ได้ตั้งหมวดหมู่ไว้ จะจับยัดลง 'อื่นๆ'
                    const catName = item.category_th || item.category_th || item.category_en || item.category_name || item.categoryName || item.category || 'อื่นๆ';
                    const itemQty = parseFloat(item.qty || 1);
                    const itemTotal = parseFloat(item.price || 0) * itemQty;

                    if (!salesByCategory[catName]) {
                        salesByCategory[catName] = { qty: 0, amount: 0 };
                    }
                    // จับบวกรวมจำนวนชิ้น และ ยอดเงิน
                    salesByCategory[catName].qty += itemQty;
                    salesByCategory[catName].amount += itemTotal;
                });
            }
            else if (type === 'TOPUP') {
                if (method === 'CASH' || method === 'เงินสด') topupCash += amt;
                else if (method === 'QR' || method === 'PROMPTPAY') topupQr += amt;
            }
            else if (type === 'INCOME') cashIn += amt;
            else if (type === 'EXPENSE' || type === 'SHIFT_CLOSE') {
                if (t.bill_id !== `SHIFT-${Math.floor(Date.now() / 1000)}`) cashOut += Math.abs(amt);
            }
        });

        const netSales = salesCash + salesQr + salesWallet;
        const avgTrans = totalBills > 0 ? netSales / totalBills : 0;
        const expected = start + salesCash + topupCash + cashIn - cashOut;
        const actual = parseFloat(cashAmount || 0);
        const diff = actual - expected;

        return {
            start, salesCash, salesQr, salesWallet,
            topupCash, topupQr, cashIn, cashOut,
            expected, actual, diff, netSales, totalBills,
            totalDiscount, subTotal, vatAmount, salesBeforeVat, avgTrans,
            discountsBreakdown,
            salesByCategory,
            salesByGroup: {}
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
            // 🌟 แมปปิ้งข้อมูลให้ตรงเป๊ะ
            startCash: stats.start,
            salesCash: stats.salesCash,
            salesQr: stats.salesQr,          // 👈 เปลี่ยนจาก salesOther เป็น salesQr
            salesWallet: stats.salesWallet,  // 👈 เพิ่มการส่งยอด salesWallet
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
            salesQr: stats.salesQr,          // 👈 เปลี่ยนจาก salesOther เป็น salesQr
            salesWallet: stats.salesWallet,  // 👈 เพิ่มการส่งยอด salesWallet
            topupCash: stats.topupCash,
            cashIn: stats.cashIn,
            cashOut: stats.cashOut,
            expectedCash: stats.expected,
            actualCash: parseFloat(cashAmount || stats.expected),
            difference: parseFloat(cashAmount || stats.expected) - stats.expected,
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
        { id: 'settings', icon: 'settings', label: 'Settings' },
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
                        <button key={item.id} onClick={() => { navigate('/admin/' + item.id); setIsNavOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[13px] font-bold transition-all ${activeTab === item.id ? 'bg-white shadow-md text-[#861b00]' : 'text-stone-500 hover:bg-white'}`}>
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
                        <Routes>
                            <Route path="dashboard" element={<DashboardTab />} />
                            <Route path="pos-menu" element={<PosMenuTab />} />
                            <Route path="history" element={<HistoryTab />} />
                            <Route path="crm" element={<CRMTab />} />
                            <Route path="employees" element={<EmployeesTab />} />
                            <Route path="cash" element={<CashTab />} />
                            <Route path="inventory" element={<InventoryTab />} />
                            <Route path="settings" element={<SettingsTab />} />
                            {/* Default path redirects to Dashboard or Menu */}
                            <Route path="/" element={<Navigate to="pos-menu" replace />} />
                        </Routes>
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
            {/* 🛡️ MODAL: CLOSE SHIFT */}
            {/* ========================================================= */}
            {isCloseShiftModal && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md overflow-y-auto">
                    <div className="bg-[#f8fafc] rounded-[2.5rem] p-6 md:p-8 w-full max-w-[700px] shadow-2xl border-2 border-white animate-in slide-in-from-bottom-8 mt-10">
                        <div className="flex flex-col lg:flex-row gap-8">

                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-black text-stone-800 tracking-tight">สรุปยอดเงินสดในลิ้นชัก</h2>
                                    <button onClick={() => setIsCloseShiftModal(false)} className="lg:hidden text-stone-400"><span className="material-symbols-outlined">close</span></button>
                                </div>

                                <div className="space-y-6 mb-6 bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                                    <div>
                                        <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span> ยอดขายสินค้า
                                        </p>
                                        <div className="space-y-2">
                                            <StatRow label="ขายด้วยเงินสด" value={stats.salesCash} />
                                            <StatRow label="ขายด้วย QR / โอน" value={stats.salesQr} />
                                            <StatRow label="ขายด้วย E-Wallet" value={stats.salesWallet} />
                                            <div className="flex justify-between border-t border-stone-50 pt-2 mt-1">
                                                <span className="text-xs font-black text-stone-400 uppercase">ยอดขายสุทธิ (Net Sales)</span>
                                                <span className="text-sm font-black text-stone-800">฿{stats.netSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {stats.discountsBreakdown && Object.keys(stats.discountsBreakdown).length > 0 && (
                                        <div className="pt-2 border-t border-stone-50">
                                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[14px]">loyalty</span> รายละเอียดส่วนลดที่ใช้ไป
                                            </p>
                                            <div className="space-y-1 bg-stone-50 p-3 rounded-xl border border-stone-100">
                                                {Object.entries(stats.discountsBreakdown).map(([name, data]) => (
                                                    <div key={name} className="flex items-center text-xs text-stone-600 font-bold w-full">
                                                        <span className="flex-1 truncate">{name}</span>
                                                        <span className="w-16 text-right text-stone-400">({data.count} บิล)</span>
                                                        <span className="w-20 text-right text-amber-600">฿{data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between items-center text-xs font-black text-stone-800 pt-2 mt-2 border-t border-stone-200">
                                                    <span>รวมส่วนลดทั้งหมด</span>
                                                    <span className="text-amber-600">฿{stats.totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> ยอดเติมเงินสมาชิก
                                        </p>
                                        <div className="space-y-2">
                                            <StatRow label="เติมด้วยเงินสด" value={stats.topupCash} />
                                            <StatRow label="เติมด้วย QR / โอน" value={stats.topupQr} />
                                            <div className="flex justify-between border-t border-stone-50 pt-2 mt-1">
                                                <span className="text-xs font-black text-stone-400 uppercase">รวมเงินฝากสมาชิก</span>
                                                <span className="text-sm font-black text-stone-800">฿{(stats.topupCash + stats.topupQr).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-[#861b00]/5 p-5 rounded-[2rem] border border-[#861b00]/10 shadow-inner">
                                        <p className="text-[10px] font-black text-[#861b00] uppercase tracking-widest mb-3">สรุปเงินสดที่ควรมีในเก๊ะ</p>
                                        <div className="space-y-2">
                                            <StatRow label="เงินทอนเริ่มต้น" value={stats.start} />
                                            <StatRow label="บวก: เงินสดจากยอดขาย" value={stats.salesCash} isAdd />
                                            <StatRow label="บวก: เงินสดจากยอดเติมเงิน" value={stats.topupCash} isAdd />
                                            <StatRow label="บวก/หัก: บันทึก รับ-จ่าย" value={stats.cashIn - stats.cashOut} isAdd={stats.cashIn >= stats.cashOut} isSub={stats.cashIn < stats.cashOut} />

                                            <div className="border-t-2 border-[#861b00]/20 my-2 pt-3 flex justify-between items-center">
                                                <span className="text-[13px] font-black text-stone-600">เงินสดสุทธิที่ต้องมี</span>
                                                <span className="text-2xl font-black text-[#861b00]">฿{stats.expected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className={`p-5 rounded-3xl border-2 flex flex-col items-center justify-center transition-all ${stats.diff === 0 ? 'bg-white border-stone-100' : stats.diff < 0 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">ส่วนต่างเงินสด (Over/Short)</p>
                                    <p className="text-3xl font-black">
                                        {stats.diff > 0 ? '+' : ''}{stats.diff.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

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
            {/* 🚨 CUSTOM ALERT MODAL */}
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
            {/* ❓ CUSTOM CONFIRM MODAL */}
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