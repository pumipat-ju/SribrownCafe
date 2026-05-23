import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { fetchJSON, triggerDrawer } from '../api.js';
import ReceiptPrintout from './ReceiptPrintout';

export default function CashTab() {
    const {
        shift,
        transactions,
        setTransactions,
        currentEmployee,
        generateBillId,
    } = useContext(AppContext);

    const [modalMode, setModalMode] = useState(null); // 'income' | 'expense' | null
    const [formData, setFormData] = useState({
        category: '🧊 น้ำแข็ง',
        note: '',
        amount: '',// ... (ในส่วนท้ายของไฟล์ CashTab.jsx ก่อนปิด div หลัก)
    });

    const [viewingTxn, setViewingTxn] = useState(null);
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [voidPin, setVoidPin] = useState('');
    const [voidReason, setVoidReason] = useState('');
    const [isVoiding, setIsVoiding] = useState(false);
    const [voidError, setVoidError] = useState('');

    const handleKickDrawer = async () => {
        await triggerDrawer('manual_open', currentEmployee?.name || 'System');
    };

    const openExpenseModal = () => {
        setFormData({
            category: '🧊 น้ำแข็ง',
            note: '',
            amount: '',
        });
        setModalMode('expense');
    };

    const openIncomeModal = () => {
        setFormData({
            category: '💵 เงินทอน (แลกแบงก์)',
            note: '',
            amount: '',
        });
        setModalMode('income');
    };

    const getTxnTime = (txn) => {
        const raw = txn?.date_raw || txn?.dateRaw || txn?.created_at || txn?.timestamp;
        const date = raw ? new Date(raw) : new Date(0);
        return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };

    const stats = useMemo(() => {
        const start = parseFloat(shift?.startCash || 0);
        const shiftStartTime = shift?.startTime
            ? new Date(shift.startTime).getTime()
            : 0;

        const cashTxns = (transactions || []).filter((txn) => {
            const type = String(txn.type || '').toUpperCase();
            const status = String(txn.status || 'COMPLETED').toUpperCase();

            const isCurrentShift = shift?.isOpen
                ? getTxnTime(txn) >= shiftStartTime
                : false;

            // กรองให้เหลือแค่รายการที่บันทึกเอง (INCOME/EXPENSE)
            const isUserInitiated = type === 'INCOME' || type === 'EXPENSE';

            return status !== 'VOIDED' && isCurrentShift && isUserInitiated;
        });

        let totalIn = 0;
        let totalOut = 0;

        cashTxns.forEach((txn) => {
            const type = String(txn.type || '').toUpperCase();
            const amount = parseFloat(txn.amount || txn.total || 0);

            if (type === 'EXPENSE') {
                totalOut += Math.abs(amount);
            } else if (type === 'SALE' || type === 'TOPUP' || type === 'INCOME') {
                totalIn += amount;
            }
        });

        return {
            start,
            totalIn,
            totalOut,
            balance: start + totalIn - totalOut,
            cashTransactions: [...cashTxns].sort((a, b) => getTxnTime(b) - getTxnTime(a)),
        };
    }, [shift, transactions]);

    const cashTransactions = stats.cashTransactions;

    const handleVoidSubmit = async (e) => {
        e.preventDefault();
        setVoidError('');
        setIsVoiding(true);
        try {
            const updatedTxn = await fetchJSON(`/transactions/${viewingTxn.id}/void/`, {
                method: 'PUT',
                body: JSON.stringify({ pin: voidPin, reason: voidReason })
            });
            setTransactions(prev => prev.map(t => t.id === updatedTxn.id ? { ...t, status: 'VOIDED', void_reason: updatedTxn.void_reason } : t));
            setShowVoidModal(false);
            setVoidPin('');
            setVoidReason('');
            setViewingTxn(null);
        } catch (err) {
            setVoidError(err.message || 'รหัส PIN ไม่ถูกต้อง');
        } finally {
            setIsVoiding(false);
        }
    };

    const handleSave = async () => {
        const amount = parseFloat(formData.amount);

        if (!amount || amount <= 0) {
            alert('กรุณาระบุจำนวนเงินให้ถูกต้องครับ');
            return;
        }

        if (!shift?.isOpen) {
            alert('กรุณาเปิดกะก่อนบันทึกรายการครับ');
            return;
        }

        const isIncome = modalMode === 'income';
        const txnType = isIncome ? 'INCOME' : 'EXPENSE';
        const newBillId = generateBillId(txnType, transactions);

        const txnPayload = {
            bill_id: newBillId,
            type: txnType,
            amount,
            method: 'CASH',
            desc: `${formData.category}${formData.note ? ` - ${formData.note}` : ''}`,
            cashier: currentEmployee?.name || 'System',
            date_raw: new Date().toISOString(),
            items: JSON.stringify([
                {
                    name: isIncome ? 'นำเงินเข้าเก๊ะ' : 'นำเงินออกเก๊ะ',
                    name_th: isIncome ? 'นำเงินเข้าเก๊ะ' : 'นำเงินออกเก๊ะ',
                    name_en: isIncome ? 'Cash In' : 'Cash Out',
                    qty: 1,
                    price: amount,
                },
            ]),
        };

        try {
            const savedTxn = await fetchJSON('/transactions/', {
                method: 'POST',
                body: JSON.stringify(txnPayload),
            });

            const dt = new Date(savedTxn.created_at || savedTxn.date_raw);
            const formattedTxn = {
                ...savedTxn,
                dateRaw: savedTxn.created_at || savedTxn.date_raw,
                date: dt.toLocaleDateString('th-TH'),
                time: dt.toLocaleTimeString('th-TH').slice(0, 5) + ' น.'
            };

            setTransactions((prev) => [formattedTxn, ...prev]);
            setFormData({ category: '🧊 น้ำแข็ง', note: '', amount: '' });
            setModalMode(null);

            // 🔓 เปิดเก๊ะหลังบันทึกสำเร็จเท่านั้น
            setTimeout(() => {
                triggerDrawer(
                    isIncome ? 'cash_in' : 'cash_out',
                    currentEmployee?.name || 'System',
                    { bill_id: savedTxn.bill_id }
                );
            }, 300);
        } catch (e) {
            console.error('Failed to save transaction:', e);
            alert('ไม่สามารถบันทึกรายการได้: ' + e.message);
        }
    };

    return (
        <div className="flex flex-col h-full gap-5 w-full relative animate-in fade-in duration-300 font-body">
            {modalMode && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
                        onClick={() => setModalMode(null)}
                    />

                    <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full relative z-10 animate-in zoom-in-95 shadow-2xl">
                        <h3
                            className={`font-black text-2xl mb-6 font-headline ${
                                modalMode === 'expense'
                                    ? 'text-red-600'
                                    : 'text-emerald-600'
                            }`}
                        >
                            {modalMode === 'expense'
                                ? 'บันทึกจ่ายเงิน (นำเงินออก)'
                                : 'บันทึกรับเงิน (นำเงินเข้า)'}
                        </h3>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="text-[10px] font-bold block mb-2 uppercase tracking-widest text-stone-500">
                                    หมวดหมู่
                                </label>

                                <select
                                    value={formData.category}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            category: e.target.value,
                                        })
                                    }
                                    className="w-full p-4 bg-stone-50 border-2 border-stone-200 rounded-2xl font-bold outline-none focus:border-stone-400"
                                >
                                    {modalMode === 'expense' ? (
                                        <>
                                            <option>🧊 น้ำแข็ง</option>
                                            <option>🥛 นมสด</option>
                                            <option>🚲 ค่าส่ง</option>
                                            <option>🧾 ค่าใช้จ่ายอื่นๆ</option>
                                        </>
                                    ) : (
                                        <>
                                            <option>💵 เงินทอน (แลกแบงก์)</option>
                                            <option>💰 เงินสดเพิ่มเข้าลิ้นชัก</option>
                                            <option>อื่นๆ</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold block mb-2 uppercase tracking-widest text-stone-500">
                                    หมายเหตุ (ถ้ามี)
                                </label>

                                <input
                                    value={formData.note}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            note: e.target.value,
                                        })
                                    }
                                    className="w-full p-4 bg-stone-50 border-2 border-stone-200 rounded-2xl text-sm outline-none focus:border-stone-400 font-bold text-stone-700"
                                    placeholder="เช่น ซื้อจากร้านเจ๊น้อย"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold block mb-2 text-center uppercase tracking-widest text-stone-500">
                                    ยอดเงิน (บาท)
                                </label>

                                <input
                                    type="number"
                                    autoFocus
                                    value={formData.amount}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            amount: e.target.value,
                                        })
                                    }
                                    className={`w-full p-5 border-2 rounded-[2rem] text-4xl font-black text-center outline-none ${
                                        modalMode === 'expense'
                                            ? 'border-red-200 bg-red-50 focus:border-red-500 text-red-600'
                                            : 'border-emerald-200 bg-emerald-50 focus:border-emerald-500 text-emerald-600'
                                    }`}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setModalMode(null)}
                                className="flex-1 py-4 bg-stone-100 font-bold text-stone-600 rounded-2xl hover:bg-stone-200 transition-colors"
                            >
                                ยกเลิก
                            </button>

                            <button
                                onClick={handleSave}
                                className={`flex-[2] py-4 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all ${
                                    modalMode === 'expense'
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                ยืนยัน
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-black font-headline text-[#861b00] flex items-center gap-2">
                    <span className="material-symbols-outlined text-3xl">
                        payments
                    </span>
                    บัญชีหน้าลิ้นชัก
                </h2>

                <div className="flex gap-3">
                    <button
                        onClick={handleKickDrawer}
                        className="bg-stone-800 text-white px-5 py-3 rounded-full text-xs font-bold border border-stone-800 flex items-center gap-1.5 hover:bg-black transition-colors active:scale-95 shadow-lg shadow-stone-200"
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            open_in_new
                        </span>
                        เปิดเก๊ะเก็บเงิน
                    </button>

                    <button
                        onClick={openExpenseModal}
                        className="bg-red-50 text-red-600 px-5 py-3 rounded-full text-xs font-bold border border-red-200 flex items-center gap-1.5 hover:bg-red-100 transition-colors active:scale-95 shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            remove
                        </span>
                        บันทึกจ่าย
                    </button>

                    <button
                        onClick={openIncomeModal}
                        className="bg-emerald-50 text-emerald-600 px-5 py-3 rounded-full text-xs font-bold border border-emerald-200 flex items-center gap-1.5 hover:bg-emerald-100 transition-colors active:scale-95 shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            add
                        </span>
                        บันทึกรับ
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm text-center">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">
                        เงินนำเข้า (CASH IN)
                    </p>
                    <p className="text-3xl font-black text-emerald-500">
                        ฿{stats.totalIn.toLocaleString()}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm text-center">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">
                        เงินดึงออก (CASH OUT)
                    </p>
                    <p className="text-3xl font-black text-red-500">
                        ฿{stats.totalOut.toLocaleString()}
                    </p>
                </div>

                <div className="animate-sribrown p-6 rounded-[2rem] shadow-xl text-center text-white relative overflow-hidden">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
                        เงินสดในลิ้นชัก
                    </p>
                    <p className="text-4xl font-black">
                        ฿
                        {stats.balance.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                        })}
                    </p>
                    <div className="mt-2 text-[9px] font-bold bg-black/20 inline-block px-3 py-1 rounded-full">
                        ตั้งต้น: ฿{stats.start.toLocaleString()}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="p-5 border-b bg-stone-50/50 flex justify-between items-center shrink-0">
                    <h3 className="font-black text-sm text-[#861b00] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">
                            history_edu
                        </span>
                        รายการเงินสดในกะปัจจุบัน
                    </h3>

                    <span className="text-[10px] font-bold text-stone-400">
                        พบ {cashTransactions.length} รายการ
                    </span>
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
                                            <span className="material-symbols-outlined text-2xl text-stone-300">
                                                payments
                                            </span>
                                        </div>
                                        <p className="text-stone-300 uppercase font-black text-[10px] tracking-widest">
                                            ไม่มีรายการเงินสดเกิดขึ้นในกะนี้
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                cashTransactions.map((txn) => {
                                    const type = String(txn.type || '').toUpperCase();
                                    const isExpense = type === 'EXPENSE';
                                    const amount = parseFloat(txn.amount || txn.total || 0);

                                    return (
                                    <tr
                                            key={txn.id}
                                            onClick={() => setViewingTxn(txn)}
                                            className="hover:bg-stone-50/50 transition-colors group cursor-pointer"
                                        >
                                            <td className="p-4 pl-8 text-[11px] font-bold text-stone-500 whitespace-nowrap">
                                                {(() => {
                                                    const rawStr =
                                                        txn.date_raw || txn.created_at;
                                                    if (!rawStr) return txn.time || '--:--';

                                                    return (
                                                        new Date(rawStr)
                                                            .toLocaleString('th-TH', {
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                second: '2-digit',
                                                                hour12: false,
                                                            })
                                                            .replace(',', ' -') + ' น.'
                                                    );
                                                })()}
                                            </td>

                                            <td className="p-4">
                                                <span className="text-[11px] font-black text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg group-hover:bg-[#861b00]/10 group-hover:text-[#861b00] transition-colors">
                                                    {txn.bill_id || txn.id}
                                                </span>
                                            </td>

                                            <td className="p-4">
                                                <span
                                                    className={`px-4 py-1.5 text-[9px] tracking-widest font-black rounded-full inline-block border ${
                                                        type === 'SALE'
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                            : type === 'TOPUP'
                                                              ? 'bg-blue-50 text-blue-600 border-blue-100'
                                                              : type === 'INCOME'
                                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                                : type === 'EXPENSE'
                                                                  ? 'bg-red-50 text-red-600 border-red-100'
                                                                  : 'bg-stone-100 text-stone-600 border-stone-200'
                                                    }`}
                                                >
                                                    {type === 'SALE'
                                                        ? 'ขายสินค้า'
                                                        : type === 'TOPUP'
                                                          ? 'เติมเงิน'
                                                          : type === 'INCOME'
                                                            ? 'นำเงินเข้า'
                                                            : type === 'EXPENSE'
                                                              ? 'นำเงินออก'
                                                              : type}
                                                </span>
                                            </td>

                                            <td className="p-4 text-[13px] font-bold text-stone-600 group-hover:text-stone-900 transition-colors">
                                                {txn.desc || '-'}
                                            </td>

                                            <td className="p-4 text-center">
                                                <span className="text-[10px] font-black text-stone-400 uppercase tracking-tighter">
                                                    {txn.cashier || 'System'}
                                                </span>
                                            </td>

                                            <td
                                                className={`p-4 pr-8 text-right font-black text-[16px] ${
                                                    isExpense
                                                        ? 'text-red-500'
                                                        : 'text-emerald-600'
                                                }`}
                                            >
                                                {isExpense ? '-' : '+'}฿
                                                {Math.abs(amount).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {viewingTxn && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
                    <div className="absolute inset-0" onClick={() => setViewingTxn(null)} />
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full relative z-10 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#861b00] to-red-600" />
                        
                        <div className="text-center mb-6">
                            <h4 className="font-black text-lg text-stone-800 uppercase tracking-widest">Sri Brown Coffee</h4>
                            <p className="text-[10px] text-stone-400 font-bold uppercase">Transaction Receipt</p>
                        </div>

                        <div className="space-y-3 mb-8 text-[11px] font-bold text-stone-500 border-b border-dashed border-stone-200 pb-4">
                            <div className="flex justify-between"><span>เลขที่บิล:</span><span className="text-stone-800">{viewingTxn.bill_id || viewingTxn.id}</span></div>
                            <div className="flex justify-between"><span>วันที่:</span><span className="text-stone-800">{viewingTxn.date} | {viewingTxn.time}</span></div>
                            <div className="flex justify-between"><span>พนักงาน:</span><span className="text-stone-800">{viewingTxn.cashier}</span></div>
                            <div className="flex justify-between"><span>ช่องทาง:</span><span className="text-stone-800">{viewingTxn.method || viewingTxn.paymentMethod}</span></div>
                        </div>

                        <div className="space-y-4 mb-8 max-h-[300px] overflow-y-auto no-scrollbar">
                            {(() => {
                                let displayItems = [];
                                if (typeof viewingTxn.items === 'string') {
                                    try { displayItems = JSON.parse(viewingTxn.items); } catch (e) { }
                                } else if (Array.isArray(viewingTxn.items)) {
                                    displayItems = viewingTxn.items;
                                }
                                if (displayItems.length > 0) {
                                    return displayItems.map((item, i) => (
                                        <div key={i} className="flex justify-between items-start">
                                            <div className="flex-1 pr-4">
                                                <p className="text-[12px] font-black text-stone-800">{item.name_th || item.name_en || item.name}</p>
                                                <p className="text-[10px] text-stone-400">{item.qty} x ฿{item.price.toLocaleString()}</p>
                                            </div>
                                            <span className="text-[12px] font-black text-stone-800">฿{(item.qty * item.price).toLocaleString()}</span>
                                        </div>
                                    ));
                                } else {
                                    return <p className="text-[12px] font-black text-stone-800 text-center py-4">{viewingTxn.desc}</p>;
                                }
                            })()}
                        </div>

                        <div className="bg-stone-50 p-4 rounded-2xl mb-6">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-stone-400 uppercase">ยอดรวมสุทธิ</span>
                                <span className="text-2xl font-black text-[#861b00]">฿{Math.abs(parseFloat(viewingTxn.amount || viewingTxn.total)).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setViewingTxn(null)} className="flex-1 py-4 bg-stone-100 font-bold text-stone-500 rounded-2xl hover:bg-stone-200 transition-all">ปิด</button>
                            {viewingTxn.status !== 'VOIDED' && (
                                <button onClick={() => setShowVoidModal(true)} className="flex-1 py-4 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-all border border-red-200">ยกเลิกบิล</button>
                            )}
                        </div>

                        {showVoidModal && (
                            <div className="absolute inset-0 z-20 bg-white/90 backdrop-blur-sm rounded-[2.5rem] flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
                                <form onSubmit={handleVoidSubmit} className="bg-white p-6 rounded-3xl shadow-xl border border-red-100 w-full text-center max-h-full overflow-y-auto">
                                    <span className="material-symbols-outlined text-4xl text-red-500 mb-2">warning</span>
                                    <h4 className="font-black text-lg text-stone-800 mb-1">ยืนยันการยกเลิกบิล</h4>
                                    <p className="text-xs text-stone-500 font-bold mb-4">โปรดระบุหมายเหตุและใส่ PIN เพื่อยืนยัน</p>
                                    
                                    <div className="text-left mb-4">
                                        <label className="text-[10px] font-black text-stone-400 uppercase ml-2 mb-1 block">เหตุผลที่ยกเลิก</label>
                                        <select 
                                            onChange={(e) => {
                                                if (e.target.value === 'อื่นๆ') setVoidReason('');
                                                else setVoidReason(e.target.value);
                                            }}
                                            className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500 mb-2"
                                        >
                                            <option value="">-- เลือกเหตุผล --</option>
                                            <option value="ลูกค้าเปลี่ยนใจ">ลูกค้าเปลี่ยนใจ</option>
                                            <option value="พนักงานคีย์ผิด">พนักงานคีย์ผิด / รายการผิด</option>
                                            <option value="บิลซ้ำ">บิลซ้ำ</option>
                                            <option value="อื่นๆ">อื่นๆ (ระบุเอง)</option>
                                        </select>
                                        {(voidReason === '' || !['ลูกค้าเปลี่ยนใจ', 'พนักงานคีย์ผิด', 'บิลซ้ำ'].includes(voidReason)) && (
                                            <textarea value={voidReason} onChange={e => setVoidReason(e.target.value)} placeholder="ระบุเหตุผลอื่นๆ..." required className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none h-24" />
                                        )}
                                    </div>

                                    <input type="password" value={voidPin} onChange={e => setVoidPin(e.target.value)} placeholder="PIN ผู้จัดการ" required className="w-full text-center text-2xl tracking-[0.5em] font-black py-3 bg-stone-100 rounded-xl mb-2 focus:outline-none focus:ring-2 focus:ring-red-500" />
                                    {voidError && <p className="text-[10px] text-red-500 font-bold mb-4">{voidError}</p>}
                                    
                                    <div className="flex gap-2 mt-4">
                                        <button type="button" onClick={() => { setShowVoidModal(false); setVoidPin(''); setVoidReason(''); setVoidError(''); }} className="flex-1 py-3 bg-stone-100 text-stone-500 font-bold rounded-xl hover:bg-stone-200">กลับ</button>
                                        <button type="submit" disabled={isVoiding || !voidPin || !voidReason} className="flex-1 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 disabled:opacity-50">{isVoiding ? 'กำลังยกเลิก...' : 'ยืนยัน'}</button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}