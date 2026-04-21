import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';

export default function CashTab() {
    const { shift, setShift, transactions, setTransactions, currentEmployee } = useContext(AppContext);

    const [modalMode, setModalMode] = useState(null);
    const [formData, setFormData] = useState({ category: 'อื่นๆ', note: '', amount: '' });

    const expectedCash = shift.startCash + shift.salesCash + shift.cashIn - shift.cashOut;
    const cashTransactions = transactions.filter(t => t.method === 'CASH');

    const handleSave = () => {
        const amount = parseFloat(formData.amount);
        if (!amount || amount <= 0) return alert('กรุณาระบุจำนวนเงินให้ถูกต้องครับ');

        if (modalMode === 'expense') {
            setShift({ ...shift, cashOut: shift.cashOut + amount });
        } else {
            setShift({ ...shift, cashIn: shift.cashIn + amount });
        }

        const newTxn = {
            id: Date.now(),
            type: modalMode === 'expense' ? 'EXPENSE' : 'INCOME',
            method: 'CASH',
            desc: `${formData.category}${formData.note ? ` - ${formData.note}` : ''}`,
            amount: modalMode === 'expense' ? -amount : amount,
            cashier: currentEmployee?.name || 'System',
            time: new Date().toLocaleTimeString('th-TH').slice(0, 5) + ' น.',
            date: new Date().toLocaleDateString('th-TH')
        };

        setTransactions(prev => [newTxn, ...prev]);
        setFormData({ category: 'อื่นๆ', note: '', amount: '' });
        setModalMode(null);
    };

    return (
        // 🌟 ปลดล็อค max-w
        <div className="flex flex-col h-full gap-5 w-full relative animate-in fade-in duration-300 font-body">

            {modalMode && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setModalMode(null)} />
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full relative z-10 animate-in zoom-in-95 shadow-2xl">
                        <h3 className={`font-black text-2xl mb-6 font-headline ${modalMode === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>
                            {modalMode === 'expense' ? 'บันทึกจ่ายเงิน (นำเงินออก)' : 'บันทึกรับเงิน (นำเงินเข้า)'}
                        </h3>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="text-[10px] font-bold block mb-2 uppercase tracking-widest text-stone-500">หมวดหมู่</label>
                                <select
                                    value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full p-4 bg-stone-50 border-2 border-stone-200 rounded-2xl font-bold outline-none focus:border-stone-400"
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
                                <label className="text-[10px] font-bold block mb-2 uppercase tracking-widest text-stone-500">หมายเหตุ (ถ้ามี)</label>
                                <input
                                    value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                    className="w-full p-4 bg-stone-50 border-2 border-stone-200 rounded-2xl text-sm outline-none focus:border-stone-400 font-bold text-stone-700"
                                    placeholder="เช่น ซื้อจากร้านเจ๊น้อย"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold block mb-2 text-center uppercase tracking-widest text-stone-500">ยอดเงิน (บาท)</label>
                                <input
                                    type="number" autoFocus
                                    value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className={`w-full p-5 border-2 rounded-[2rem] text-4xl font-black text-center outline-none ${modalMode === 'expense' ? 'border-red-200 bg-red-50 focus:border-red-500 text-red-600' : 'border-emerald-200 bg-emerald-50 focus:border-emerald-500 text-emerald-600'
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

            <div className="flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-black font-headline text-[#861b00] flex items-center gap-2">
                    <span className="material-symbols-outlined text-3xl">payments</span> บัญชีหน้าลิ้นชัก
                </h2>
                <div className="flex gap-3">
                    <button onClick={() => setModalMode('expense')} className="bg-red-50 text-red-600 px-5 py-3 rounded-full text-xs font-bold border border-red-200 flex items-center gap-1.5 hover:bg-red-100 transition-colors active:scale-95 shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">remove</span> บันทึกจ่าย
                    </button>
                    <button onClick={() => setModalMode('income')} className="bg-emerald-50 text-emerald-600 px-5 py-3 rounded-full text-xs font-bold border border-emerald-200 flex items-center gap-1.5 hover:bg-emerald-100 transition-colors active:scale-95 shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">add</span> บันทึกรับ
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 shrink-0">
                <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col justify-center text-center">
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1">เงินดึงออก (Cash Out)</p>
                    <h3 className="text-3xl font-black text-red-500 font-headline">฿{shift.cashOut.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col justify-center text-center">
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1">เงินนำเข้า (Cash In)</p>
                    <h3 className="text-3xl font-black text-emerald-600 font-headline">฿{shift.cashIn.toLocaleString()}</h3>
                </div>
                <div className="bg-stone-800 text-white p-6 rounded-[2.5rem] shadow-xl flex flex-col justify-center text-center relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                    <div className="flex justify-between items-center mb-2 px-4 relative z-10">
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">เงินสดในลิ้นชัก</p>
                        <span className="text-[9px] font-bold bg-white/10 px-3 py-1 rounded-md text-stone-300">
                            ตั้งต้น: ฿{shift.startCash.toLocaleString()}
                        </span>
                    </div>
                    <h3 className={`text-5xl font-black font-headline tracking-tighter relative z-10 ${shift.isOpen ? 'text-amber-200' : 'text-stone-400'}`}>
                        {shift.isOpen ? `฿${expectedCash.toLocaleString()}` : 'ยังไม่เปิดกะ'}
                    </h3>
                </div>
            </div>

            {/* 🌟 ตารางยืดเต็ม + Sticky */}
            <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 pb-2">
                <div className="p-5 border-b bg-stone-50/50 flex justify-between items-center shrink-0">
                    <h3 className="font-black text-sm text-[#861b00] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">point_of_sale</span> ความเคลื่อนไหวเงินสด (กะปัจจุบัน)
                    </h3>
                </div>
                <div className="overflow-y-auto flex-1 no-scrollbar">
                    <table className="w-full text-left text-sm min-w-[600px]">
                        <thead className="bg-white border-b text-[10px] font-bold text-stone-400 uppercase tracking-widest sticky top-0 z-10">
                            <tr>
                                <th className="p-5 pl-8 w-28">เวลา</th>
                                <th className="p-5 w-32">ประเภท</th>
                                <th className="p-5">รายการ</th>
                                <th className="p-5 text-center w-32">พนักงาน</th>
                                <th className="p-5 text-right pr-8 w-40">จำนวนเงิน (฿)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {cashTransactions.length === 0 ? (
                                <tr><td colSpan="5" className="p-10 text-center text-stone-300 uppercase font-black text-xs tracking-widest">ยังไม่มีความเคลื่อนไหวของเงินสด</td></tr>
                            ) : (
                                cashTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-stone-50/50 transition-colors group">
                                        <td className="p-4 pl-8 text-[11px] font-bold text-stone-500">{t.time}</td>
                                        <td className="p-4">
                                            <span className="px-3 py-1.5 bg-stone-100 border text-stone-600 rounded-md text-[9px] font-bold uppercase tracking-wider">
                                                {t.type === 'SALE' ? 'ขายสินค้า' : t.type === 'INCOME' ? 'บันทึกรับ' : t.type === 'EXPENSE' ? 'บันทึกจ่าย' : t.type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm font-bold text-stone-700">{t.desc}</td>
                                        <td className="p-4 text-center">
                                            <span className="text-[10px] font-bold bg-stone-100 px-2.5 py-1 rounded text-stone-500">{t.cashier}</span>
                                        </td>
                                        <td className={`p-4 pr-8 text-right font-black text-lg ${t.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
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