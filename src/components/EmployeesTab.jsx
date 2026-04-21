import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export default function EmployeesTab() {
    const { employees } = useContext(AppContext);

    const formatPhone = (phone) => {
        if (!phone) return '-';
        return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    };

    return (
        // 🌟 ปลดล็อค max-w-5xl ออก
        <div className="flex flex-col h-full gap-4 w-full relative animate-in fade-in duration-300 font-body">

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <h2 className="text-2xl font-black font-headline text-[#861b00] flex items-center gap-2">
                    <span className="material-symbols-outlined text-3xl">badge</span> พนักงาน
                </h2>

                <div className="flex gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto pb-2 sm:pb-0">
                    <button className="shrink-0 bg-stone-100 text-stone-600 border px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-stone-200 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">manage_accounts</span> จัดการตำแหน่ง
                    </button>
                    <button className="shrink-0 bg-white text-stone-600 border px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-stone-50 transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-[16px]">history</span> ประวัติตอกบัตร
                    </button>
                    <button className="shrink-0 bg-[#861b00] text-white px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-black transition-colors shadow-md">
                        <span className="material-symbols-outlined text-[16px]">person_add</span> เพิ่มพนักงาน
                    </button>
                </div>
            </div>

            {/* 🌟 ให้ตารางยืดสุดขอบล่าง และมี Sticky Header */}
            <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 pb-2">
                <div className="overflow-y-auto flex-1 no-scrollbar">
                    <table className="w-full text-left text-sm min-w-[700px]">
                        <thead className="bg-stone-50 border-b text-[10px] font-bold text-stone-500 uppercase tracking-widest sticky top-0 z-10">
                            <tr>
                                <th className="p-5 pl-6">พนักงาน</th>
                                <th className="p-5">ตำแหน่ง</th>
                                <th className="p-5">เบอร์โทร</th>
                                <th className="p-5">สถานะเวลา</th>
                                <th className="p-5 text-center pr-6">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {employees.map(e => (
                                <tr key={e.id} className="hover:bg-stone-50/50 transition-colors group">
                                    <td className="p-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center text-sm font-black uppercase">
                                                {e.name.charAt(0)}
                                            </div>
                                            <span className="font-bold text-stone-800">{e.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-stone-700 font-bold text-[11px] bg-stone-100 px-3 py-1.5 rounded-md w-fit border border-stone-200">{e.role}</p>
                                    </td>
                                    <td className="p-4 text-xs font-bold text-stone-500">
                                        {formatPhone(e.phone)}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1.5 w-fit shadow-sm border ${e.isClockedIn
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                            : 'bg-white text-stone-400 border-stone-200'
                                            }`}>
                                            <div className={`w-2 h-2 rounded-full ${e.isClockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}`}></div>
                                            {e.isClockedIn ? 'เข้างาน (IN)' : 'ออกงาน (OUT)'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center pr-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <button className="text-[11px] bg-white px-4 py-2 rounded-xl border border-stone-200 text-blue-500 font-bold flex items-center gap-1 hover:bg-blue-50 mx-auto active:scale-95 transition-all">
                                            <span className="material-symbols-outlined text-[16px]">edit</span> แก้ไข
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {employees.length === 0 && (
                        <div className="p-10 text-center text-stone-400 font-bold text-sm">ไม่พบข้อมูลพนักงาน</div>
                    )}
                </div>
            </div>
        </div>
    );
}