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

export default function AdminPage() {
    const { currentEmployee, shift, setShift, orders, transactions } = useContext(AppContext);
    const navigate = useNavigate();

    // --- Shift Logic States ---
    const [isOpenShiftModal, setIsOpenShiftModal] = useState(false);
    const [isCloseShiftModal, setIsCloseShiftModal] = useState(false);
    const [cashAmount, setCashAmount] = useState(''); // สำหรับกดเงินทอนตอนเปิดกะ และเงินที่มีจริงตอนปิดกะ

    // --- UI States ---
    const [activeTab, setActiveTab] = useState('pos-menu');
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [timeStr, setTimeStr] = useState('');

    // 🛡️ 1. บังคับเปิดกะ (Safe Check)
    useEffect(() => {
        if (!shift?.isOpen) {
            setIsOpenShiftModal(true);
        }
    }, [shift?.isOpen]);

    // 🕒 2. ระบบนาฬิกา
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

    // ⌨️ 3. ระบบดักฟังแป้นพิมพ์ (Keyboard Support)
    useEffect(() => {
        const handleKeyDown = (e) => {
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
    }, [isOpenShiftModal, isCloseShiftModal, cashAmount]);

    const getStats = () => {
        const start = parseFloat(shift?.startCash || 0);
        const cin = parseFloat(shift?.cashIn || 0);
        const cout = parseFloat(shift?.cashOut || 0);

        // 🛡️ ถ้ายังไม่เปิดกะ หรือไม่มีข้อมูลธุรกรรม ให้ส่งค่าเริ่มต้นกลับไปทันที ป้องกัน Crash
        if (!shift?.isOpen || !shift?.startTime || !transactions) {
            return { start, salesCash: 0, salesOther: 0, cashIn: cin, cashOut: cout, expected: start + cin - cout, actual: 0, diff: 0 };
        }

        // 🔍 1. กรองธุรกรรมที่เกิดเฉพาะในกะนี้
        const currentShiftTxns = transactions.filter(t =>
            t.dateRaw &&
            new Date(t.dateRaw) > new Date(shift.startTime)
        );

        // 💰 2. ยอดขาย "เงินสด"
        const salesCash = currentShiftTxns
            .filter(t => t.type === 'SALE' && (t.method === 'CASH' || t.paymentMethod === 'CASH'))
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        // 💳 3. ยอดขาย "อื่นๆ"
        const salesOther = currentShiftTxns
            .filter(t => t.type === 'SALE' && (t.method !== 'CASH' && t.paymentMethod !== 'CASH'))
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        // 🧮 4. คำนวณยอดสุทธิ
        const expected = start + salesCash + cin - cout;
        const actual = parseFloat(cashAmount || 0);
        const diff = actual - expected;

        return {
            start,
            salesCash,
            salesOther,
            cashIn: cin,
            cashOut: cout,
            expected,
            actual,
            diff
        };
    };

    // เรียกใช้ผลคำนวณแบบปลอดภัย
    const stats = getStats(); // เรียกใช้ผลคำนวณ
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

    const handleCloseShift = () => {
        if (window.confirm("ยืนยันการปิดกะขายและบันทึกยอดส่วนต่าง?")) {
            setShift({ isOpen: false, startCash: 0 });
            setIsCloseShiftModal(false);
            setCashAmount('');
            navigate('/');
        }
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

            {/* Sidebar & Header (รักษา Navigator เดิมของคุณ) */}
            <div className={`fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${isNavOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsNavOpen(false)}></div>

            <aside className={`fixed top-0 left-0 h-full w-72 bg-[#f4f4f4] border-r border-stone-200 flex flex-col z-50 transition-transform duration-300 shadow-2xl rounded-r-[2rem] ${isNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 flex justify-between items-center border-b border-stone-200/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl animate-sribrown text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-[#861b00]/20">S</div>
                        <h1 className="text-sm font-black text-[#861b00] uppercase tracking-wider">Sri Brown</h1>
                    </div>
                    <button onClick={() => setIsNavOpen(false)} className="text-stone-400"><span className="material-symbols-outlined">close</span></button>
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
            {/* 🛡️ MODAL: CLOSE SHIFT (อ้างอิงตามรูปภาพที่ส่งมา) */}
            {/* ========================================================= */}
            {isCloseShiftModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md overflow-y-auto">
                    <div className="bg-[#f8fafc] rounded-[2.5rem] p-6 md:p-8 w-full max-w-[700px] shadow-2xl border-2 border-white animate-in slide-in-from-bottom-8">
                        <div className="flex flex-col lg:flex-row gap-8">

                            {/* ส่วนซ้าย: สรุปยอด (Shift Stats) */}
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-black text-stone-800 tracking-tight">สรุปยอดกะขาย</h2>
                                    <button onClick={() => setIsCloseShiftModal(false)} className="lg:hidden text-stone-400"><span className="material-symbols-outlined">close</span></button>
                                </div>

                                <div className="space-y-3 mb-6 bg-white p-5 rounded-3xl border border-stone-100 shadow-sm">
                                    <StatRow label="เงินทอนเริ่มต้น" value={stats.start} />
                                    <StatRow label="ยอดขาย (เงินสด)" value={stats.sales} isAdd />
                                    <StatRow label="เงินเข้า (Cash In)" value={stats.cashIn} isAdd />
                                    <StatRow label="เงินออก (Cash Out)" value={stats.cashOut} isSub />
                                    <div className="border-t border-dashed border-stone-200 my-2 pt-2"></div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-black text-stone-500">เงินที่ควรมีในลิ้นชัก</span>
                                        <span className="text-2xl font-black text-[#861b00]">฿{stats.expected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                {/* ส่วนแสดงผลส่วนต่าง (Difference) */}
                                <div className={`p-5 rounded-3xl border-2 flex flex-col items-center justify-center transition-all ${stats.diff === 0 ? 'bg-white border-stone-100' : stats.diff < 0 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">ส่วนต่าง (Over/Short)</p>
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
                                    <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest text-center mb-1">เงินสดที่มีจริงในลิ้นชัก</p>
                                    <input type="text" value={cashAmount ? parseFloat(cashAmount).toLocaleString() : ''} readOnly className="w-full py-2 bg-transparent font-black text-4xl text-center text-stone-800 outline-none" placeholder="0" />
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-6">
                                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                        <button key={num} onClick={() => handleKeypadClick(num)} className="neumorph-btn h-12 text-xl font-black rounded-xl text-stone-700">{num === 'DEL' ? <span className="material-symbols-outlined text-2xl">backspace</span> : num}</button>
                                    ))}
                                </div>

                                <button onClick={handleCloseShift} className="w-full py-4 bg-stone-800 hover:bg-black text-white font-black rounded-2xl shadow-xl transition-all active:scale-95">ยืนยันปิดกะการขาย</button>
                            </div>
                        </div>
                    </div>
                </div>
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