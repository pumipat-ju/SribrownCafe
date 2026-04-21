import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { fetchJSON } from '../api.js';

export default function CheckoutModal({ onClose }) {
    const { cart, setCart, transactions, setTransactions, currentEmployee, members, setMembers, marketing } = useContext(AppContext);

    const [checkoutStep, setCheckoutStep] = useState('SUMMARY'); // SUMMARY, SELECT_MEMBER, PAY_CASH, PAY_QR, EWALLET
    const [isSuccess, setIsSuccess] = useState(false);

    const [receivedAmount, setReceivedAmount] = useState('');
    const [memberSearch, setMemberSearch] = useState('');
    const [selectedMember, setSelectedMember] = useState(null);
    const [selectedCouponId, setSelectedCouponId] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);

    // ==========================================
    // 🌟 State สำหรับระบบ เติมเงิน E-Wallet (Top-up Flow)
    // ==========================================
    const [isTopupFlow, setIsTopupFlow] = useState(false);
    const [topupStep, setTopupStep] = useState('PROMPT');
    const [topupPin, setTopupPin] = useState('');
    const [topupAmount, setTopupAmount] = useState('');
    const [topupReceivedAmount, setTopupReceivedAmount] = useState('');
    const [topupReceipt, setTopupReceipt] = useState(null);

    // ==========================================
    // 🌟 State สำหรับ ยืนยันรหัส PIN ลูกค้า (ตัดเงิน E-Wallet)
    // ==========================================
    const [isMemberPinFlow, setIsMemberPinFlow] = useState(false);
    const [memberPin, setMemberPin] = useState('');

    // ==========================================
    // 🧮 ระบบคำนวณตัวเลข (บิลหลัก)
    // ==========================================
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    let discount = 0;
    if (appliedCoupon) {
        if (appliedCoupon.type === 'fixed_discount') discount += appliedCoupon.value;
        else if (appliedCoupon.type === 'percentage') discount += subtotal * (appliedCoupon.value / 100);
    }
    if (selectedMember) {
        const memberTier = marketing?.tiers?.find(t => t.name === selectedMember.tier);
        if (memberTier && memberTier.discountPct > 0) {
            discount += (subtotal - discount) * (memberTier.discountPct / 100);
        }
    }
    discount = Math.min(discount, subtotal);

    const netTotal = subtotal - discount;
    const beforeVat = (netTotal * 100) / 107;
    const vatAmount = netTotal - beforeVat;
    const change = receivedAmount ? parseFloat(receivedAmount) - netTotal : 0;

    // คำนวณยอดที่ขาดสำหรับการเติมเงิน
    const missingWalletAmount = selectedMember ? Math.max(0, netTotal - (selectedMember.wallet || 0)) : 0;

    // ==========================================
    // 🛠️ ฟังก์ชัน Checkout หลัก
    // ==========================================
    const handleNumClick = (num) => {
        if (num === 'C') setReceivedAmount('');
        else if (num === 'DEL') setReceivedAmount(prev => prev.slice(0, -1));
        else setReceivedAmount(prev => prev + num);
    };

    const handleApplyCoupon = () => {
        if (!selectedCouponId) return setAppliedCoupon(null);
        const coupon = marketing?.coupons?.find(c => c.id === selectedCouponId);
        if (coupon) setAppliedCoupon(coupon);
    };

    // ฟังก์ชันนี้จะถูกเรียกเมื่อใส่รหัส PIN ลูกค้าถูกต้อง หรือจ่ายด้วยวิธีอื่น
    const handleCompleteSale = async (method) => {
        if (method === 'CASH' && (!receivedAmount || parseFloat(receivedAmount) < netTotal)) {
            return alert('กรุณาระบุเงินที่รับมาให้ครบถ้วน');
        }

        if (method === 'EWALLET') {
            try {
                const newWallet = (selectedMember.wallet || 0) - netTotal;
                const updated = await fetchJSON(`/members/${selectedMember.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ ...selectedMember, wallet: newWallet })
                });
                const updatedMember = { ...selectedMember, wallet: updated.wallet || newWallet };
                setSelectedMember(updatedMember);
                setMembers(members.map(m => m.id === selectedMember.id ? updatedMember : m));
            } catch (err) {
                console.error("Backend Error:", err);
                const updatedMember = { ...selectedMember, wallet: selectedMember.wallet - netTotal };
                setSelectedMember(updatedMember);
                setMembers(members.map(m => m.id === selectedMember.id ? updatedMember : m));
            }
        }

        const newTransaction = {
            id: `TXN-${Date.now()}`,
            type: 'SALE',
            amount: netTotal,
            items: cart,
            paymentMethod: method,
            timestamp: new Date(),
            cashier: currentEmployee?.name || 'Staff',
            memberId: selectedMember ? selectedMember.id : null,
            discount: discount
        };
        setTransactions([newTransaction, ...transactions]);
        setIsSuccess(true);
    };

    // ==========================================
    // 🛠️ ฟังก์ชัน ยืนยัน PIN ลูกค้า (ตัดเงิน E-Wallet)
    // ==========================================
    const handleMemberNumClick = (num) => {
        if (num === 'C') setMemberPin('');
        else if (num === 'DEL') setMemberPin(prev => prev.slice(0, -1));
        else if (memberPin.length < 6) setMemberPin(prev => prev + num);
    };

    const handleVerifyMemberPin = () => {
        // 🌟 ดึง PIN ของสมาชิกมาเช็ค (ถ้าในระบบยังไม่มี จะล็อค Default ไว้ที่ '123456' ให้เทสได้ครับ)
        const validMemberPin = selectedMember?.pin ? String(selectedMember.pin) : '123456';

        if (memberPin === validMemberPin) {
            setIsMemberPinFlow(false); // ปิดหน้าต่าง PIN ลูกค้า
            setMemberPin('');          // ล้างรหัส
            handleCompleteSale('EWALLET'); // ดำเนินการตัดเงินต่อทันที!
        } else {
            alert('รหัส PIN ลูกค้าไม่ถูกต้องครับ!');
            setMemberPin('');
        }
    };

    // ==========================================
    // 🛠️ ฟังก์ชัน Top-up Flow (เติมเงิน)
    // ==========================================
    const handleTopupNumClick = (num, target) => {
        const setter = target === 'PIN' ? setTopupPin : target === 'AMOUNT' ? setTopupAmount : setTopupReceivedAmount;
        if (num === 'C') setter('');
        else if (num === 'DEL') setter(prev => prev.slice(0, -1));
        else setter(prev => prev + num);
    };

    const handleVerifyPin = () => {
        const validPin = currentEmployee?.pin ? String(currentEmployee.pin) : '123456';
        if (topupPin === validPin) {
            setTopupStep('AMOUNT');
            setTopupPin('');
        } else {
            alert('รหัส PIN พนักงานไม่ถูกต้องครับ!');
            setTopupPin('');
        }
    };

    const handleExecuteTopup = async (method) => {
        const addAmount = parseFloat(topupAmount);
        if (method === 'CASH' && (!topupReceivedAmount || parseFloat(topupReceivedAmount) < addAmount)) {
            return alert('รับเงินมาไม่ครบครับ');
        }

        const newWallet = (selectedMember.wallet || 0) + addAmount;
        const updatedMember = { ...selectedMember, wallet: newWallet };

        try {
            await fetchJSON(`/members/${selectedMember.id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedMember)
            });
        } catch (e) { console.error('Topup Error', e); }

        setSelectedMember(updatedMember);
        setMembers(members.map(m => m.id === selectedMember.id ? updatedMember : m));

        const topupTxn = {
            id: `TOP-${Date.now().toString().slice(-6)}`,
            type: 'TOPUP',
            amount: addAmount,
            paymentMethod: method,
            timestamp: new Date(),
            cashier: currentEmployee?.name || 'Staff',
            memberId: selectedMember.id
        };
        setTransactions([topupTxn, ...transactions]);

        setTopupReceipt(topupTxn);
        setTopupStep('SUCCESS');
    };

    const resetTopupFlow = () => {
        setIsTopupFlow(false);
        setTopupStep('PROMPT');
        setTopupPin('');
        setTopupAmount('');
        setTopupReceivedAmount('');
    };

    // ==========================================
    // 🌟 หน้าจอ SUCCESS (บิลหลัก)
    // ==========================================
    if (isSuccess && !isTopupFlow && !isMemberPinFlow) {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-md">
                <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-6 sm:p-8 flex flex-col items-center animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4 border-4 border-emerald-50">
                        <span className="material-symbols-outlined text-5xl">check_circle</span>
                    </div>
                    <h2 className="text-2xl font-black text-stone-800 mb-6">ชำระเงินสำเร็จ!</h2>

                    <div className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-5 mb-6">
                        <div className="flex justify-between text-sm font-bold text-stone-600 mb-2"><span>ยอดรวมบิล</span><span>฿{netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between text-sm font-bold text-stone-600 mb-2"><span className="uppercase">ช่องทาง ({checkoutStep.replace('PAY_', '')})</span><span className="text-[#861b00] font-black">Success</span></div>
                        {selectedMember && (
                            <div className="flex justify-between text-sm font-bold text-stone-600 pt-2 border-t border-stone-200">
                                <span>ยอดคงเหลือ E-Wallet</span><span className="text-emerald-600">฿{(selectedMember.wallet || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                        <button onClick={() => { setCart([]); onClose(); }} className="w-full py-4 bg-[#2c2929] hover:bg-black text-white text-base font-black rounded-2xl shadow-md transition-all active:scale-95">
                            ปิด (ทำรายการใหม่)
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" onClick={onClose} />

            {/* 🔴🌟 MEMBER PIN FLOW OVERLAY (สำหรับตัดเงิน E-Wallet) */}
            {isMemberPinFlow && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 flex flex-col items-center text-center">

                        {/* Header & Icon */}
                        <div className="w-16 h-16 bg-stone-50 border border-stone-200 text-stone-600 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl">dialpad</span>
                        </div>
                        <h2 className="text-2xl font-black text-stone-800 mb-1">ยืนยันรหัส PIN ลูกค้า</h2>
                        <p className="text-stone-500 font-bold text-sm mb-1">รหัส PIN ของ {selectedMember?.name}</p>
                        <p className="text-stone-500 font-bold text-sm mb-6">ชำระเงิน <span className="text-[#861b00] font-black text-lg">฿{netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>

                        {/* PIN Display (6 dots) */}
                        <div className="w-full border-2 border-stone-200/80 bg-stone-50/50 rounded-2xl py-4 flex justify-center gap-3 mb-6 shadow-inner">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className={`w-4 h-4 rounded-full ${i < memberPin.length ? 'bg-stone-600' : 'bg-stone-200'}`}></div>
                            ))}
                        </div>

                        {/* Numpad */}
                        <div className="grid grid-cols-3 gap-2 w-full mb-6">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                <button key={num} onClick={() => handleMemberNumClick(num)} className="bg-stone-50 py-3 font-black text-xl rounded-xl active:scale-95 hover:bg-stone-100 text-stone-700">
                                    {num === 'DEL' ? <span className="material-symbols-outlined">backspace</span> : num}
                                </button>
                            ))}
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => { setIsMemberPinFlow(false); setMemberPin(''); }}
                                className="flex-1 py-4 bg-stone-50 text-stone-600 font-bold rounded-2xl hover:bg-stone-100 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleVerifyMemberPin}
                                disabled={memberPin.length < 6}
                                className={`flex-1 py-4 text-white font-black rounded-2xl transition-colors ${memberPin.length >= 6 ? 'bg-[#2c2929] hover:bg-black shadow-md' : 'bg-stone-300'}`}
                            >
                                ยืนยันชำระเงิน
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* 🔴🌟 TOP-UP FLOW OVERLAY */}
            {isTopupFlow && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm animate-in fade-in">

                    {/* STEP: PROMPT */}
                    {topupStep === 'PROMPT' && (
                        <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
                            <span className="material-symbols-outlined text-[80px] text-red-500 mb-4 opacity-90">error</span>
                            <h3 className="text-2xl font-black text-stone-800 mb-2">ยอดเงินไม่เพียงพอ!</h3>
                            <p className="text-stone-500 font-bold mb-6">ลูกค้ามียอด E-Wallet ฿{(selectedMember?.wallet || 0).toLocaleString()}<br />ขาดอีก <span className="text-red-500 font-black">฿{missingWalletAmount.toLocaleString()}</span></p>
                            <div className="flex flex-col gap-3">
                                <button onClick={() => setTopupStep('PIN')} className="w-full py-4 bg-[#52a675] text-white font-black rounded-2xl shadow-md active:scale-95">
                                    เติมเงิน E-Wallet
                                </button>
                                <button onClick={resetTopupFlow} className="w-full py-4 bg-stone-100 text-stone-600 font-bold rounded-2xl hover:bg-stone-200">
                                    ยกเลิก (เปลี่ยนวิธีจ่าย)
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP: PIN 6 หลัก (พนักงาน) */}
                    {topupStep === 'PIN' && (
                        <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 flex flex-col">
                            <div className="flex justify-between items-center mb-6 border-b border-stone-100 pb-4">
                                <h3 className="text-xl font-black text-stone-800">ยืนยันรหัสพนักงาน</h3>
                                <button onClick={resetTopupFlow} className="w-8 h-8 bg-stone-100 text-stone-500 rounded-full flex items-center justify-center"><span className="material-symbols-outlined text-sm">close</span></button>
                            </div>
                            <div className="flex justify-center mb-6 gap-3">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className={`w-5 h-5 rounded-full ${i < topupPin.length ? 'bg-[#861b00]' : 'bg-stone-200'}`}></div>
                                ))}
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                    <button key={num} onClick={() => handleTopupNumClick(num, 'PIN')} className="bg-stone-50 py-4 font-black text-xl rounded-xl active:scale-95 hover:bg-stone-100">
                                        {num === 'DEL' ? <span className="material-symbols-outlined">backspace</span> : num}
                                    </button>
                                ))}
                            </div>
                            <button onClick={handleVerifyPin} disabled={topupPin.length < 6} className={`w-full py-4 rounded-2xl font-black text-white ${topupPin.length >= 6 ? 'bg-[#861b00]' : 'bg-stone-300'}`}>
                                ตรวจสอบ
                            </button>
                        </div>
                    )}

                    {/* STEP: AMOUNT */}
                    {topupStep === 'AMOUNT' && (
                        <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 flex flex-col">
                            <div className="flex justify-between items-center mb-4 border-b border-stone-100 pb-4">
                                <h3 className="text-xl font-black text-[#52a675]">ระบุจำนวนเงิน (฿)</h3>
                                <button onClick={resetTopupFlow} className="w-8 h-8 bg-stone-100 text-stone-500 rounded-full flex items-center justify-center"><span className="material-symbols-outlined text-sm">close</span></button>
                            </div>
                            {missingWalletAmount > 0 && (
                                <button onClick={() => setTopupAmount(missingWalletAmount.toString())} className="mb-4 w-full bg-amber-50 border border-amber-200 text-amber-700 py-2.5 rounded-xl font-bold text-sm hover:bg-amber-100 transition-colors">
                                    เติมพอดีบิล (ขาด ฿{missingWalletAmount.toLocaleString()})
                                </button>
                            )}
                            <div className="border-2 border-[#52a675] bg-[#eef8f2] rounded-2xl p-4 text-center mb-4">
                                <span className="text-4xl font-black text-[#52a675]">{topupAmount || '0'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                    <button key={num} onClick={() => handleTopupNumClick(num, 'AMOUNT')} className="bg-stone-50 py-3 font-black text-xl rounded-xl active:scale-95 hover:bg-stone-100">
                                        {num === 'DEL' ? <span className="material-symbols-outlined">backspace</span> : num}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setTopupStep('METHOD')} disabled={!topupAmount || parseFloat(topupAmount) <= 0} className={`w-full py-4 rounded-2xl font-black text-white ${topupAmount ? 'bg-[#52a675]' : 'bg-stone-300'}`}>ดำเนินการต่อ</button>
                        </div>
                    )}

                    {/* STEP: METHOD */}
                    {topupStep === 'METHOD' && (
                        <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 flex flex-col text-center">
                            <h3 className="text-xl font-black text-stone-800 mb-2">เลือกวิธีรับเงิน</h3>
                            <p className="text-stone-500 font-bold mb-6">ยอดเติม: <span className="text-[#861b00] font-black text-lg">฿{parseFloat(topupAmount).toLocaleString()}</span></p>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <button onClick={() => setTopupStep('PAY_CASH')} className="bg-[#52a675] text-white py-6 rounded-[1.25rem] flex flex-col items-center gap-2 font-black shadow-md active:scale-95">
                                    <span className="material-symbols-outlined text-3xl">payments</span> เงินสด
                                </button>
                                <button onClick={() => setTopupStep('PAY_QR')} className="bg-[#4b7deb] text-white py-6 rounded-[1.25rem] flex flex-col items-center gap-2 font-black shadow-md active:scale-95">
                                    <span className="material-symbols-outlined text-3xl">qr_code_scanner</span> สแกน QR
                                </button>
                            </div>
                            <button onClick={() => setTopupStep('AMOUNT')} className="w-full py-3 bg-stone-100 text-stone-500 font-bold rounded-xl mt-2">ย้อนกลับ</button>
                        </div>
                    )}

                    {/* STEP: PAY_CASH (Topup) */}
                    {topupStep === 'PAY_CASH' && (
                        <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-black text-[#52a675]">รับเงินสด (เติมเงิน)</h3>
                                <button onClick={() => setTopupStep('METHOD')} className="w-8 h-8 bg-stone-100 text-stone-500 rounded-full flex items-center justify-center"><span className="material-symbols-outlined text-sm">arrow_back</span></button>
                            </div>
                            <p className="text-center font-bold text-stone-500 mb-2">ต้องรับเงิน <span className="text-[#861b00] font-black">฿{parseFloat(topupAmount).toLocaleString()}</span></p>
                            <div className="border-2 border-stone-200 bg-stone-50 rounded-2xl p-4 text-center mb-4">
                                <span className="text-3xl font-black text-stone-800">{topupReceivedAmount || '0'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                    <button key={num} onClick={() => handleTopupNumClick(num, 'RECEIVED')} className="bg-stone-50 py-3 font-black text-xl rounded-xl active:scale-95">
                                        {num === 'DEL' ? <span className="material-symbols-outlined">backspace</span> : num}
                                    </button>
                                ))}
                            </div>
                            {topupReceivedAmount && parseFloat(topupReceivedAmount) >= parseFloat(topupAmount) && (
                                <p className="text-center text-sm font-bold text-stone-600 mb-3">ทอนเงิน: ฿{(parseFloat(topupReceivedAmount) - parseFloat(topupAmount)).toLocaleString()}</p>
                            )}
                            <button onClick={() => handleExecuteTopup('CASH')} disabled={!topupReceivedAmount || parseFloat(topupReceivedAmount) < parseFloat(topupAmount)} className={`w-full py-4 rounded-2xl font-black text-white ${topupReceivedAmount && parseFloat(topupReceivedAmount) >= parseFloat(topupAmount) ? 'bg-[#52a675]' : 'bg-stone-300'}`}>ยืนยันการเติมเงิน</button>
                        </div>
                    )}

                    {/* STEP: PAY_QR (Topup) */}
                    {topupStep === 'PAY_QR' && (
                        <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 flex flex-col text-center">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-black text-[#4b7deb]">สแกน QR (เติมเงิน)</h3>
                                <button onClick={() => setTopupStep('METHOD')} className="w-8 h-8 bg-stone-100 text-stone-500 rounded-full flex items-center justify-center"><span className="material-symbols-outlined text-sm">arrow_back</span></button>
                            </div>
                            <div className="flex-1 flex flex-col items-center justify-center bg-stone-50 rounded-2xl py-8 mb-4 border border-stone-200">
                                <span className="material-symbols-outlined text-[100px] text-stone-300 mb-2">qr_code_2</span>
                                <p className="font-bold text-stone-500">สแกนจ่าย <span className="text-[#861b00] font-black text-xl">฿{parseFloat(topupAmount).toLocaleString()}</span></p>
                            </div>
                            <button onClick={() => handleExecuteTopup('QR')} className="w-full py-4 bg-[#4b7deb] text-white rounded-2xl font-black shadow-md active:scale-95">ดำเนินการเรียบร้อย</button>
                        </div>
                    )}

                    {/* STEP: SUCCESS (Topup) */}
                    {topupStep === 'SUCCESS' && (
                        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 flex flex-col items-center">
                            <div className="w-16 h-16 bg-[#eef8f2] text-[#52a675] rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-4xl">check</span>
                            </div>
                            <h2 className="text-2xl font-black text-stone-800 mb-1">เติมเงินสำเร็จ!</h2>
                            <p className="text-stone-400 font-bold text-xs mb-6 tracking-wide">สลิปชั่วคราว - การเติมเงิน</p>
                            <div className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-5 mb-6 text-sm font-bold text-stone-500 space-y-3">
                                <div className="flex justify-between"><span>รหัสอ้างอิง:</span><span className="text-stone-800">{topupReceipt?.id}</span></div>
                                <div className="flex justify-between"><span>ลูกค้า:</span><span className="text-stone-800">{selectedMember?.name}</span></div>
                                <div className="flex justify-between"><span>ช่องทาง:</span><span className="text-[#861b00] uppercase">{topupReceipt?.paymentMethod}</span></div>
                                <div className="border-t border-stone-200 border-dashed pt-3 mt-1 flex justify-between items-center">
                                    <span className="text-[#52a675] font-black">ยอดที่เติม:</span>
                                    <span className="text-[#52a675] font-black text-lg">฿{topupReceipt?.amount.toLocaleString()}</span>
                                </div>
                                <div className="bg-stone-200/50 p-2 rounded-lg flex justify-between items-center mt-2">
                                    <span>ยอดคงเหลือปัจจุบัน:</span>
                                    <span className="text-stone-800">฿{(selectedMember?.wallet || 0).toLocaleString()}</span>
                                </div>
                            </div>
                            <button onClick={resetTopupFlow} className="w-full py-4 bg-[#861b00] hover:bg-black text-white text-base font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95">
                                กลับไปชำระเงินต่อ <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* 🔴🌟 MAIN CHECKOUT MODAL (โครงสร้างหลัก) */}
            <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl w-full max-w-5xl h-full max-h-[85vh] md:max-h-[80vh] relative z-10 overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300">

                {/* 🧾 ฝั่งซ้าย: สรุปรายการ */}
                <div className="w-full md:w-5/12 bg-white p-6 md:p-8 flex flex-col z-20 h-full border-r border-stone-100">
                    <div className="flex justify-between items-start mb-4 shrink-0 border-b border-stone-100 pb-4">
                        <h3 className="font-black text-2xl text-stone-800 font-headline">สรุปรายการ</h3>
                        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-stone-100 text-stone-400 rounded-full hover:bg-stone-200 transition-colors"><span className="material-symbols-outlined">close</span></button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-3 space-y-4 no-scrollbar min-h-0">
                        {cart.map((item) => (
                            <div key={item.cartKey} className="flex justify-between items-start border-b border-stone-50 pb-3">
                                <div className="flex-1 min-w-0 pr-2">
                                    <h4 className="font-bold text-[13px] text-stone-800 leading-tight flex flex-wrap items-center gap-1.5">
                                        {item.name}
                                        <span className="text-[#861b00] font-black text-[11px] bg-[#861b00]/10 px-1.5 py-0.5 rounded-md inline-block">x{item.qty}</span>
                                    </h4>
                                    {item.options && <p className="text-[11px] text-stone-400 font-bold leading-snug mt-1.5 break-words">{item.options}</p>}
                                </div>
                                <p className="font-black text-base text-stone-800 shrink-0 mt-0.5">฿{(item.price * item.qty).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-4 shrink-0">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-stone-400 font-bold text-sm">ยอดรวมทั้งหมด</span>
                            <span className="text-3xl font-black text-[#861b00]">฿{subtotal.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* 💰 ฝั่งขวา: เปลี่ยนแปลงตาม Step */}
                <div className="w-full md:w-7/12 p-6 md:p-8 flex flex-col bg-white h-full">

                    {/* 🌟 STEP 1: SUMMARY */}
                    {checkoutStep === 'SUMMARY' && (
                        <div className="flex-1 flex flex-col animate-in slide-in-from-right-8 duration-300 min-h-0">
                            <h3 className="font-black text-xl text-[#861b00] mb-6 flex items-center gap-2 shrink-0">
                                <span className="material-symbols-outlined text-[24px]">receipt_long</span> สรุปบิลชำระเงิน
                            </h3>

                            <div className="space-y-4 mb-6 shrink-0">
                                {/* ส่วนผูกสมาชิก */}
                                {selectedMember ? (
                                    <div className="w-full bg-[#fdf8f5] border border-[#861b00]/20 p-4 rounded-[1.5rem] flex items-center justify-between shadow-sm animate-in zoom-in-95">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-[#861b00] text-white rounded-full flex items-center justify-center font-black text-xl shadow-inner">
                                                {selectedMember.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-black text-stone-800 text-base">{selectedMember.name}</span>
                                                <span className="text-xs text-stone-500 font-medium mt-0.5">ยอด E-Wallet: ฿{(selectedMember.wallet || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => { setSelectedMember(null); setAppliedCoupon(null); }} className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-white rounded-full transition-colors bg-stone-100/50 border border-stone-200/50">
                                            <span className="material-symbols-outlined text-[18px]">close</span>
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => setCheckoutStep('SELECT_MEMBER')} className="w-full bg-stone-100/50 text-stone-600 py-4 rounded-[1.5rem] font-bold flex items-center justify-center gap-2 hover:bg-stone-100 transition-colors text-sm">
                                        <span className="material-symbols-outlined text-[20px]">person_search</span> ผูกสมาชิก เพื่อรับส่วนลดและสะสมแต้ม
                                    </button>
                                )}

                                {/* ส่วนเลือกคูปอง */}
                                <div className="flex gap-3 bg-amber-50/30 border border-amber-200/60 p-2 rounded-[1.5rem]">
                                    <div className="bg-white flex-1 flex items-center gap-2 px-4 rounded-xl border border-amber-100 shadow-sm">
                                        <span className="material-symbols-outlined text-amber-500 text-[20px]">local_activity</span>
                                        <select value={selectedCouponId} onChange={(e) => setSelectedCouponId(e.target.value)} className="bg-transparent font-bold text-[13px] outline-none text-stone-700 w-full h-full py-3 appearance-none cursor-pointer">
                                            <option value="">-- เลือกคูปอง --</option>
                                            {marketing?.coupons?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <button onClick={handleApplyCoupon} className="bg-[#c27c2b] hover:bg-[#a66822] text-white px-6 rounded-xl font-bold shadow-sm active:scale-95 text-sm transition-colors">ใช้คูปอง</button>
                                </div>
                            </div>

                            {/* สรุปยอด */}
                            <div className="flex-1 flex flex-col justify-end min-h-0 pt-4">
                                <div className="space-y-3 mb-6 px-2">
                                    <div className="flex justify-between text-stone-500 font-bold text-sm"><p>ยอดรวม (Subtotal):</p><p>฿{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div>
                                    <div className="flex justify-between text-red-500 font-bold text-sm"><p>ส่วนลด (Discount):</p><p>-฿{discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div>
                                    <div className="flex justify-between text-stone-400 font-bold text-sm"><p>สินค้า (Before VAT):</p><p>฿{beforeVat.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div>
                                    <div className="flex justify-between text-stone-400 font-bold text-sm"><p>VAT (7%):</p><p>฿{vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div>
                                </div>
                                <div className="flex justify-between items-end border-t border-stone-100 pt-6 px-2">
                                    <p className="font-black text-stone-800 text-[15px]">ยอดสุทธิ (NET TOTAL)</p>
                                    <p className="text-5xl font-black text-[#861b00] tracking-tighter">฿{netTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>

                            {/* ปุ่มจ่าย (Dynamic UI) */}
                            <div className="mt-8 shrink-0">
                                {!selectedMember ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={() => setCheckoutStep('PAY_CASH')} className="bg-[#52a675] hover:bg-[#41875e] text-white py-5 rounded-[1.25rem] flex flex-col items-center gap-1.5 shadow-[0_8px_16px_-6px_rgba(82,166,117,0.4)] active:scale-95 transition-all"><span className="material-symbols-outlined text-[28px]">payments</span><span className="font-black text-sm uppercase tracking-wide">เงินสด</span></button>
                                        <button onClick={() => { setCheckoutStep('PAY_QR'); setReceivedAmount(netTotal.toString()); }} className="bg-[#4b7deb] hover:bg-[#3a65c4] text-white py-5 rounded-[1.25rem] flex flex-col items-center gap-1.5 shadow-[0_8px_16px_-6px_rgba(75,125,235,0.4)] active:scale-95 transition-all"><span className="material-symbols-outlined text-[28px]">qr_code_scanner</span><span className="font-black text-sm uppercase tracking-wide">สแกน QR</span></button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (selectedMember.wallet < netTotal) {
                                                alert('ยอดเงิน E-Wallet ไม่พอ กรุณาเติมเงินให้ลูกค้าครับ');
                                                // หรือจะเรียก setIsTopupFlow(true); ก็ได้ถ้าอยากให้เด้งถามเติมเงินทันที
                                            } else {
                                                // 🌟 เปิดหน้าต่างยืนยันรหัส PIN ของลูกค้า
                                                setIsMemberPinFlow(true);
                                                setMemberPin('');
                                            }
                                        }}
                                        className="w-full bg-[#2c2929] hover:bg-black text-white py-5 rounded-[1.25rem] flex flex-col items-center justify-center gap-1.5 shadow-[0_10px_20px_-8px_rgba(0,0,0,0.5)] active:scale-95 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[28px] text-amber-400">account_balance_wallet</span><span className="font-black text-[15px]">ชำระผ่าน E-Wallet</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 🌟 STEP 1.5: SELECT_MEMBER */}
                    {checkoutStep === 'SELECT_MEMBER' && (
                        <div className="flex-1 flex flex-col animate-in slide-in-from-right-8 duration-300 min-h-0">
                            <div className="flex justify-between items-center mb-6 shrink-0 border-b border-stone-100 pb-4">
                                <h3 className="font-black text-2xl text-[#861b00]">เลือกลูกค้า</h3>
                                <button onClick={() => setCheckoutStep('SUMMARY')} className="w-10 h-10 bg-stone-50 text-stone-500 rounded-full flex items-center justify-center hover:bg-stone-200 transition-colors"><span className="material-symbols-outlined text-[20px]">arrow_back</span></button>
                            </div>
                            <div className="relative mb-6 shrink-0">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-xl">search</span>
                                <input type="text" placeholder="พิมพ์ชื่อ, ชื่อเล่น หรือเบอร์โทร..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} autoFocus className="w-full bg-stone-50/50 border border-stone-200 p-4 pl-12 rounded-[1.25rem] outline-none focus:border-[#861b00] focus:bg-white font-bold text-sm text-stone-800 transition-all" />
                            </div>
                            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-1">
                                {members?.filter(m => (m.name && m.name.toLowerCase().includes(memberSearch.toLowerCase())) || (m.phone && m.phone.includes(memberSearch))).map(member => (
                                    <button key={member.id} onClick={() => { setSelectedMember(member); setCheckoutStep('SUMMARY'); }} className="w-full bg-stone-50/30 border border-stone-100 p-4 rounded-[1.25rem] flex items-center justify-between hover:bg-white hover:border-[#861b00]/30 hover:shadow-[0_4px_12px_-4px_rgba(134,27,0,0.1)] transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-stone-200/50 text-stone-600 rounded-full flex items-center justify-center font-black text-xl group-hover:bg-[#861b00] group-hover:text-white transition-colors">{member.name ? member.name.charAt(0).toUpperCase() : 'U'}</div>
                                            <div className="text-left"><p className="font-bold text-stone-800 text-base leading-tight">{member.name}</p><p className="text-xs text-stone-400 font-medium mt-0.5">{member.phone}</p></div>
                                        </div>
                                        <div className="border border-stone-200 px-3 py-1.5 rounded-lg text-[11px] font-bold text-stone-500 bg-white shadow-sm">{member.tier || 'Member'}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 🌟 STEP 2: PAY_CASH */}
                    {checkoutStep === 'PAY_CASH' && (
                        <div className="flex-1 flex flex-col animate-in slide-in-from-right-8 duration-300 min-h-0">
                            <div className="flex justify-between items-center mb-6 shrink-0 border-b border-stone-100 pb-4">
                                <h3 className="font-black text-2xl text-[#52a675]">รับชำระเงินสด</h3>
                                <button onClick={() => setCheckoutStep('SUMMARY')} className="w-10 h-10 bg-stone-50 text-stone-500 rounded-full flex items-center justify-center hover:bg-stone-200 transition-colors"><span className="material-symbols-outlined text-[20px]">arrow_back</span></button>
                            </div>
                            <div className="text-center mb-6 shrink-0">
                                <p className="text-stone-400 font-bold uppercase text-xs tracking-widest mb-1">ยอดสุทธิที่ต้องชำระ</p>
                                <p className="text-5xl font-black text-[#861b00] tracking-tighter">฿{netTotal.toLocaleString()}</p>
                            </div>
                            <div className="mb-6 shrink-0">
                                <p className="text-stone-500 font-bold text-center text-[13px] mb-2">รับเงินมา (บาท)</p>
                                <div className="border-2 border-[#52a675] bg-[#eef8f2] rounded-2xl flex items-center justify-center p-4 shadow-inner relative"><p className="text-4xl font-black text-[#52a675] tracking-wider flex items-center">{receivedAmount || '0'}<span className="w-[2px] h-8 bg-[#52a675] ml-1 animate-pulse"></span></p></div>
                            </div>
                            <div className="flex-1 flex flex-col gap-2 min-h-0 mb-6">
                                <div className="grid grid-cols-3 gap-3 flex-1 min-h-[150px]">
                                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((num) => (
                                        <button key={num} onClick={() => handleNumClick(num)} className="bg-stone-50 text-stone-700 font-black text-2xl rounded-[1.25rem] border border-stone-200/50 active:scale-95 transition-all hover:bg-stone-100">{num === 'DEL' ? <span className="material-symbols-outlined text-3xl">backspace</span> : num}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="shrink-0 flex flex-col gap-4">
                                <div className="flex justify-between items-center px-2"><span className="text-stone-400 font-bold text-sm">เงินทอน:</span><span className={`text-3xl font-black ${change < 0 ? 'text-stone-300' : 'text-stone-800'}`}>฿{change >= 0 ? change.toLocaleString() : '0.00'}</span></div>
                                <button onClick={() => handleCompleteSale('CASH')} className={`w-full py-5 text-white text-lg font-black rounded-[1.25rem] transition-all active:scale-95 flex items-center justify-center gap-2 ${(!receivedAmount || parseFloat(receivedAmount) < netTotal) ? 'bg-stone-300 shadow-none' : 'bg-[#52a675] hover:bg-[#41875e] shadow-[0_8px_16px_-6px_rgba(82,166,117,0.4)]'}`} disabled={!receivedAmount || parseFloat(receivedAmount) < netTotal}><span className="material-symbols-outlined text-[24px]">task_alt</span> ยืนยันชำระเงิน</button>
                            </div>
                        </div>
                    )}

                    {/* 🌟 STEP 3: PAY_QR */}
                    {checkoutStep === 'PAY_QR' && (
                        <div className="flex-1 flex flex-col animate-in slide-in-from-right-8 duration-300 min-h-0">
                            <div className="flex justify-between items-center mb-6 shrink-0 border-b border-stone-100 pb-4">
                                <h3 className="font-black text-2xl text-[#4b7deb]">สแกน QR Code</h3>
                                <button onClick={() => setCheckoutStep('SUMMARY')} className="w-10 h-10 bg-stone-50 text-stone-500 rounded-full flex items-center justify-center hover:bg-stone-200 transition-colors"><span className="material-symbols-outlined text-[20px]">arrow_back</span></button>
                            </div>
                            <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-stone-50/50 rounded-[2rem] border border-stone-100 mb-6 min-h-0">
                                <span className="material-symbols-outlined text-[120px] text-stone-200">qr_code_scanner</span>
                                <p className="text-stone-500 font-bold text-lg text-center">ให้ลูกค้าสแกนจ่ายยอด<br /><span className="text-[#861b00] font-black text-3xl mt-2 block">฿{netTotal.toLocaleString()}</span></p>
                            </div>
                            <button onClick={() => handleCompleteSale('QR')} className="w-full py-5 bg-[#4b7deb] hover:bg-[#3a65c4] text-white text-lg font-black rounded-[1.25rem] shadow-[0_8px_16px_-6px_rgba(75,125,235,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"><span className="material-symbols-outlined text-[24px]">task_alt</span> ยืนยันชำระเงิน</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}