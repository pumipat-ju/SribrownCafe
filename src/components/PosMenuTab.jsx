import React, { useState } from 'react';
import PosTab from './PosTab';
import MenuTab from './MenuTab';

export default function PosMenuTab() {
    const [subTab, setSubTab] = useState('pos');

    return (
        // 🌟 1. ปรับเป็น flex flex-col และ h-full เพื่อให้ Container ยืดเต็มหน้าจอ
        <div className="flex flex-col h-full gap-4">

            {/* 🌟 2. เพิ่ม shrink-0 เพื่อป้องกันไม่ให้ปุ่มเมนูด้านบนโดนบีบเวลาหน้าจอเล็ก */}
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-stone-200 w-fit shadow-sm shrink-0">
                <button
                    onClick={() => setSubTab('pos')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${subTab === 'pos'
                            ? 'bg-[#861b00] text-white'
                            : 'text-stone-600 hover:bg-stone-100'
                        }`}
                >
                    จุดขาย (POS)
                </button>

                <button
                    onClick={() => setSubTab('menu')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${subTab === 'menu'
                            ? 'bg-[#861b00] text-white'
                            : 'text-stone-600 hover:bg-stone-100'
                        }`}
                >
                    จัดการเมนู
                </button>
            </div>

            {/* 🌟 3. ใส่ flex-1 และ min-h-0 เพื่อบังคับให้กล่องนี้ดันตัวลงไปจนสุดขอบล่าง */}
            <div className="flex-1 min-h-0">
                {subTab === 'pos' && <PosTab />}
                {subTab === 'menu' && <MenuTab />}
            </div>

        </div>
    );
}