import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';

export default function CashTab() {
    const { shift, setShift, transactions, setTransactions, currentEmployee } = useContext(AppContext);

    // State สำหรับควบคุมหน้าต่าง Modal บันทึกรับ/จ่าย
    const [modalMode, setModalMode] = useState(null); // 'expense' (จ่าย) | 'income' (รับ) | null (ปิด)
    const [formData, setFormData] = useState({ category: 'อื่นๆ', note: '', amount: '' });

    // 1. คำนวณเงินที่ควรมีในลิ้นชัก (เงินทอน + ยอดขายเงินสด + เงินนำเข้า - เงินดึงออก)
    const expectedCash = shift.startCash + shift.salesCash + shift.cashIn - shift.cashOut;

    // 2. กรองเฉพาะประวัติที่เป็น "เงินสด (CASH)" มาแสดงในตารางกะปัจจุบัน
    const cashTransactions = transactions.filter(t => t.method === 'CASH');

    // ฟังก์ชันบันทึกข้อมูลรับ/จ่าย
    const handleSave = () => {
        const amount = parseFloat(formData.amount);
        if (!amount || amount <= 0) return alert('กรุณาระบุจำนวนเงินให้ถูกต้องครับ');

        // อัปเดตยอดรวมในกะ (Shift)
        if (modalMode === 'expense') {
            setShift({ ...shift, cashOut: shift.cashOut + amount });
        } else {
            setShift({ ...shift, cashIn: shift.cashIn + amount });
        }

        // บันทึกลงประวัติ (Transactions)
        const newTxn = {
            id: Date.now(),
            type: modalMode === 'expense' ? 'EXPENSE' : 'INCOME',
            method: 'CASH',
            desc: `${formData.category}${formData.note ? ` - ${formData.note}` : ''}`,
            amount: modalMode === 'expense' ? -amount : amount,
            cashier: currentEmployee?.name || 'System',
            time: new Date().toLocaleTimeString('th-TH'),
            date: new Date().toLocaleDateString('th-TH')
        };

        setTransactions(prev => [newTxn, ...prev]);

        // ล้างฟอร์มและปิดหน้าต่าง
        setFormData({ category: 'อื่นๆ', note: '', amount: '' });
        setModalMode(null);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-300 w-full relative">

            {/* 🔴 Modal: บันทึกรับ/จ่ายเงิน */}
            {modalMode && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setModalMode(null)} />
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full relative z-10 animate-fade-in shadow-2xl">
                        <h3 className={`font-black text-2xl mb-6 font-headline ${modalMode === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>
                            {modalMode === 'expense' ? 'บันทึกจ่ายเงิน (นำเงินออก)' : 'บันทึกรับเงิน (นำเงินเข้า)'}
                        </h3>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="text-[10px] font-bold block mb-1 uppercase text-stone-500">หมวดหมู่</label>
                                <select
                                    value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full p-3 bg-stone-50 border-2 border-stone-200 rounded-xl font-bold outline-none focus:border-stone-400"
                                >
                                    {modalMode === 'expense' ? (
                                        <>
                                            <option>🧊 น้ำแข็ง</option>
                                            <option>🥛 นมสด</option>
                                            <option>🚲 ค่าส่ง</option>
                                            <option>อื่นๆ</option>
                                        </>
                                    ) : (
                                        <>
                                            <option>💵 เงินทอน (แลกแบงก์)</option>
                                            <option>อื่นๆ</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold block mb-1 uppercase text-stone-500">หมายเหตุ (ถ้ามี)</label>
                                <input
                                    value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                    className="w-full p-3 bg-stone-50 border-2 border-stone-200 rounded-xl text-sm outline-none focus:border-stone-400"
                                    placeholder="เช่น ซื้อจากร้านเจ๊น้อย"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold block mb-1 text-center uppercase text-stone-500">ยอดเงิน (บาท)</label>
                                <input
                                    type="number" autoFocus
                                    value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className={`w-full p-5 border-2 rounded-2xl text-4xl font-black text-center outline-none ${modalMode === 'expense' ? 'border-red-200 bg-red-50 focus:border-red-500 text-red-600' : 'border-emerald-200 bg-emerald-50 focus:border-emerald-500 text-emerald-600'
                                        }`}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setModalMode(null)} className="flex-1 py-4 bg-stone-100 font-bold text-stone-600 rounded-2xl hover:bg-stone-200 transition-colors">ยกเลิก</button>
                            <button onClick={handleSave} className={`flex-[2] py-4 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all ${modalMode === 'expense' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>ยืนยัน</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ส่วนเนื้อหาหลัก --- */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black font-headline text-[#861b00] flex items-center gap-2">
                    <span className="material-symbols-outlined text-3xl">payments</span> บัญชีหน้าลิ้นชัก
                </h2>
                <div className="flex gap-2">
                    <button onClick={() => setModalMode('expense')} className="bg-red-50 text-red-600 px-4 py-2 rounded-full text-xs font-bold border border-red-200 flex items-center gap-1 hover:bg-red-100 transition-colors active:scale-95">
                        <span className="material-symbols-outlined text-[16px]">remove</span> บันทึกจ่าย
                    </button>
                    <button onClick={() => setModalMode('income')} className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-xs font-bold border border-emerald-200 flex items-center gap-1 hover:bg-emerald-100 transition-colors active:scale-95">
                        <span className="material-symbols-outlined text-[16px]">add</span> บันทึกรับ
                    </button>
                </div>
            </div>

            {/* การ์ด Dashboard สรุปเงินในลิ้นชัก */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-5 rounded-[2rem] border shadow-sm flex flex-col justify-center text-center">
                    <p className="text-[9px] text-stone-500 font-bold uppercase mb-1">เงินดึงออก (Cash Out)</p>
                    <h3 className="text-2xl font-black text-red-500 font-headline">฿{shift.cashOut.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border shadow-sm flex flex-col justify-center text-center">
                    <p className="text-[9px] text-stone-500 font-bold uppercase mb-1">เงินนำเข้า (Cash In)</p>
                    <h3 className="text-2xl font-black text-emerald-600 font-headline">฿{shift.cashIn.toLocaleString()}</h3>
                </div>
                <div className="bg-stone-800 text-white p-5 rounded-[2rem] shadow-lg flex flex-col justify-center text-center relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/5 rounded-full blur-xl"></div>
                    <div className="flex justify-between items-center mb-1 px-4 relative z-10">
                        <p className="text-[9px] text-stone-400 font-bold uppercase">เงินสดที่ต้องมีในลิ้นชัก</p>
                        <span className="text-[8px] bg-white/10 px-2 py-0.5 rounded text-stone-300">
                            เงินตั้งต้น: ฿{shift.startCash.toLocaleString()}
                        </span>
                    </div>
                    <h3 className={`text-4xl font-black font-headline tracking-tighter relative z-10 ${shift.isOpen ? 'text-amber-100' : 'text-stone-400'}`}>
                        {shift.isOpen ? `฿${expectedCash.toLocaleString()}` : 'ยังไม่เปิดกะ'}
                    </h3>
                </div>
            </div>

            {/* ตารางประวัติเงินสด */}
            <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden mt-6">
                <div className="p-4 border-b bg-stone-50 flex justify-between items-center">
                    <h3 className="font-black text-sm text-stone-700 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">point_of_sale</span> ความเคลื่อนไหวเงินสด (กะปัจจุบัน)
                    </h3>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left text-sm min-w-[600px]">
                        <thead className="bg-white border-b text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                            <tr>
                                <th className="p-4 pl-6 w-24">เวลา</th>
                                <th className="p-4 w-28">ประเภท</th>
                                <th className="p-4">รายการ</th>
                                <th className="p-4 text-center w-28">พนักงาน</th>
                                <th className="p-4 text-right pr-6 w-36">จำนวนเงิน (฿)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {cashTransactions.length === 0 ? (
                                <tr><td colSpan="5" className="p-10 text-center text-stone-300 uppercase font-black text-xs tracking-widest">ยังไม่มีความเคลื่อนไหวของเงินสด</td></tr>
                            ) : (
                                cashTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-stone-50 transition-colors">
                                        <td className="p-4 pl-6 text-[10px] font-bold text-stone-500">{t.time}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-stone-100 border text-stone-600 rounded text-[9px] font-bold uppercase">
                                                {t.type === 'SALE' ? 'ขายสินค้า' : t.type === 'INCOME' ? 'บันทึกรับ' : t.type === 'EXPENSE' ? 'บันทึกจ่าย' : t.type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs font-bold text-stone-700">{t.desc}</td>
                                        <td className="p-4 text-center text-[10px] text-stone-500">{t.cashier}</td>
                                        <td className={`p-4 pr-6 text-right font-black ${t.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {t.amount >= 0 ? '+' : ''}฿{Math.abs(t.amount).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}