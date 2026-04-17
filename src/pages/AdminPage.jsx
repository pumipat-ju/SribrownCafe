import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

// นำเข้าแท็บต่างๆ (อย่าลืมสร้างไฟล์ให้ครบตามนี้นะครับ)

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
    const { currentEmployee, shift, setShift } = useContext(AppContext);
    const navigate = useNavigate();

    // State จัดการหน้าต่างและเมนู
    const [activeTab, setActiveTab] = useState('marketing'); // ตั้งค่าเริ่มต้นที่หน้าไหนก็ได้
    const [isNavOpen, setIsNavOpen] = useState(false); // ควบคุมการเปิด/ปิด Sidebar
    const [timeStr, setTimeStr] = useState('');

    // 🕒 อัปเดตนาฬิกาและวันที่ทุกๆ 1 วินาที ให้ตรงตามฟอร์แมตที่ต้องการ
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            // สร้าง Format: วันศุกร์ที่ 17 เมษายน 2569
            const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
            const formattedDate = now.toLocaleDateString('th-TH', dateOptions);

            // สร้าง Format: 17:32:32
            const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
            const formattedTime = now.toLocaleTimeString('th-TH', timeOptions);

            setTimeStr(`${formattedDate} เวลา ${formattedTime} น.`);
        };

        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    // ฟังก์ชันออกจากระบบ
    const handleLogout = () => {
        if (window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userRole');
            navigate('/');
        }
    };

    const handleCloseShift = () => {
        if (window.confirm("ต้องการปิดกะการขายใช่หรือไม่?")) {
            setShift({ isOpen: false, startCash: 0, salesCash: 0, cashIn: 0, cashOut: 0 });
            alert("ปิดกะสำเร็จ");
        }
    };

    const handleClockIn = () => {
        alert("เปิดหน้าต่างตอกบัตรเข้า/ออกงาน (ฟังก์ชันนี้ต้องสร้าง Modal เพิ่มครับ)");
    };

    // 📋 เมนูทั้งหมด (ปรับชื่อให้กระชับ ทันสมัย)
    const navItems = [
        { id: 'dashboard', icon: 'dashboard', label: 'แดชบอร์ด' },
        { id: 'pos-menu', icon: 'point_of_sale', label: 'POS & เมนู' },
        { id: 'crm', icon: 'campaign', label: 'CRM & สมาชิก' },
        { id: 'employees', icon: 'badge', label: 'พนักงาน' },
        { id: 'inventory', icon: 'inventory_2', label: 'คลังสินค้า' },
        { id: 'cash', icon: 'payments', label: 'ลิ้นชักเงิน' },
        { id: 'history', icon: 'receipt_long', label: 'ประวัติรายการ' },
    ];

    // ฟังก์ชันสลับหน้าและปิดเมนูมือถืออัตโนมัติ
    const handleTabSwitch = (id) => {
        setActiveTab(id);
        setIsNavOpen(false); // กดเมนูแล้วให้หุบเก็บทันที
    };

    return (
        <div className="flex h-screen bg-[#fafaf5] text-stone-800 font-body overflow-hidden relative">

            {/* 🌑 Overlay สีดำเวลาเปิดเมนูซ้ายมือ */}
            <div
                className={`fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${isNavOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsNavOpen(false)}
            ></div>

            {/* 1. 🗄️ Sidebar (เมนูด้านซ้ายแบบ Slide) */}
            <aside className={`fixed top-0 left-0 h-full w-72 bg-[#f4f4f4] border-r border-stone-200 flex flex-col z-50 transition-transform duration-300 ease-in-out shadow-2xl rounded-r-3xl ${isNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Header ของ Sidebar */}
                <div className="p-6 flex justify-between items-center border-b border-stone-200/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#861b00] text-white flex items-center justify-center font-bold text-xl font-headline shadow-inner">S</div>
                        <div>
                            <h1 className="text-sm font-black text-[#861b00] uppercase font-headline tracking-wider">Sri Brown</h1>
                            <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">POS Engine</p>
                        </div>
                    </div>
                    <button onClick={() => setIsNavOpen(false)} className="w-8 h-8 rounded-full hover:bg-stone-200 flex items-center justify-center text-stone-400 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* รายการเมนู */}
                <nav className="flex-1 overflow-y-auto space-y-1.5 p-4 no-scrollbar">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleTabSwitch(item.id)}
                            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[13px] font-bold transition-all ${activeTab === item.id
                                ? 'bg-white shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-stone-100 text-[#861b00]'
                                : 'text-stone-500 hover:bg-white hover:text-stone-700'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* ปุ่ม Logout ด้านล่าง */}
                <div className="p-4 shrink-0 border-t border-stone-200/50">
                    <button onClick={handleLogout} className="w-full py-4 text-stone-400 hover:text-red-500 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors rounded-2xl hover:bg-red-50">
                        <span className="material-symbols-outlined text-[18px]">logout</span> Logout
                    </button>
                </div>
            </aside>

            {/* 2. 🖥️ Main Content Area (พื้นที่เนื้อหาหลัก) */}
            <div className="flex-1 flex flex-col w-full h-full overflow-hidden relative transition-all">

                {/* 🌟 Header (แถบด้านบน) */}
                <header className="h-16 md:h-20 border-b border-stone-200 flex justify-between items-center px-4 md:px-8 shrink-0 bg-[#fafaf5] z-10">

                    {/* โซนซ้าย: ปุ่มเมนู + เวลา */}
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsNavOpen(true)} className="w-10 h-10 rounded-full hover:bg-stone-200 flex items-center justify-center text-stone-700 transition-colors">
                            <span className="material-symbols-outlined text-[24px]">menu</span>
                        </button>

                        {/* ป้ายบอกเวลา (ซ่อนในจอมือถือที่เล็กมากๆ) */}
                        <div className="hidden sm:flex bg-stone-100 px-5 py-2.5 rounded-full border border-stone-200 text-[11px] font-bold text-stone-600 shadow-sm tracking-wide">
                            {timeStr || 'กำลังโหลดเวลา...'}
                        </div>
                    </div>

                    {/* โซนขวา: ปุ่มเครื่องมือ + โปรไฟล์ */}
                    <div className="flex items-center gap-3 md:gap-5">

                        {/* ปุ่มตอกบัตร */}
                        <button onClick={handleClockIn} className="hidden sm:flex px-4 py-2 bg-white border border-stone-200 hover:border-stone-300 text-stone-600 hover:text-stone-800 rounded-full text-[11px] font-bold shadow-sm items-center gap-1.5 transition-all active:scale-95">
                            <span className="material-symbols-outlined text-[16px]">timer</span> ตอกบัตร
                        </button>

                        {/* ปุ่มปิดกะ (แสดงเมื่อมีการเปิดกะ) */}
                        {shift.isOpen && (
                            <button onClick={handleCloseShift} className="px-5 py-2 bg-[#2c2929] hover:bg-black text-white rounded-full text-[10px] font-bold shadow-md uppercase tracking-widest transition-all active:scale-95">
                                Close Shift
                            </button>
                        )}

                        <div className="h-6 w-px bg-stone-200 hidden sm:block"></div> {/* เส้นคั่น */}

                        {/* โปรไฟล์พนักงาน */}
                        <div className="flex items-center gap-3 pl-2 cursor-pointer group">
                            <p className="text-xs font-black text-[#861b00] hidden sm:block group-hover:text-black transition-colors">{currentEmployee?.name || 'บอส'}</p>
                            <div className="w-9 h-9 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-bold shadow-inner uppercase border border-stone-300/50">
                                {currentEmployee?.name ? currentEmployee.name.charAt(0) : '-'}
                            </div>
                        </div>
                    </div>
                </header>

                {/* 🌟 Content (เนื้อหาที่เปลี่ยนไปตามเมนูที่กด) */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#fafaf5] relative no-scrollbar">
                    {activeTab === 'dashboard' && <DashboardTab />}
                    {activeTab === 'pos-menu' && <PosMenuTab />}
                    {activeTab === 'history' && <HistoryTab />}
                    {activeTab === 'crm' && <CRMTab />}
                    {activeTab === 'employees' && <EmployeesTab />}
                    {activeTab === 'cash' && <CashTab />}
                    {activeTab === 'inventory' && <InventoryTab />}

                    {/* แสดงข้อความเตือนถ้าคอมโพเนนต์ไหนยังไม่ได้สร้าง */}
                    {activeTab === 'inventory' && !InventoryTab && (
                        <h2 className="text-2xl font-bold text-stone-400 text-center mt-20">กำลังพัฒนาหน้า {activeTab}</h2>
                    )}
                </main>

            </div>
        </div>
    );
}