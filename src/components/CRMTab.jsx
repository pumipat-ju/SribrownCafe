import React, { useState } from 'react';
import MarketingTab from './MarketingTab';
import MembersTab from './MembersTab';

export default function CRMTab() {

    const [subTab, setSubTab] = useState('members');

    return (
        <div className="space-y-6">

            <div className="flex gap-3 bg-white p-2 rounded-2xl border border-stone-200 w-fit shadow-sm">

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


            <div>

                {subTab === 'marketing' && <MarketingTab />}

                {subTab === 'members' && <MembersTab />}

            </div>

        </div>
    );
}