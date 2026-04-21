import React, { useState } from 'react';
import MarketingTab from './MarketingTab';
import MembersTab from './MembersTab';

export default function CRMTab() {

    const [subTab, setSubTab] = useState('members');

    return (
        // 🌟 1. ปรับเป็น flex flex-col และ h-full เพื่อให้ Container ยืดเต็มหน้าจอ
        <div className="flex flex-col h-full gap-4">

            {/* 🌟 2. เพิ่ม shrink-0 เพื่อป้องกันไม่ให้ปุ่มเมนูด้านบนโดนบีบเวลาหน้าจอเล็ก */}
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-stone-200 w-fit shadow-sm shrink-0">

                <button
                    onClick={() => setSubTab('members')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all
                        ${subTab === 'members'
                            ? 'bg-[#861b00] text-white'
                            : 'text-stone-600 hover:bg-stone-100'
                        }`}
                >
                    ระบบสมาชิก
                </button>

                <button
                    onClick={() => setSubTab('marketing')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all
                        ${subTab === 'marketing'
                            ? 'bg-[#861b00] text-white'
                            : 'text-stone-600 hover:bg-stone-100'
                        }`}
                >
                    การตลาด (CRM)
                </button>

            </div>

            {/* 🌟 3. ใส่ flex-1 และ min-h-0 เพื่อบังคับให้กล่องนี้ดันตัวลงไปจนสุดขอบล่าง */}
            <div className="flex-1 min-h-0">
                {subTab === 'marketing' && <MarketingTab />}
                {subTab === 'members' && <MembersTab />}
            </div>

        </div>
    );
}