import React, { useState } from 'react';
import PosTab from './PosTab';
import MenuTab from './MenuTab';

export default function PosMenuTab() {
    const [subTab, setSubTab] = useState('pos');

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-stone-200 w-fit shadow-sm">
                <button
                    onClick={() => setSubTab('pos')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        subTab === 'pos'
                            ? 'bg-[#861b00] text-white'
                            : 'text-stone-600 hover:bg-stone-100'
                    }`}
                >
                    จุดขาย (POS)
                </button>

                <button
                    onClick={() => setSubTab('menu')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        subTab === 'menu'
                            ? 'bg-[#861b00] text-white'
                            : 'text-stone-600 hover:bg-stone-100'
                    }`}
                >
                    จัดการเมนู
                </button>
            </div>

            <div>
                {subTab === 'pos' && <PosTab />}
                {subTab === 'menu' && <MenuTab />}
            </div>
        </div>
    );
}