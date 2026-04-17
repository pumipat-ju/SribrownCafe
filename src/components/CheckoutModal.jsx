import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';

export default function CheckoutModal({ onClose }) {
    // 🌟 นำเข้า members และ setMembers จาก Context
    const { cart, setCart, transactions, setTransactions, currentEmployee, members, setMembers } = useContext(AppContext);

    const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, QR, EWALLET
    const [receivedAmount, setReceivedAmount] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    // 🌟 State สำหรับ E-Wallet
    const [searchPhone, setSearchPhone] = useState('');
    const [selectedMember, setSelectedMember] = useState(null);

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const change = receivedAmount ? parseFloat(receivedAmount) - total : 0;

    // ฟังก์ชันกดยอดเงินจาก NumPad
    const handleNumClick = (num) => {
        if (num === 'C') {
            setReceivedAmount('');
        } else if (num === 'DEL') {
            setReceivedAmount(prev => prev.slice(0, -1));
        } else {
            setReceivedAmount(prev => prev + num);
        }
    };

    // 🌟 ฟังก์ชันค้นหาสมาชิก
    const handleSearchMember = (e) => {
        e.preventDefault();
        if (!members) return alert('ไม่พบฐานข้อมูลสมาชิก');
        const found = members.find(m => m.phone === searchPhone);
        if (found) {
            setSelectedMember(found);
        } else {
            alert('ไม่พบข้อมูลสมาชิกเบอร์นี้ในระบบครับ');
            setSelectedMember(null);
        }
    };

    // ฟังก์ชันยืนยันการชำระเงิน
    const handleCompleteSale = () => {
        // เช็คกรณีเงินสด
        if (paymentMethod === 'CASH' && (!receivedAmount || parseFloat(receivedAmount) < total)) {
            return alert('กรุณาระบุเงินที่รับมาให้ถูกต้อง');
        }

        // 🌟 เช็คกรณี E-Wallet
        if (paymentMethod === 'EWALLET') {
            if (!selectedMember) return alert('กรุณาค้นหาและเลือกสมาชิกก่อนชำระเงิน');
            if (selectedMember.wallet < total) return alert('ยอดเงิน E-Wallet ไม่พอ กรุณาเติมเงินหรือเลือกวิธีชำระอื่นครับ');

            // หักเงินจากกระเป๋าสมาชิก (อัปเดต State)
            if (setMembers) {
                setMembers(members.map(m =>
                    m.id === selectedMember.id ? { ...m, wallet: m.wallet - total } : m
                ));
            }
        }

        // บันทึกรายการขาย
        const newTransaction = {
            id: `TXN-${Date.now()}`,
            type: 'SALE',
            amount: total,
            items: cart,
            paymentMethod,
            timestamp: new Date(),
            cashier: currentEmployee?.name || 'Staff',
            memberId: paymentMethod === 'EWALLET' ? selectedMember.id : null // เก็บประวัติว่าสมาชิกคนไหนซื้อ
        };

        setTransactions([newTransaction, ...transactions]);
        setIsSuccess(true);

        setTimeout(() => {
            setCart([]);
            onClose();
        }, 2000);
    };

    if (isSuccess) {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-[#861b00] animate-in fade-in duration-500" />
                <div className="relative text-center text-white animate-in zoom-in duration-300">
                    <span className="material-symbols-outlined text-9xl mb-4">check_circle</span>
                    <h2 className="text-4xl font-black font-headline uppercase tracking-widest">ชำระเงินสำเร็จ</h2>
                    {paymentMethod === 'EWALLET' && (
                        <p className="mt-2 text-amber-200 font-bold uppercase">ตัดยอดจาก E-Wallet เรียบร้อย</p>
                    )}
                    <p className="mt-2 text-white/70 font-bold uppercase tracking-widest">ขอบคุณที่ใช้บริการ Sri Brown</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" onClick={onClose} />

            <div className="bg-stone-100 rounded-[3rem] shadow-2xl w-full max-w-5xl h-full max-h-[700px] relative z-10 overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300">

                {/* 🧾 ฝั่งซ้าย: สรุปรายการ (Receipt View) */}
                <div className="w-full md:w-5/12 bg-white p-8 flex flex-col shadow-xl z-20">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="font-black text-2xl text-stone-800 font-headline">สรุปรายการ</h3>
                        <button onClick={onClose} className="text-stone-300 hover:text-stone-500"><span className="material-symbols-outlined">close</span></button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
                        {cart.map((item) => (
                            <div key={item.cartKey} className="flex justify-between items-start border-b border-stone-50 pb-3">
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-stone-700">{item.name} <span className="text-stone-400 ml-1">x{item.qty}</span></p>
                                    <p className="text-[10px] text-stone-400 font-bold uppercase leading-tight">{item.options}</p>
                                </div>
                                <p className="font-black text-stone-800">฿{(item.price * item.qty).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-6 border-t-4 border-double border-stone-100">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-stone-400 font-bold text-xs uppercase">ยอดรวมทั้งหมด</span>
                            <span className="text-3xl font-black text-[#861b00]">฿{total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* 💰 ฝั่งขวา: การชำระเงิน (Payment View) */}
                <div className="w-full md:w-7/12 p-8 flex flex-col bg-stone-50/50">
                    <h3 className="font-black text-xl text-stone-700 mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined">payments</span> เลือกช่องทางชำระเงิน
                    </h3>

                    {/* 🌟 Selector วิธีชำระเงิน (เปลี่ยนเป็น 3 ปุ่ม) */}
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        <button onClick={() => setPaymentMethod('CASH')} className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${paymentMethod === 'CASH' ? 'border-[#861b00] bg-white text-[#861b00] shadow-md' : 'border-stone-200 text-stone-400 bg-stone-50'}`}>
                            <span className="material-symbols-outlined text-2xl">payments</span>
                            <span className="font-bold text-[10px] uppercase tracking-wider">เงินสด</span>
                        </button>
                        <button onClick={() => { setPaymentMethod('QR'); setReceivedAmount(total.toString()); }} className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${paymentMethod === 'QR' ? 'border-[#861b00] bg-white text-[#861b00] shadow-md' : 'border-stone-200 text-stone-400 bg-stone-50'}`}>
                            <span className="material-symbols-outlined text-2xl">qr_code_2</span>
                            <span className="font-bold text-[10px] uppercase tracking-wider">คิวอาร์</span>
                        </button>
                        <button onClick={() => setPaymentMethod('EWALLET')} className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${paymentMethod === 'EWALLET' ? 'border-amber-500 bg-white text-amber-600 shadow-md' : 'border-stone-200 text-stone-400 bg-stone-50'}`}>
                            <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
                            <span className="font-bold text-[10px] uppercase tracking-wider">E-Wallet</span>
                        </button>
                    </div>

                    {/* --- เนื้อหาเปลี่ยนไปตามวิธีชำระเงิน --- */}

                    {paymentMethod === 'CASH' && (
                        // ... (โค้ด NumPad เงินสด เหมือนเดิมครับ) ...
                        <div className="flex-1 flex flex-col gap-5">
                            <div className="bg-white p-5 rounded-[2rem] border shadow-sm text-right flex justify-between items-center px-6">
                                <p className="text-xs text-stone-400 font-bold uppercase">รับเงินมา</p>
                                <p className="text-4xl font-black text-emerald-600">฿{receivedAmount || '0'}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2 flex-1">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((num) => (
                                    <button key={num} onClick={() => handleNumClick(num)} className="bg-white hover:bg-stone-100 text-stone-700 font-black text-xl rounded-2xl border shadow-sm active:scale-95 transition-all">{num}</button>
                                ))}
                            </div>
                            <div className="flex justify-between items-center px-4 bg-stone-100 p-4 rounded-2xl border">
                                <span className="text-stone-500 font-bold uppercase text-xs">เงินทอน</span>
                                <span className={`text-2xl font-black ${change < 0 ? 'text-red-400' : 'text-[#861b00]'}`}>฿{change >= 0 ? change.toLocaleString() : '---'}</span>
                            </div>
                        </div>
                    )}

                    {paymentMethod === 'QR' && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-white rounded-[2rem] border border-stone-200 mb-8 shadow-sm">
                            <span className="material-symbols-outlined text-[100px] text-stone-200">qr_code_scanner</span>
                            <p className="text-stone-500 font-bold text-sm">ให้ลูกค้าสแกนจ่ายยอด ฿{total.toLocaleString()}</p>
                        </div>
                    )}

                    {/* 🌟 หน้าต่างชำระด้วย E-Wallet */}
                    {paymentMethod === 'EWALLET' && (
                        <div className="flex-1 flex flex-col gap-4">
                            {/* ฟอร์มค้นหาเบอร์โทร */}
                            <form onSubmit={handleSearchMember} className="flex gap-2">
                                <div className="relative flex-1">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">call</span>
                                    <input
                                        type="text"
                                        value={searchPhone}
                                        onChange={(e) => setSearchPhone(e.target.value)}
                                        placeholder="กรอกเบอร์โทรสมาชิก..."
                                        className="w-full bg-white border-2 border-stone-200 p-4 pl-12 rounded-2xl outline-none focus:border-amber-500 font-bold"
                                    />
                                </div>
                                <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white px-6 rounded-2xl font-bold shadow-sm transition-colors active:scale-95">
                                    ค้นหา
                                </button>
                            </form>

                            {/* การ์ดแสดงข้อมูลสมาชิก */}
                            {selectedMember ? (
                                <div className="bg-white border-2 border-amber-200 rounded-[2rem] p-6 flex flex-col items-center text-center shadow-sm flex-1 justify-center animate-in fade-in zoom-in-95">
                                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-3">
                                        <span className="material-symbols-outlined text-3xl">person</span>
                                    </div>
                                    <h4 className="text-xl font-black text-stone-800">{selectedMember.name}</h4>
                                    <p className="text-sm text-stone-500 font-bold mb-6">เบอร์โทร: {selectedMember.phone}</p>

                                    <div className="w-full bg-stone-50 rounded-2xl p-4 border flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">ยอดเงินคงเหลือ</span>
                                        <span className={`text-3xl font-black ${selectedMember.wallet < total ? 'text-red-500' : 'text-emerald-600'}`}>
                                            ฿{selectedMember.wallet.toLocaleString()}
                                        </span>
                                    </div>
                                    {selectedMember.wallet < total && (
                                        <p className="text-xs text-red-500 font-bold mt-3 bg-red-50 py-2 px-4 rounded-full">ยอดเงินไม่เพียงพอ กรุณาเติมเงิน</p>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 border-2 border-dashed border-stone-200 rounded-[2rem] flex flex-col items-center justify-center text-stone-400">
                                    <span className="material-symbols-outlined text-5xl mb-2 opacity-50">contact_phone</span>
                                    <p className="font-bold text-xs uppercase">ค้นหาสมาชิกเพื่อดึงข้อมูล E-Wallet</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ปุ่มยืนยัน */}
                    <button
                        onClick={handleCompleteSale}
                        className={`w-full py-5 text-white text-xl font-black rounded-3xl shadow-[0_10px_30px_-10px_rgba(134,27,0,0.5)] transition-all mt-4 active:scale-95 flex items-center justify-center gap-3 ${paymentMethod === 'EWALLET' && (!selectedMember || selectedMember.wallet < total)
                                ? 'bg-stone-300 shadow-none cursor-not-allowed'
                                : 'bg-[#861b00] hover:bg-black'
                            }`}
                        disabled={paymentMethod === 'EWALLET' && (!selectedMember || selectedMember.wallet < total)}
                    >
                        <span className="material-symbols-outlined text-[28px]">task_alt</span>
                        ยืนยันการรับชำระ
                    </button>
                </div>

            </div>
        </div>
    );
}