import React, { useState, useEffect, useRef } from 'react';
import MarketingTab from './MarketingTab';
import MembersTab from './MembersTab';

export default function CRMTab() {
    const [subTab, setSubTab] = useState('members');
    const [quickSearch, setQuickSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [crmAction, setCrmAction] = useState(null);
    const [isSearchFocused, setIsSearchFocused] = useState(false); // 🔍 สำหรับ Expanding Search
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAction = (action) => {
        setCrmAction(action);
        setIsDropdownOpen(false);
    };

    return (
        <div className="flex flex-col h-full gap-5 font-body animate-in fade-in duration-700">

            {/* 🎨 Custom Styles สำหรับ Sliding Tab และ Glow Effects */}
            <style>{`
                .tab-indicator {
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .search-glow:focus-within {
                    box-shadow: 0 0 20px -5px rgba(134, 27, 0, 0.15);
                }
                @keyframes sribrown-flow {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-sribrown-luxury {
                    background: linear-gradient(-45deg, #861b00, #a12c12, #5a1200, #861b00);
                    background-size: 300% 300%;
                    animation: sribrown-flow 8s ease infinite;
                }
            `}</style>

            {/* 📱 Header Area: จัดวางแบบ Responsive */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 px-1">

                {/* 💊 1. Floating Tab Switcher (แคปซูลยา) */}
                <div className="relative flex items-center bg-stone-100/80 backdrop-blur-md p-1.5 rounded-full border border-stone-200/50 shadow-inner shrink-0">
                    {/* Sliding Background Indicator */}
                    <div
                        className="tab-indicator absolute bg-white shadow-md rounded-full h-[calc(100%-12px)]"
                        style={{
                            width: subTab === 'members' ? '120px' : '110px',
                            transform: `translateX(${subTab === 'members' ? '0px' : '120px'})`,
                            left: '6px'
                        }}
                    />

                    <button
                        onClick={() => setSubTab('members')}
                        className={`relative z-10 w-[120px] py-2 rounded-full text-[13px] font-black transition-colors duration-300 flex items-center justify-center gap-2 ${subTab === 'members' ? 'text-[#861b00]' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">group</span> ระบบสมาชิก
                    </button>
                    <button
                        onClick={() => setSubTab('marketing')}
                        className={`relative z-10 w-[110px] py-2 rounded-full text-[13px] font-black transition-colors duration-300 flex items-center justify-center gap-2 ${subTab === 'marketing' ? 'text-[#861b00]' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">campaign</span> การตลาด
                    </button>
                </div>

                {/* 🔴 ส่วนขวา: Action Hub (แสดงเฉพาะหน้า 'members') */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end min-h-[48px]">
                    {subTab === 'members' && (
                        <>
                            {/* 🔍 2. Expanding Search Bar */}
                            <div className={`relative search-glow transition-all duration-500 ease-out group ${isSearchFocused ? 'flex-1 md:w-80' : 'flex-1 md:w-60'}`}>
                                <span className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 text-[20px] transition-all duration-500 ${isSearchFocused ? 'text-[#861b00] scale-110 translate-x-1' : ''}`}>search</span>
                                <input
                                    type="text"
                                    value={quickSearch}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setIsSearchFocused(false)}
                                    onChange={(e) => setQuickSearch(e.target.value)}
                                    placeholder="ค้นหาสมาชิกด่วน..."
                                    className="w-full pl-12 pr-5 py-3 bg-white border border-stone-200 rounded-2xl text-[13px] font-bold outline-none focus:border-[#861b00] transition-all shadow-sm"
                                />
                            </div>

                            {/* ⚡ Quick Action Dropdown */}
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className={`px-5 py-3 rounded-2xl font-black text-[13px] flex items-center gap-2 transition-all duration-500 shadow-lg active:scale-95 text-white animate-sribrown-luxury ${isDropdownOpen ? 'ring-4 ring-[#861b00]/10' : ''}`}
                                >
                                    <span className={`material-symbols-outlined transition-transform duration-500 ${isDropdownOpen ? 'rotate-[225deg]' : ''}`}>add_circle</span>
                                    <span className="hidden sm:inline">จัดการสมาชิก</span>
                                    <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                                </button>

                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-3 w-64 bg-white/90 backdrop-blur-2xl rounded-[1.8rem] shadow-2xl border border-white p-2.5 z-[110] animate-in slide-in-from-top-3 fade-in duration-300 origin-top-right">
                                        <button onClick={() => handleAction('addMember')} className="w-full flex items-center gap-4 px-4 py-3.5 text-[13px] font-bold text-stone-600 hover:bg-[#861b00] hover:text-white rounded-2xl transition-all group">
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                                <span className="material-symbols-outlined text-[20px]">person_add</span>
                                            </div>
                                            เพิ่มสมาชิกใหม่
                                        </button>
                                        <div className="h-[1px] bg-stone-100 my-1.5 mx-3"></div>
                                        <button onClick={() => handleAction('viewArchive')} className="w-full flex items-center gap-4 px-4 py-3.5 text-[13px] font-bold text-stone-600 hover:bg-stone-800 hover:text-white rounded-2xl transition-all group">
                                            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-stone-600 group-hover:text-white transition-colors">
                                                <span className="material-symbols-outlined text-[20px]">person_off</span>
                                            </div>
                                            บัญชีที่ถูกระงับ
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 🌟 3. Content Area: Motion Switch Transition */}
            <div className="flex-1 min-h-0 relative">
                <div key={subTab} className="h-full w-full animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-700">
                    {subTab === 'members' ? (
                        <MembersTab searchTerm={quickSearch} crmAction={crmAction} setCrmAction={setCrmAction} />
                    ) : (
                        <MarketingTab />
                    )}
                </div>
            </div>
        </div>
    );
}