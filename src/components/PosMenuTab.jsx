import React, { useState, useEffect, useRef } from 'react';
import PosTab from './PosTab';
import MenuTab from './MenuTab';

export default function PosMenuTab() {
    const [subTab, setSubTab] = useState('pos');
    const [viewMode, setViewMode] = useState('image');
    const [menuAction, setMenuAction] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAction = (action) => {
        setMenuAction(action);
        setIsDropdownOpen(false);
    };

    return (
        <div className="flex flex-col h-full gap-4 animate-in fade-in duration-500 w-full relative font-body pb-2">

            {/* 🎨 รวมพลัง Motion Effects สำหรับโหมดหลัก และ ViewMode */}
            <style>{`
                @keyframes sribrown-flow {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-sribrown {
                    background: linear-gradient(-45deg, #861b00, #a12c12, #5a1200, #861b00);
                    background-size: 300% 300%;
                    animation: sribrown-flow 6s ease infinite;
                }
                @keyframes icon-float {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-3px) scale(1.1); }
                }
                .active-icon-anim {
                    animation: icon-float 2s ease-in-out infinite;
                    filter: drop-shadow(0 0 8px rgba(255,255,255,0.4));
                }
                .mesh-vivid {
                    background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
                    background-size: 400% 400%;
                    animation: sribrown-flow 10s ease infinite;
                }
                .glass-nav {
                    background: rgba(255, 255, 255, 0.6);
                    backdrop-filter: blur(15px);
                    -webkit-backdrop-filter: blur(15px);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                }
            `}</style>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 gap-4">

                {/* 🟢 ส่วนซ้าย: Navigation Tabs (Pill-Shape Switcher) */}
                <div className="relative flex items-center glass-nav p-1.5 rounded-[1.75rem] shadow-sm shrink-0">
                    {/* 💊 Indicator พื้นหลังสไลด์ */}
                    <div
                        className="absolute h-[calc(100%-12px)] rounded-2xl animate-sribrown shadow-xl transition-all duration-500 ease-out"
                        style={{
                            width: subTab === 'pos' ? '150px' : '140px',
                            transform: `translateX(${subTab === 'pos' ? '0px' : '150px'})`,
                            left: '6px'
                        }}
                    />

                    {/* ปุ่มจุดขาย (POS) */}
                    <button
                        onClick={() => setSubTab('pos')}
                        className={`relative z-10 w-[150px] py-3 rounded-2xl text-[14px] font-black transition-colors duration-500 flex items-center justify-center gap-2.5 group ${subTab === 'pos' ? 'text-white' : 'text-stone-500 hover:text-[#861b00]'}`}
                    >
                        <span className={`material-symbols-outlined text-[22px] transition-all ${subTab === 'pos' ? 'active-icon-anim' : 'group-hover:rotate-12'}`}>
                            point_of_sale
                        </span>
                        <span className="tracking-wide">จุดขาย (POS)</span>
                    </button>

                    {/* ปุ่มจัดการเมนู */}
                    <button
                        onClick={() => setSubTab('menu')}
                        className={`relative z-10 w-[140px] py-3 rounded-2xl text-[14px] font-black transition-colors duration-500 flex items-center justify-center gap-2.5 group ${subTab === 'menu' ? 'text-white' : 'text-stone-500 hover:text-[#861b00]'}`}
                    >
                        <span className={`material-symbols-outlined text-[22px] transition-all ${subTab === 'menu' ? 'active-icon-anim' : 'group-hover:rotate-12'}`}>
                            restaurant_menu
                        </span>
                        <span className="tracking-wide">จัดการเมนู</span>
                    </button>
                </div>

                {/* 🔴 ส่วนขวา: ViewMode & Actions */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    {subTab === 'pos' ? (
                        /* 🟢 Pill-Shape Switcher สำหรับ ViewMode */
                        <div className="relative flex glass-nav p-1.5 rounded-[1.25rem] shadow-sm">
                            {/* 💊 Indicator พื้นหลังสไลด์ */}
                            <div
                                className={`absolute h-[calc(100%-12px)] rounded-xl shadow-md transition-all duration-500 ease-out ${viewMode === 'image' ? 'animate-sribrown shadow-lg shadow-[#861b00]/30' : 'mesh-vivid opacity-90'}`}
                                style={{
                                    width: '100px',
                                    transform: `translateX(${viewMode === 'image' ? '0px' : '100px'})`,
                                    left: '6px'
                                }}
                            />

                            <button
                                onClick={() => setViewMode('image')}
                                className={`relative z-10 w-[100px] py-2.5 rounded-xl text-[12px] font-black transition-colors duration-500 flex items-center justify-center gap-1.5 ${viewMode === 'image' ? 'text-white' : 'text-stone-500 hover:text-stone-800'}`}
                            >
                                <span className="material-symbols-outlined text-[18px]">image</span>
                                <span>รูปภาพ</span>
                            </button>

                            <button
                                onClick={() => setViewMode('color')}
                                className={`relative z-10 w-[100px] py-2.5 rounded-xl text-[12px] font-black transition-colors duration-500 flex items-center justify-center gap-1.5 ${viewMode === 'color' ? 'text-white' : 'text-stone-500 hover:text-stone-800'}`}
                            >
                                <span className="material-symbols-outlined text-[18px]">palette</span>
                                <span>สีสัน</span>
                            </button>
                        </div>
                    ) : (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className={`px-6 py-3.5 rounded-2xl font-black text-[13px] flex items-center gap-2 transition-all duration-500 shadow-lg active:scale-95 ${isDropdownOpen ? 'bg-black text-white ring-4 ring-stone-100' : 'bg-[#861b00] text-white hover:bg-black shadow-[#861b00]/20'}`}
                            >
                                <span className={`material-symbols-outlined transition-transform duration-700 ${isDropdownOpen ? 'rotate-[225deg]' : ''}`}>add_circle</span>
                                <span>Quick Actions</span>
                                <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-3 w-64 bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_50px_rgba(134,27,0,0.2)] border border-white p-2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300 origin-top-right">
                                    <div className="px-4 py-2 mb-1">
                                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Menu Management</p>
                                    </div>
                                    <button onClick={() => handleAction('addCategory')} className="w-full flex items-center justify-between px-4 py-3.5 text-[13px] font-bold text-stone-600 hover:bg-[#861b00] hover:text-white rounded-[1.2rem] transition-all group">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-amber-500 group-hover:text-white">create_new_folder</span>
                                            เพิ่มหมวดหมู่
                                        </div>
                                        <span className="material-symbols-outlined text-[16px] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">chevron_right</span>
                                    </button>
                                    <button onClick={() => handleAction('addItem')} className="w-full flex items-center justify-between px-4 py-3.5 text-[13px] font-bold text-stone-600 hover:bg-[#861b00] hover:text-white rounded-[1.2rem] transition-all group mt-1">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-emerald-500 group-hover:text-white">add_circle</span>
                                            เพิ่มเมนูใหม่
                                        </div>
                                        <span className="material-symbols-outlined text-[16px] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">chevron_right</span>
                                    </button>
                                    <div className="h-[1px] bg-stone-100 my-2 mx-4"></div>
                                    <button onClick={() => handleAction('options')} className="w-full flex items-center justify-between px-4 py-3.5 text-[13px] font-bold text-stone-600 hover:bg-stone-800 hover:text-white rounded-[1.2rem] transition-all group">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-blue-500 group-hover:text-white">tune</span>
                                            จัดการตัวเลือกเสริม
                                        </div>
                                        <span className="material-symbols-outlined text-[16px] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">chevron_right</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* พื้นที่ Content */}
            <div className="flex-1 min-h-0 bg-transparent">
                {subTab === 'pos' && <PosTab viewMode={viewMode} />}
                {subTab === 'menu' && <MenuTab menuAction={menuAction} setMenuAction={setMenuAction} />}
            </div>
        </div>
    );
}