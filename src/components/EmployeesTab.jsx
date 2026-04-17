import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export default function EmployeesTab() {
    // ดึงข้อมูลพนักงานจาก Context กลาง
    const { employees } = useContext(AppContext);

    // ฟังก์ชันจัดรูปแบบเบอร์โทรให้อ่านง่าย
    const formatPhone = (phone) => {
        if (!phone) return '-';
        return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    };

    return (
        <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-300 w-full">

            {/* ส่วนหัวและปุ่มจัดการต่างๆ */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-2xl font-black font-headline text-[#861b00] flex items-center gap-2">
                    <span className="material-symbols-outlined text-3xl">badge</span> พนักงาน
                </h2>

                {/* กลุ่มปุ่มด้านขวา */}
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

            {/* ส่วนตารางข้อมูลพนักงาน */}
            <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden mt-4">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left text-sm min-w-[700px]">
                        <thead className="bg-stone-50 border-b text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                            <tr>
                                <th className="p-4 pl-6">พนักงาน</th>
                                <th className="p-4">ตำแหน่ง</th>
                                <th className="p-4">เบอร์โทร</th>
                                <th className="p-4">สถานะเวลา</th>
                                <th className="p-4 text-center pr-6">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {employees.map(e => (
                                <tr key={e.id} className="hover:bg-stone-50 transition-colors group">
                                    <td className="p-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center text-[10px] font-black uppercase">
                                                {e.name.charAt(0)}
                                            </div>
                                            <span className="font-bold text-stone-800 text-xs">{e.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-stone-800 font-bold text-xs bg-stone-100 px-2 py-1 rounded w-fit">{e.role}</p>
                                    </td>
                                    <td className="p-4 text-xs font-medium text-stone-600">
                                        {formatPhone(e.phone)}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase flex items-center gap-1 w-fit shadow-sm border ${e.isClockedIn
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                : 'bg-white text-stone-400 border-stone-200'
                                            }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${e.isClockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}`}></div>
                                            {e.isClockedIn ? 'เข้างาน (IN)' : 'ออกงาน (OUT)'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center pr-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <button className="text-[10px] bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 text-blue-500 font-bold flex items-center gap-1 hover:bg-stone-100 mx-auto">
                                            <span className="material-symbols-outlined text-[14px]">edit</span> แก้ไข
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {employees.length === 0 && (
                        <div className="p-8 text-center text-stone-400 font-bold text-xs">ไม่พบข้อมูลพนักงาน</div>
                    )}
                </div>
            </div>
        </div>
    );
}