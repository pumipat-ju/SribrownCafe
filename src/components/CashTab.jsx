import React, { useContext, useState, useMemo, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { fetchJSON } from '../api.js';

export default function CashTab() {
    const { shift, setShift, transactions, setTransactions, currentEmployee, generateBillId } = useContext(AppContext);

    // 🌟 ระบบเปิดเก๊ะอัตโนมัติเมื่อเข้าหน้าหน้านี้ (เรียกผ่าน Backend)
    useEffect(() => {
        const timer = setTimeout(() => {
            handleKickDrawer();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    // --- Modal States ---
    const [modalMode, setModalMode] = useState(null); // 'income' | 'expense' | null
    const [formData, setFormData] = useState({ category: '🧊 น้ำแข็ง', note: '', amount: '' });

    // 🌟 ฟังก์ชันส่งคำสั่งเปิดเก๊ะไปยัง Backend (สั่งดีดเก๊ะผ่าน Network)
    const handleKickDrawer = async () => {
        try {
            await fetchJSON('/hardware/open-drawer', {
                method: 'POST',
                body: JSON.stringify({}) // ส่ง Body ว่างไปก่อน เพราะใช้ IP Default ใน Backend
            });
        } catch (e) {
            console.error("Hardware kick failed:", e);
            // ถ้าสั่งผ่าน Hardware ไม่สำเร็จ อาจจะแจ้งเตือนเบาๆ ใน Console
        }
    };

    // 🌟 ระบบคำนวณยอดเงินแบบ Real-time
    const stats = useMemo(() => {
        const start = parseFloat(shift?.startCash || 0);
        
        // กรองเฉพาะรายการที่เป็นเงินสด (CASH) และ ไม่ได้ถูก VOID
        const cashTxns = (transactions || []).filter(t => 
            t.status !== 'VOIDED' && 
            (t.method === 'CASH' || t.paymentMethod === 'CASH' || t.type === 'INCOME' || t.type === 'EXPENSE')
        );

        let totalIn = 0;
        let totalOut = 0;

        cashTxns.forEach(t => {
            const amt = parseFloat(t.amount || t.total || 0);
            if (t.type === 'EXPENSE') {
                totalOut += Math.abs(amt);
            } else {
                totalIn += amt;
            }
        });

        return {
            start,
            totalIn,
            totalOut,
            balance: start + totalIn - totalOut,
            cashTransactions: cashTxns.sort((a, b) => new Date(b.date_raw || b.created_at) - new Date(a.date_raw || a.created_at))
        };
    }, [shift, transactions]);

    const cashTransactions = stats.cashTransactions;

    // 🌟 ฟังก์ชันบันทึกรายการ (นำเงินเข้า/ออก)
    const handleSave = async () => {
        const amount = parseFloat(formData.amount);
        if (!amount || amount <= 0) return alert('กรุณาระบุจำนวนเงินให้ถูกต้องครับ');
        if (!shift?.isOpen) return alert('กรุณาเปิดกะก่อนบันทึกรายการครับ');

        const isIncome = modalMode === 'income';
        const txnType = isIncome ? 'INCOME' : 'EXPENSE';
        const newBillId = generateBillId(txnType, transactions);

        const txnPayload = {
            bill_id: newBillId,
            type: txnType,
            amount: amount,
            method: 'CASH',
            desc: `${formData.category}${formData.note ? ` - ${formData.note}` : ''}`,
            cashier: currentEmployee?.name || 'System',
            date_raw: new Date().toISOString(),
            items: JSON.stringify([{
                name: isIncome ? 'นำเงินเข้าเก๊ะ' : 'นำเงินออกเก๊ะ',
                qty: 1,
                price: amount
            }])
        };

        try {
            const savedTxn = await fetchJSON('/transactions/', {
                method: 'POST',
                body: JSON.stringify(txnPayload)
            });

            // อัปเดตข้อมูลในระบบ
            setTransactions(prev => [savedTxn, ...prev]);
            setFormData({ category: '🧊 น้ำแข็ง', note: '', amount: '' });
            setModalMode(null);
            
            // เมื่อบันทึกเสร็จ ให้เก๊ะเปิดอีกครั้งเพื่อเก็บเงิน/ทอนเงิน (ผ่าน Hardware)
            setTimeout(() => handleKickDrawer(), 300);
        } catch (e) {
            console.error("Failed to save transaction:", e);
            alert("ไม่สามารถบันทึกรายการได้: " + e.message);
        }
    };

    return (
        <div className="flex flex-col h-full gap-5 w-full relative animate-in fade-in duration-300 font-body">

            {/* Modal บันทึกรับ/จ่าย */}
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
                                        <><option>🧊 น้ำแข็ง</option><option>🥛 นมสด</option><option>🚲 ค่าส่ง</option><option>อื่นๆ</option></>
                                    ) : (
                                        <><option>💵 เงินทอน (แลกแบงก์)</option><option>อื่นๆ</option></>
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
                                    className={`w-full p-5 border-2 rounded-[2rem] text-4xl font-black text-center outline-none ${modalMode === 'expense' ? 'border-red-200 bg-red-50 focus:border-red-500 text-red-600' : 'border-emerald-200 bg-emerald-50 focus:border-emerald-500 text-emerald-600'}`}
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
                    <button onClick={handleKickDrawer} className="bg-stone-800 text-white px-5 py-3 rounded-full text-xs font-bold border border-stone-800 flex items-center gap-1.5 hover:bg-black transition-colors active:scale-95 shadow-lg shadow-stone-200">
                        <span className="material-symbols-outlined text-[18px]">open_in_new</span> เปิดเก๊ะเก็บเงิน
                    </button>
                    <button onClick={() => setModalMode('expense')} className="bg-red-50 text-red-600 px-5 py-3 rounded-full text-xs font-bold border border-red-200 flex items-center gap-1.5 hover:bg-red-100 transition-colors active:scale-95 shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">remove</span> บันทึกจ่าย
                    </button>
                    <button onClick={() => setModalMode('income')} className="bg-emerald-50 text-emerald-600 px-5 py-3 rounded-full text-xs font-bold border border-emerald-200 flex items-center gap-1.5 hover:bg-emerald-100 transition-colors active:scale-95 shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">add</span> บันทึกรับ
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm text-center">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">เงินนำเข้า (CASH IN)</p>
                    <p className="text-3xl font-black text-emerald-500">฿{stats.totalIn.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm text-center">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">เงินดึงออก (CASH OUT)</p>
                    <p className="text-3xl font-black text-red-500">฿{stats.totalOut.toLocaleString()}</p>
                </div>
                <div className="animate-sribrown p-6 rounded-[2rem] shadow-xl text-center text-white relative overflow-hidden">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">เงินสดในลิ้นชัก</p>
                    <p className="text-4xl font-black">฿{stats.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <div className="mt-2 text-[9px] font-bold bg-black/20 inline-block px-3 py-1 rounded-full">
                        ตั้งต้น: ฿{stats.start.toLocaleString()}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="p-5 border-b bg-stone-50/50 flex justify-between items-center shrink-0">
                    <h3 className="font-black text-sm text-[#861b00] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">history_edu</span> รายการเงินสดในกะปัจจุบัน
                    </h3>
                    <span className="text-[10px] font-bold text-stone-400">พบ {cashTransactions.length} รายการ</span>
                </div>

                <div className="overflow-y-auto flex-1 no-scrollbar pb-10">
                    <table className="w-full text-left text-sm min-w-[850px]">
                        <thead className="bg-white border-b text-[10px] font-black text-stone-400 uppercase tracking-widest sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-5 pl-8 w-28">เวลา</th>
                                <th className="p-5 w-40 text-[#861b00]">เลขที่บิล</th>
                                <th className="p-5 w-32">ประเภท</th>
                                <th className="p-5">รายละเอียด</th>
                                <th className="p-5 text-center w-28">พนักงาน</th>
                                <th className="p-5 text-right pr-8 w-40">จำนวนเงิน (฿)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {cashTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-16 text-center">
                                        <div className="w-12 h-12 mx-auto bg-stone-50 rounded-full flex items-center justify-center mb-3">
                                            <span className="material-symbols-outlined text-2xl text-stone-300">payments</span>
                                        </div>
                                        <p className="text-stone-300 uppercase font-black text-[10px] tracking-widest">ไม่มีรายการเงินสดเกิดขึ้นในกะนี้</p>
                                    </td>
                                </tr>
                            ) : (
                                cashTransactions.map(t => {
                                    const isExpense = t.type === 'EXPENSE';
                                    const amount = parseFloat(t.amount || t.total || 0);
                                    return (
                                        <tr key={t.id} className="hover:bg-stone-50/50 transition-colors group">
                                            <td className="p-4 pl-8 text-[11px] font-bold text-stone-500 whitespace-nowrap">
                                                {(() => {
                                                    const rawStr = t.date_raw || t.created_at;
                                                    if (!rawStr) return t.time || '--:--';
                                                    return new Date(rawStr).toLocaleString('th-TH', {
                                                        day: '2-digit', month: '2-digit', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                                                    }).replace(/ /g, ' ').replace(',', ' -') + ' น.';
                                                })()}
                                            </td>
                                            <td className="p-4">
                                                <span className="text-[11px] font-black text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg group-hover:bg-[#861b00]/10 group-hover:text-[#861b00] transition-colors">
                                                    {t.bill_id || t.id}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-4 py-1.5 text-[9px] tracking-widest font-black rounded-full inline-block border ${t.type === 'SALE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    t.type === 'TOPUP' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        t.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                            t.type === 'EXPENSE' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                'bg-stone-100 text-stone-600 border-stone-200'
                                                    }`}>
                                                    {t.type === 'SALE' ? 'ขายสินค้า' :
                                                        t.type === 'TOPUP' ? 'เติมเงิน' :
                                                            t.type === 'INCOME' ? 'นำเงินเข้า' :
                                                                t.type === 'EXPENSE' ? 'นำเงินออก' : t.type}
                                                </span>
                                            </td>
                                            <td className="p-4 text-[13px] font-bold text-stone-600 group-hover:text-stone-900 transition-colors">
                                                {t.desc || '-'}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="text-[10px] font-black text-stone-400 uppercase tracking-tighter">
                                                    {t.cashier || 'System'}
                                                </span>
                                            </td>
                                            <td className={`p-4 pr-8 text-right font-black text-[16px] ${isExpense ? 'text-red-500' : 'text-emerald-600'}`}>
                                                {isExpense ? '-' : '+'}฿{Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}