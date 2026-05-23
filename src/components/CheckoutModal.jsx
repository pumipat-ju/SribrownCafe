import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { fetchJSON, triggerReceiptAndDrawer } from '../api.js';
import ReceiptPrintout from './ReceiptPrintout'; // 🌟 1. Import Shared Component เข้ามา

export default function CheckoutModal({ onClose }) {
    const { cart, setCart, transactions, setTransactions, currentEmployee, employees, members, setMembers, marketing, generateBillId } = useContext(AppContext);
    const [checkoutStep, setCheckoutStep] = useState('SUMMARY');
    const [isSuccess, setIsSuccess] = useState(false);
    const [completedTxn, setCompletedTxn] = useState(null);

    const [printType, setPrintType] = useState('SHORT');

    const [receivedAmount, setReceivedAmount] = useState('');
    const [memberSearch, setMemberSearch] = useState('');
    const [selectedMember, setSelectedMember] = useState(null);
    const [selectedCouponId, setSelectedCouponId] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [selectedPromotionId, setSelectedPromotionId] = useState('');
    const [appliedPromotion, setAppliedPromotion] = useState(null);

    const [authEmployee, setAuthEmployee] = useState(null);
    const [isTopupFlow, setIsTopupFlow] = useState(false);
    const [topupStep, setTopupStep] = useState('PROMPT');
    const [topupPin, setTopupPin] = useState('');
    const [topupAmount, setTopupAmount] = useState('');
    const [topupReceivedAmount, setTopupReceivedAmount] = useState('');
    const [topupReceipt, setTopupReceipt] = useState(null);

    const [isMemberPinFlow, setIsMemberPinFlow] = useState(false);
    const [memberPin, setMemberPin] = useState('');

    const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
    const [taxForm, setTaxForm] = useState({ name: '', taxId: '', branch: 'HQ', branchId: '', address: '' });
    const [isTaxSaved, setIsTaxSaved] = useState(false);

    const [qrImage, setQrImage] = useState(null);      
    const [qrStatus, setQrStatus] = useState('idle');  
    const [qrPollRef, setQrPollRef] = useState(null);  
    const [queueNumber, setQueueNumber] = useState('');
    const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);

    // 🔐 Employee PIN Modal — ยืนยันพนักงานก่อนทำรายการ
    const [empPinModal, setEmpPinModal] = useState({ isOpen: false, pendingMethod: null });
    const [empPin, setEmpPin] = useState('');
    const [empPinError, setEmpPinError] = useState('');
    const [empPinShake, setEmpPinShake] = useState(false);
    const [empPinSuccess, setEmpPinSuccess] = useState(null); // employee object เมื่อสำเร็จ

    // ==========================================
    // 🧮 ระบบคำนวณตัวเลข
    // ==========================================
    const subtotal = cart?.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 1)), 0) || 0;

    const getMemberTier = (points) => {
        if (!marketing?.tiers || !Array.isArray(marketing.tiers) || marketing.tiers.length === 0) return null;
        const sortedTiers = [...marketing.tiers].sort((a, b) => (b.minSpent || 0) - (a.minSpent || 0));
        return sortedTiers.find(t => points >= (t.minSpent || 0)) || null;
    };

    const isPromoActive = (promo) => {
        return promo?.active === 1 || promo?.active === true || promo?.active === '1';
    };

    const getItemCatId = (item) => {
        return item?.cat ?? item?.category_id ?? item?.category?.id ?? item?.category ?? null;
    };

    const isPromotionEligible = (promo) => {
        if (!promo || !isPromoActive(promo)) return false;

        // เฉพาะสมาชิก
        if (
            (promo.eligibleFor === 'member' || promo.eligibleFor === 'members') &&
            !selectedMember
        ) {
            return false;
        }

        const targetCategories = Array.isArray(promo.targetCategories)
            ? promo.targetCategories
            : [];

        const targetItems = Array.isArray(promo.targetItems)
            ? promo.targetItems
            : [];

        // ถ้าไม่ได้เลือกหมวด/สินค้า = ใช้ได้กับทุกสินค้า
        const matchedItems = cart.filter((item) => {
            const itemId = String(item.id);
            const itemCatId = String(getItemCatId(item));

            const matchItem =
                targetItems.length === 0 ||
                targetItems.map(String).includes(itemId);

            const matchCategory =
                targetCategories.length === 0 ||
                targetCategories.map(String).includes(itemCatId);

            return matchItem && matchCategory;
        });

        const matchedQty = matchedItems.reduce(
            (sum, item) => sum + Number(item.qty || 0),
            0
        );

        return matchedQty >= Number(promo.minQty || 1);
    };

    const calculatePromotionDiscount = (promo) => {
        if (!isPromotionEligible(promo)) return 0;

        const targetCategories = Array.isArray(promo.targetCategories)
            ? promo.targetCategories
            : [];

        const targetItems = Array.isArray(promo.targetItems)
            ? promo.targetItems
            : [];

        const matchedSubtotal = cart
            .filter((item) => {
                const itemId = String(item.id);
                const itemCatId = String(getItemCatId(item));

                const matchItem =
                    targetItems.length === 0 ||
                    targetItems.map(String).includes(itemId);

                const matchCategory =
                    targetCategories.length === 0 ||
                    targetCategories.map(String).includes(itemCatId);

                return matchItem && matchCategory;
            })
            .reduce((sum, item) => {
                return sum + Number(item.price || 0) * Number(item.qty || 1);
            }, 0);

        const value = Number(promo.discountValue || 0);

        if (promo.discountType === 'pct') {
            return matchedSubtotal * (value / 100);
        }

        // amt = ลดเป็นบาท
        return value;
    };

    let discount = 0;

    // คูปอง
    if (appliedCoupon) {
        const couponValue = Number(appliedCoupon.value || 0);

        if (appliedCoupon.type === 'fixed_discount') {
            discount += couponValue;
        } else if (
            appliedCoupon.type === 'percent_discount' ||
            appliedCoupon.type === 'percentage'
        ) {
            discount += subtotal * (couponValue / 100);
        } else if (appliedCoupon.type === 'free_drink') {
            const cheapestItem = [...cart].sort(
                (a, b) => Number(a.price || 0) - Number(b.price || 0)
            )[0];

            if (cheapestItem) {
                discount += Number(cheapestItem.price || 0);
            }
        }
    }

    // โปรโมชั่น
    if (appliedPromotion) {
        discount += calculatePromotionDiscount(appliedPromotion);
    }

    let appliedTierName = '';
    if (selectedMember) {
        const memberTier = getMemberTier(selectedMember.points || 0);
        if (memberTier && memberTier.discountPct > 0) {
            appliedTierName = memberTier.name;
            // คำนวณส่วนลดเบื้องต้นก่อน
            discount += (subtotal - discount) * (memberTier.discountPct / 100);
        }
    }
    discount = Math.min(discount, subtotal);

    // 🌟 1. คำนวณยอดสุทธิเบื้องต้น
    let rawNetTotal = subtotal - discount;

    // 🌟 2. สูตรสายใจป๋า: ปัดยอดสุทธิลงเป็น "จำนวนเต็มบาท" เสมอ (เช่น 139.50 ปัดลงเหลือ 139.00)
    const netTotal = Math.floor(rawNetTotal);

    // 🌟 3. ปรับยอดส่วนลดให้ตรงกับยอดสุทธิที่ปัดเศษแล้ว (เพื่อให้บัญชี Subtotal - Discount = Net Total เป๊ะๆ)
    discount = subtotal - netTotal;

    const beforeVat = (netTotal * 100) / 107;
    const vatAmount = netTotal - beforeVat;
    const change = receivedAmount ? parseFloat(receivedAmount) - netTotal : 0;
    const missingWalletAmount = selectedMember ? Math.max(0, netTotal - (selectedMember.wallet || 0)) : 0;

    // ==========================================
    // 🛠️ ฟังก์ชันต่างๆ
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
    
        const handleQRBack = () => {
        if (qrPollRef) clearInterval(qrPollRef);
        setQrImage(null);
        setQrStatus('idle');
        setQrPollRef(null);
        setCheckoutStep('SUMMARY');
    };
 
    const handleCreateQR = async () => {
        setQrStatus('loading');

        const tempOrderId = generateBillId('QR', transactions);

        try {
            const data = await fetchJSON('/payments/qr/create', {
                method: 'POST',
                body: JSON.stringify({
                    amount: netTotal,
                    order_id: tempOrderId
                })
            });

            setQrImage({
                src: data.qrCode,
                chargeId: data.chargeId
            });

            setQrStatus('ready');

            const poll = setInterval(async () => {
                const st = await fetchJSON(
                    `/payments/qr/status/${data.chargeId}`
                );

                if (st.status === 'PAID') {
                    clearInterval(poll);
                    setQrStatus('paid');
                    setTimeout(() => openEmpPin('QR'), 1000);
                }
            }, 3000);

            setQrPollRef(poll);

        } catch (e) {
            setQrStatus('error');
        }
    };

    const handleApplyPromotion = () => {
        if (!selectedPromotionId) {
            setAppliedPromotion(null);
            return;
        }

        const promo = marketing?.promotions?.find(
            (p) => String(p.id) === String(selectedPromotionId)
        );

        if (!promo) {
            alert('ไม่พบโปรโมชั่นนี้');
            return;
        }

        if (!isPromoActive(promo)) {
            alert('โปรโมชั่นนี้ถูกปิดใช้งานอยู่');
            return;
        }

        if (!isPromotionEligible(promo)) {
            alert('เงื่อนไขโปรโมชั่นยังไม่ครบ เช่น จำนวนขั้นต่ำ หมวดหมู่ หรือสิทธิ์สมาชิก');
            return;
        }

        setAppliedPromotion(promo);
    };

    // ==========================================
    // 🔐 Employee PIN helpers (ยืนยันพนักงานก่อนทำรายการ)
    // ==========================================
    const openEmpPin = (method) => {
        setEmpPin('');
        setEmpPinError('');
        setEmpPinShake(false);
        setEmpPinSuccess(null);
        setEmpPinModal({ isOpen: true, pendingMethod: method });
    };

    const closeEmpPin = () => {
        setEmpPinModal({ isOpen: false, pendingMethod: null });
        setEmpPin('');
        setEmpPinError('');
        setEmpPinSuccess(null);
    };

    const handleEmpPinDigit = (d) => {
        if (empPinSuccess) return;
        if (d === 'DEL') { setEmpPin(prev => prev.slice(0, -1)); return; }
        if (d === 'C') { setEmpPin(''); return; }
        if (empPin.length >= 6) return;
        const next = empPin + d;
        setEmpPin(next);
        if (next.length === 6) {
            const found = employees?.find(e => String(e.pin) === String(next));
            if (found) {
                setEmpPinSuccess(found);
                setEmpPinError('');
                const pendingMethod = empPinModal.pendingMethod;
                setTimeout(() => {
                    closeEmpPin();
                    if (pendingMethod && pendingMethod.startsWith('TOPUP_')) {
                        const actualMethod = pendingMethod.replace('TOPUP_', '');
                        setAuthEmployee(found);
                        handleExecuteTopup(actualMethod, found);
                    } else {
                        handleCompleteSale(pendingMethod, found);
                    }
                }, 800);
            } else {
                setEmpPinError('PIN ไม่ถูกต้อง กรุณาลองใหม่');
                setEmpPinShake(true);
                setTimeout(() => { setEmpPinShake(false); setEmpPin(''); }, 600);
            }
        }
    };

    const handleCompleteSale = async (method, verifiedEmployee) => {
        if (method === 'CASH' && (!receivedAmount || parseFloat(receivedAmount) < netTotal)) {
            return alert('กรุณาระบุเงินที่รับมาให้ครบถ้วน');
        }

        let newWalletBalance = selectedMember ? selectedMember.wallet : 0;

        if (method === 'EWALLET') {
            try {
                const newWallet = (selectedMember.wallet || 0) - netTotal;
                newWalletBalance = newWallet;
                const updated = await fetchJSON(`/members/${selectedMember.id}`, { method: 'PUT', body: JSON.stringify({ ...selectedMember, wallet: newWallet }) });
                setSelectedMember({ ...selectedMember, wallet: updated.wallet || newWallet });
            } catch (err) {
                newWalletBalance = (selectedMember.wallet || 0) - netTotal;
                setSelectedMember({ ...selectedMember, wallet: newWalletBalance });
            }
        }

        const now = new Date();
        const itemSummary = cart.map(item => `${item.name_th || item.name_en || item.name} x${item.qty}`).join(', ');
        const descText = selectedMember
            ? `ขายให้: ${selectedMember.name} (${itemSummary})`
            : `ขายทั่วไป: ${itemSummary}`;

        // 🌟 1. ดักจับ "ชื่อส่วนลด" ว่าลดเพราะคูปอง หรือ ลดเพราะระดับสมาชิก
        let appliedPromoName = '';

        const discountNames = [];

        if (appliedPromotion) {
            discountNames.push(`โปร ${appliedPromotion.name}`);
        }

        if (appliedCoupon) {
            discountNames.push(`คูปอง ${appliedCoupon.name}`);
        }

        if (appliedTierName) {
            discountNames.push(`ส่วนลดสมาชิกระดับ ${appliedTierName}`);
        }

        appliedPromoName = discountNames.join(', ');

        const transactionData = {
            bill_id: generateBillId('SALE', transactions),
            type: 'SALE',
            amount: netTotal,
            subtotal: subtotal,
            discount: discount,
            queueNumber: queueNumber, // 🌟 เพิ่มคิว
            promotionName: appliedPromotion?.name || appliedPromoName || null, // 🌟 2. แปะป้ายชื่อโปรโมชั่นเข้าไปในบิล!
            couponName: appliedCoupon?.name || null,
            beforeVat: beforeVat,
            vatAmount: vatAmount,
            paymentMethod: method,
            method: method,
            receivedAmount: method === 'CASH' ? parseFloat(receivedAmount) : netTotal,
            change: method === 'CASH' ? change : 0,
            date_raw: now.toISOString(),
            date: now.toLocaleDateString('th-TH'),
            time: now.toLocaleTimeString('th-TH').slice(0, 5) + ' น.',
            desc: descText,
            cashier: verifiedEmployee?.name || currentEmployee?.name || 'Staff',
            items: JSON.stringify(cart.map(item => ({
                ...item,
                name: item.name_th || item.name_en || item.name || 'ไม่ระบุ'
            })))
        };

        let dbTransaction = null;
        try {
            dbTransaction = await fetchJSON('/transactions/', {
                method: 'POST',
                body: JSON.stringify(transactionData)
            });
        } catch (e) {
            console.error("Failed to save transaction to DB:", e);
        }

        const newTransaction = {
            ...transactionData,
            id: dbTransaction?.id || Date.now(),
            items: cart,
            member: selectedMember ? { ...selectedMember, newWalletBalance } : null,
        };

        setTransactions(prev => [newTransaction, ...prev]);
        setCompletedTxn(newTransaction);
        setIsSuccess(true);

        // 🖨️ 🔓 สั่งพิมพ์ใบเสร็จและเปิดเก๊ะ (เฉพาะเงินสดที่เปิดเก๊ะ)
        triggerReceiptAndDrawer(method, newTransaction, cart);
    };
    
    const handleMemberNumClick = (num) => {
        if (num === 'C') setMemberPin('');
        else if (num === 'DEL') setMemberPin(prev => prev.slice(0, -1));
        else if (memberPin.length < 6) setMemberPin(prev => prev + num);
    };

    const handleVerifyMemberPin = () => {
        const validMemberPin = selectedMember?.pin ? String(selectedMember.pin) : null;
        if (!validMemberPin) return alert('ไม่พบ PIN ของสมาชิก กรุณาตรวจสอบข้อมูล');
        if (memberPin === validMemberPin) {
            setIsMemberPinFlow(false);
            setMemberPin('');
            handleCompleteSale('EWALLET');
        } else {
            alert('รหัส PIN ลูกค้าไม่ถูกต้องครับ!');
            setMemberPin('');
        }
    };

    const handleTopupNumClick = (num, target) => {
        const setter = target === 'PIN' ? setTopupPin : target === 'AMOUNT' ? setTopupAmount : setTopupReceivedAmount;
        if (num === 'C') setter('');
        else if (num === 'DEL') setter(prev => prev.slice(0, -1));
        else setter(prev => prev + num);
    };

    const handleVerifyPin = () => {
        // 🌟 ค้นหาพนักงานจากรหัส PIN
        const authEmp = employees?.find(emp => String(emp.pin) === String(topupPin));

        if (authEmp) {
            setAuthEmployee(authEmp); // 🌟 จำไว้ว่าใครมากดรหัส
            setTopupStep('AMOUNT');
            setTopupPin('');
        } else {
            alert('รหัส PIN ไม่ถูกต้อง!');
            setTopupPin('');
        }
    };

    const handleExecuteTopup = async (method, verifiedEmployee) => {
        const addAmount = parseFloat(topupAmount);
        const newWallet = (selectedMember.wallet || 0) + addAmount;
        const updatedMember = { ...selectedMember, wallet: newWallet };

        const resolvedEmployee = verifiedEmployee || authEmployee;

        const topupData = {
            bill_id: generateBillId('TOPUP', transactions),
            type: 'TOPUP',
            amount: addAmount,
            method: method,
            date_raw: new Date().toISOString(),
            desc: `เติมเงินให้: ${selectedMember.name}`,
            cashier: resolvedEmployee?.name || currentEmployee?.name || 'Staff'
        };

        try {
            await fetchJSON(`/members/${selectedMember.id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedMember)
            });

            const dbTxn = await fetchJSON('/transactions/', {
                method: 'POST',
                body: JSON.stringify(topupData)
            });

            setTransactions(prev => [{ ...topupData, id: dbTxn?.id || Date.now() }, ...prev]);

            setSelectedMember(updatedMember);

            const topupTxnForReceipt = {
                id: topupData.bill_id, // ใช้รหัสบิลที่เราเจนขึ้นมา
                bill_id: topupData.bill_id, // 🌟 เพิ่มบรรทัดนี้
                type: 'TOPUP',
                amount: addAmount,
                paymentMethod: method,
                timestamp: new Date(),
                date_raw: topupData.date_raw, // 🌟 เพิ่มบรรทัดนี้
                cashier: topupData.cashier,
                desc: topupData.desc // 🌟 เพิ่มบรรทัดนี้ (เช่น "เติมเงินให้: John")
            };
            setTopupReceipt(topupTxnForReceipt);
            setTopupStep('SUCCESS');

        } catch (e) {
            console.error("Topup record failed:", e);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
        }
    };

    const resetTopupFlow = () => {
        setIsTopupFlow(false);
        setTopupStep('PROMPT');
        setTopupPin('');
        setTopupAmount('');
        setTopupReceivedAmount('');
        setAuthEmployee(null); // 🌟 ล้างค่าพนักงานตอนปิดหน้าต่าง
    };

    // 🔴🌟 QUEUE NUMBER MODAL
    const QueueModal = () => (
        isQueueModalOpen && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm animate-in fade-in print:hidden">
                <div className="bg-white rounded-[2rem] p-6 w-full max-w-xs shadow-2xl animate-in zoom-in-95 flex flex-col items-center">
                    <h3 className="text-lg font-black text-stone-800 mb-4">ระบุคิวลูกค้า</h3>
                    <div className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl p-4 text-center text-3xl font-black text-stone-800 mb-6">
                        {queueNumber || '...'}
                    </div>
                    <div className="grid grid-cols-3 gap-2 w-full mb-6">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                            <button 
                                key={num} 
                                onClick={() => {
                                    if (num === 'C') setQueueNumber('');
                                    else if (num === 'DEL') setQueueNumber(prev => prev.slice(0, -1));
                                    else setQueueNumber(prev => prev + num);
                                }} 
                                className="bg-stone-100 py-3 font-black text-xl rounded-xl active:scale-95 hover:bg-stone-200 text-stone-700"
                            >
                                {num === 'DEL' ? <span className="material-symbols-outlined">backspace</span> : num}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setIsQueueModalOpen(false)} className="w-full py-3 bg-[#861b00] text-white font-black rounded-xl hover:bg-black transition-colors">ตกลง</button>
                </div>
            </div>
        )
    );

    // ==========================================
    // 🌟 หน้าจอ SUCCESS (ใบเสร็จ & ระบบปริ้นท์สลิป 80mm)
    // ==========================================
    if (isSuccess && !isTopupFlow && !isMemberPinFlow && completedTxn) {
        return (
            <>
                {/* 🌟 2. ใช้ Component กลางแทนโค้ดใบเสร็จเดิมที่ยาวเหยียด */}
                <ReceiptPrintout txn={completedTxn} printType={printType} taxForm={taxForm} />

                {/* ========================================== */}
                {/* 🖥️ หน้าจอแสดงผลปกติ (ซ่อนตอนปริ้นท์) */}
                {/* ========================================== */}
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-in fade-in print:hidden">

                    {!isTaxModalOpen && (
                        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl relative z-10 animate-in zoom-in-95 flex flex-col">

                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-[#eef8f2] text-[#52a675] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-4xl">check_circle</span>
                                </div>
                                <h2 className="text-2xl font-black text-stone-800">ชำระเงินสำเร็จ!</h2>
                            </div>

                            <div className="bg-stone-50/50 border border-stone-200 rounded-2xl p-5 mb-6 relative max-h-[40vh] overflow-y-auto no-scrollbar">
                                <p className="text-[10px] font-bold text-stone-400 mb-3 uppercase tracking-wider">รายการสินค้า</p>
                                <div className="space-y-3">
                                    {completedTxn.items?.map(item => (
                                        <div key={item.cartKey} className="flex flex-col">
                                            <div className="flex justify-between font-black text-stone-700 text-[13px]">
                                                <span>{item.qty}x {item.name_th || item.name_en || item.name}</span>
                                                <span>฿{(item.price * item.qty).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            {item.options && (
                                                <span className="text-[11px] text-stone-400 font-medium ml-5">-{item.options}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="border-b border-stone-200 border-dashed my-4"></div>

                                <p className="text-[10px] font-bold text-stone-400 mb-3 uppercase tracking-wider">ภาษีและส่วนลด</p>
                                <div className="space-y-1.5 text-[13px] font-bold text-stone-500">
                                    <div className="flex justify-between"><span>ราคาสินค้า</span><span>฿{completedTxn.beforeVat?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                    <div className="flex justify-between"><span>VAT 7%</span><span>฿{completedTxn.vatAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                    {completedTxn.discount > 0 && <div className="flex justify-between text-red-500"><span>ส่วนลด (Discount)</span><span>-฿{completedTxn.discount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                                </div>

                                <div className="border-b border-stone-200 border-dashed my-4"></div>

                                <div className="flex justify-between items-end text-[#861b00]">
                                    <span className="text-2xl font-black">Total</span>
                                    <span className="text-[28px] font-black tracking-tight">฿{completedTxn.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>

                                {completedTxn.paymentMethod === 'EWALLET' && completedTxn.member && (
                                    <div className="mt-4 pt-3 border-t border-stone-200/50 flex justify-between items-center text-xs font-bold text-stone-500">
                                        <span>ยอดคงเหลือ E-Wallet:</span>
                                        <span className="text-emerald-600 text-sm font-black">฿{completedTxn.member.newWalletBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}

                                {isTaxSaved && (
                                    <>
                                        <div className="border-b border-stone-200 border-dashed my-4"></div>
                                        <p className="text-[10px] font-bold text-[#861b00] mb-2 uppercase tracking-wider">พรีวิว: ใบกำกับภาษีเต็มรูป</p>
                                        <div className="space-y-1 text-xs font-bold text-stone-600 bg-white p-3 rounded-xl border border-stone-100">
                                            <p><span className="text-stone-400 font-medium">ชื่อ:</span> {taxForm.name}</p>
                                            <p><span className="text-stone-400 font-medium">ผู้เสียภาษี:</span> {taxForm.taxId}</p>
                                            <p><span className="text-stone-400 font-medium">สาขา:</span> {taxForm.branch === 'HQ' ? 'สำนักงานใหญ่' : `สาขา ${taxForm.branchId}`}</p>
                                            <p className="truncate"><span className="text-stone-400 font-medium">ที่อยู่:</span> {taxForm.address}</p>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="space-y-3 mb-6 px-2">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-stone-600 font-bold text-sm"><span className="material-symbols-outlined text-[18px]">receipt_long</span> ออเดอร์บาร์</div>
                                    <div className="flex items-center gap-1 text-[#52a675] bg-[#eef8f2] border border-[#52a675]/30 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide"><span className="material-symbols-outlined text-[14px]">check_circle</span> Success</div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-stone-600 font-bold text-sm"><span className="material-symbols-outlined text-[18px]">request_quote</span> ใบกำกับภาษี</div>
                                    {isTaxSaved ? (
                                        <div className="flex items-center gap-1 text-[#52a675] bg-[#eef8f2] border border-[#52a675]/30 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide"><span className="material-symbols-outlined text-[14px]">check_circle</span> Success</div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-stone-400 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide"><span className="material-symbols-outlined text-[14px]">pending</span> Pending</div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button onClick={() => { setCart([]); onClose(); }} className="w-full py-4 bg-[#2c2929] hover:bg-black text-white text-sm font-black rounded-[1.25rem] shadow-md transition-all flex items-center justify-center gap-2 active:scale-95">ปิด (ทำรายการใหม่)</button>
                                <button onClick={() => { setTimeout(() => window.print(), 100); }} className="w-full py-4 bg-[#fdf8f5] border border-[#861b00]/20 hover:bg-[#861b00]/10 text-[#861b00] text-sm font-black rounded-[1.25rem] transition-all flex items-center justify-center gap-2 active:scale-95">
                                    <span className="material-symbols-outlined text-[20px]">print</span> พิมพ์ใบเสร็จ {isTaxSaved ? '(เต็มรูป)' : '(อย่างย่อ)'}
                                </button>
                                <button onClick={() => setIsTaxModalOpen(true)} className="w-full py-3.5 bg-white border-2 border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300 hover:text-stone-800 text-sm font-bold rounded-[1.25rem] transition-all flex items-center justify-center gap-2 active:scale-95">
                                    <span className="material-symbols-outlined text-[20px]">{isTaxSaved ? 'edit_document' : 'request_quote'}</span>
                                    {isTaxSaved ? 'แก้ไขข้อมูลใบกำกับภาษี' : 'ออกใบกำกับภาษีเต็มรูป'}
                                </button>
                            </div>
                        </div>
                    )}

                    {isTaxModalOpen && (
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            setIsTaxSaved(true);
                            setPrintType('FULL');
                            setIsTaxModalOpen(false);
                        }} className="bg-white rounded-[2.5rem] p-6 sm:p-8 w-full max-w-md shadow-2xl relative z-10 animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-6 border-b border-stone-100 pb-4">
                                <h3 className="font-black text-xl text-[#861b00] flex items-center gap-2"><span className="material-symbols-outlined text-[24px]">description</span> ข้อมูลใบกำกับภาษี</h3>
                                <button type="button" onClick={() => setIsTaxModalOpen(false)} className="w-8 h-8 bg-stone-100 text-stone-500 rounded-full flex items-center justify-center hover:bg-stone-200"><span className="material-symbols-outlined text-sm">close</span></button>
                            </div>

                            <div className="space-y-4 max-h-[50vh] overflow-y-auto no-scrollbar pr-2 pb-2">
                                <div><label className="text-[11px] font-bold text-stone-500 mb-1 block uppercase tracking-wider">ชื่อลูกค้า / นิติบุคคล <span className="text-red-500">*</span></label><input required autoFocus value={taxForm.name} onChange={e => setTaxForm({ ...taxForm, name: e.target.value })} className="w-full p-3.5 border-2 border-stone-200 bg-stone-50 rounded-xl font-bold text-stone-800 outline-none focus:border-[#861b00] focus:bg-white transition-colors" placeholder="บริษัท ... จำกัด หรือ ชื่อ-นามสกุล" /></div>
                                <div><label className="text-[11px] font-bold text-stone-500 mb-1 block uppercase tracking-wider">เลขประจำตัวผู้เสียภาษี (13 หลัก) <span className="text-red-500">*</span></label><input required maxLength="13" value={taxForm.taxId} onChange={e => setTaxForm({ ...taxForm, taxId: e.target.value.replace(/\D/g, '') })} className="w-full p-3.5 border-2 border-stone-200 bg-stone-50 rounded-xl font-bold text-stone-800 outline-none focus:border-[#861b00] focus:bg-white transition-colors" placeholder="0123456789012" /></div>
                                <div><label className="text-[11px] font-bold text-stone-500 mb-2 block uppercase tracking-wider">สาขาสถานประกอบการ <span className="text-red-500">*</span></label><input required maxLength="5" value={taxForm.branchId} onChange={e => setTaxForm({ ...taxForm, branchId: e.target.value.replace(/\D/g, '') })} className="w-full p-3.5 border-2 border-stone-200 bg-stone-50 rounded-xl font-bold text-stone-800 outline-none focus:border-[#861b00] focus:bg-white transition-colors" placeholder="00001" />
                                    <div className="flex gap-4 p-3 bg-stone-50 border border-stone-200 rounded-xl">
                                        <label className="flex items-center gap-2 text-sm font-bold text-stone-700 cursor-pointer"><input type="radio" name="branch" value="HQ" checked={taxForm.branch === 'HQ'} onChange={() => setTaxForm({ ...taxForm, branch: 'HQ' })} className="text-[#861b00] focus:ring-[#861b00] w-4 h-4" /> สำนักงานใหญ่</label>
                                        <label className="flex items-center gap-2 text-sm font-bold text-stone-700 cursor-pointer"><input type="radio" name="branch" value="BRANCH" checked={taxForm.branch === 'BRANCH'} onChange={() => setTaxForm({ ...taxForm, branch: 'BRANCH' })} className="text-[#861b00] focus:ring-[#861b00] w-4 h-4" /> สาขา</label>
                                    </div>
                                </div>
                                {taxForm.branch === 'BRANCH' && (
                                    <div className="animate-in slide-in-from-top-2"><label className="text-[11px] font-bold text-stone-500 mb-1 block uppercase tracking-wider">ระบุรหัสสาขา (5 หลัก) <span className="text-red-500">*</span></label><input required maxLength="5" value={taxForm.branchId} onChange={e => setTaxForm({ ...taxForm, branchId: e.target.value.replace(/\D/g, '') })} className="w-full p-3.5 border-2 border-stone-200 bg-stone-50 rounded-xl font-bold text-stone-800 outline-none focus:border-[#861b00] focus:bg-white transition-colors" placeholder="00001" /></div>
                                )}
                                <div><label className="text-[11px] font-bold text-stone-500 mb-1 block uppercase tracking-wider">ที่อยู่ตาม ภ.พ.20 หรือบัตรประชาชน <span className="text-red-500">*</span></label><textarea required value={taxForm.address} onChange={e => setTaxForm({ ...taxForm, address: e.target.value })} rows="3" className="w-full p-3.5 border-2 border-stone-200 bg-stone-50 rounded-xl font-bold text-stone-800 outline-none focus:border-[#861b00] focus:bg-white transition-colors resize-none" placeholder="ระบุที่อยู่ครบถ้วน..."></textarea></div>
                            </div>

                            <div className="mt-6 pt-4 flex gap-3 border-t border-stone-100">
                                <button type="button" onClick={() => setIsTaxModalOpen(false)} className="flex-1 py-4 bg-stone-100 text-stone-600 font-bold rounded-2xl hover:bg-stone-200 transition-colors">ยกเลิก</button>
                                <button type="submit" className="flex-[2] py-4 bg-[#861b00] text-white font-black rounded-2xl shadow-md hover:bg-black active:scale-95 transition-all">บันทึกข้อมูล</button>
                            </div>
                        </form>
                    )}
                </div>
            </>
        );
    }
    // 🌟 ส่วนที่ทำให้พิมพ์ใบเสร็จเติมเงินได้สวยงามและไม่ขาว (Early Return)
    if (isTopupFlow && topupStep === 'SUCCESS' && topupReceipt) {
        return (
            <>
                {/* 🖨️ 1. เรียกใช้ Component ใบเสร็จมาตรฐาน (ตัวจัดการความสวยงามอยู่ที่นี่) */}
                <ReceiptPrintout txn={topupReceipt} />

                {/* 🖥️ 2. ส่วนแสดงผลบนหน้าจอคอมพิวเตอร์ (ซ่อนตอนพิมพ์) */}
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in print:hidden">
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

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => { setTimeout(() => window.print(), 300); }}
                                className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm font-black rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[20px]">print</span> พิมพ์สลิป
                            </button>
                            <button
                                onClick={() => { resetTopupFlow(); setTimeout(() => { if (selectedMember && selectedMember.wallet >= netTotal) { setIsMemberPinFlow(true); setMemberPin(''); } }, 100); }}
                                className="flex-[2] py-4 bg-[#861b00] hover:bg-black text-white text-sm font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-1 active:scale-95"
                            >
                                ชำระเงินต่อ <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }
    return (
        <>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 print:hidden">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" onClick={onClose} />
            <QueueModal />
            <QueueModal />

            {/* 🔴🌟 MEMBER PIN FLOW OVERLAY (สำหรับตัดเงิน E-Wallet) */}
            {isMemberPinFlow && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 w-full max-sm shadow-2xl animate-in zoom-in-95 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-stone-50 border border-stone-200 text-stone-600 rounded-full flex items-center justify-center mb-4"><span className="material-symbols-outlined text-3xl">dialpad</span></div>
                        <h2 className="text-2xl font-black text-stone-800 mb-1">ยืนยันรหัส PIN ลูกค้า</h2>
                        <p className="text-stone-500 font-bold text-sm mb-1">รหัส PIN ของ {selectedMember?.name}</p>
                        <p className="text-stone-500 font-bold text-sm mb-6">ชำระเงิน <span className="text-[#861b00] font-black text-lg">฿{netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>

                        <div className="w-full border-2 border-stone-200/80 bg-stone-50/50 rounded-2xl py-4 flex justify-center gap-3 mb-6 shadow-inner">
                            {[...Array(6)].map((_, i) => (<div key={i} className={`w-4 h-4 rounded-full ${i < memberPin.length ? 'bg-stone-600' : 'bg-stone-200'}`}></div>))}
                        </div>

                        <div className="grid grid-cols-3 gap-2 w-full mb-6">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                <button key={num} onClick={() => handleMemberNumClick(num)} className="bg-stone-50 py-3 font-black text-xl rounded-xl active:scale-95 hover:bg-stone-100 text-stone-700">{num === 'DEL' ? <span className="material-symbols-outlined">backspace</span> : num}</button>
                            ))}
                        </div>

                        <div className="flex gap-3 w-full">
                            <button onClick={() => { setIsMemberPinFlow(false); setMemberPin(''); }} className="flex-1 py-4 bg-stone-50 text-stone-600 font-bold rounded-2xl hover:bg-stone-100 transition-colors">ยกเลิก</button>
                            <button onClick={handleVerifyMemberPin} disabled={memberPin.length < 6} className={`flex-1 py-4 text-white font-black rounded-2xl transition-colors ${memberPin.length >= 6 ? 'bg-[#2c2929] hover:bg-black shadow-md' : 'bg-stone-300'}`}>ยืนยันชำระเงิน</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🔴🌟 TOP-UP FLOW OVERLAY */}
            {isTopupFlow && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm animate-in fade-in">
                    {topupStep === 'PROMPT' && (
                        <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
                            <span className="material-symbols-outlined text-[80px] text-red-500 mb-4 opacity-90">error</span>
                            <h3 className="text-2xl font-black text-stone-800 mb-2">ยอดเงินไม่เพียงพอ!</h3>
                            <p className="text-stone-500 font-bold mb-6">ลูกค้ามียอด E-Wallet ฿{(selectedMember?.wallet || 0).toLocaleString()}<br />ขาดอีก <span className="text-red-500 font-black">฿{missingWalletAmount.toLocaleString()}</span></p>
                            <div className="flex flex-col gap-3">
                                <button onClick={() => setTopupStep('AMOUNT')} className="w-full py-4 bg-[#52a675] text-white font-black rounded-2xl shadow-md active:scale-95">เติมเงิน E-Wallet</button>
                                <button onClick={resetTopupFlow} className="w-full py-4 bg-stone-100 text-stone-600 font-bold rounded-2xl hover:bg-stone-200">ยกเลิก (เปลี่ยนวิธีจ่าย)</button>
                            </div>
                        </div>
                    )}
                    {topupStep === 'AMOUNT' && (
                        <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 flex flex-col">
                            <div className="flex justify-between items-center mb-4 border-b border-stone-100 pb-4">
                                <h3 className="text-xl font-black text-[#52a675]">ระบุจำนวนเงิน (฿)</h3>
                                <button onClick={resetTopupFlow} className="w-8 h-8 bg-stone-100 text-stone-500 rounded-full flex items-center justify-center"><span className="material-symbols-outlined text-sm">close</span></button>
                            </div>
                            {missingWalletAmount > 0 && <button onClick={() => setTopupAmount(missingWalletAmount.toString())} className="mb-4 w-full bg-amber-50 border border-amber-200 text-amber-700 py-2.5 rounded-xl font-bold text-sm hover:bg-amber-100 transition-colors">เติมพอดีบิล (ขาด ฿{missingWalletAmount.toLocaleString()})</button>}
                            <div className="border-2 border-[#52a675] bg-[#eef8f2] rounded-2xl p-4 text-center mb-4">
                                <span className="text-4xl font-black text-[#52a675]">{topupAmount || '0'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                    <button key={num} onClick={() => handleTopupNumClick(num, 'AMOUNT')} className="bg-stone-50 py-3 font-black text-xl rounded-xl active:scale-95 hover:bg-stone-100">{num === 'DEL' ? <span className="material-symbols-outlined">backspace</span> : num}</button>
                                ))}
                            </div>
                            <button onClick={() => setTopupStep('METHOD')} disabled={!topupAmount || parseFloat(topupAmount) <= 0} className={`w-full py-4 rounded-2xl font-black text-white ${topupAmount ? 'bg-[#52a675]' : 'bg-stone-300'}`}>ดำเนินการต่อ</button>
                        </div>
                    )}
                    {topupStep === 'METHOD' && (
                        <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 flex flex-col text-center">
                            <h3 className="text-xl font-black text-stone-800 mb-2">เลือกวิธีรับเงิน</h3>
                            <p className="text-stone-500 font-bold mb-6">ยอดเติม: <span className="text-[#861b00] font-black text-lg">฿{parseFloat(topupAmount).toLocaleString()}</span></p>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <button onClick={() => setTopupStep('PAY_CASH')} className="bg-[#52a675] text-white py-6 rounded-[1.25rem] flex flex-col items-center gap-2 font-black shadow-md active:scale-95"><span className="material-symbols-outlined text-3xl">payments</span> เงินสด</button>
                                <button onClick={() => setTopupStep('PAY_QR')} className="bg-[#4b7deb] text-white py-6 rounded-[1.25rem] flex flex-col items-center gap-2 font-black shadow-md active:scale-95"><span className="material-symbols-outlined text-3xl">qr_code_scanner</span> สแกน QR</button>
                            </div>
                            <button onClick={() => setTopupStep('AMOUNT')} className="w-full py-3 bg-stone-100 text-stone-500 font-bold rounded-xl mt-2">ย้อนกลับ</button>
                        </div>
                    )}
                    {topupStep === 'PAY_CASH' && (
                        <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-black text-[#52a675]">รับเงินสด (เติมเงิน)</h3>
                                <button onClick={() => setTopupStep('METHOD')} className="w-8 h-8 bg-stone-100 text-stone-500 rounded-full flex items-center justify-center"><span className="material-symbols-outlined text-sm">arrow_back</span></button>
                            </div>
                            <p className="text-center font-bold text-stone-500 mb-2">ต้องรับเงิน <span className="text-[#861b00] font-black">฿{parseFloat(topupAmount).toLocaleString()}</span></p>
                            <div className="border-2 border-stone-200 bg-stone-50 rounded-2xl p-4 text-center mb-4"><span className="text-3xl font-black text-stone-800">{topupReceivedAmount || '0'}</span></div>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                    <button key={num} onClick={() => handleTopupNumClick(num, 'RECEIVED')} className="bg-stone-50 py-3 font-black text-xl rounded-xl active:scale-95">{num === 'DEL' ? <span className="material-symbols-outlined">backspace</span> : num}</button>
                                ))}
                            </div>
                            {topupReceivedAmount && parseFloat(topupReceivedAmount) >= parseFloat(topupAmount) && <p className="text-center text-sm font-bold text-stone-600 mb-3">ทอนเงิน: ฿{(parseFloat(topupReceivedAmount) - parseFloat(topupAmount)).toLocaleString()}</p>}
                            <button onClick={() => { if (!topupReceivedAmount || parseFloat(topupReceivedAmount) < parseFloat(topupAmount)) return; openEmpPin('TOPUP_CASH'); }} disabled={!topupReceivedAmount || parseFloat(topupReceivedAmount) < parseFloat(topupAmount)} className={`w-full py-4 rounded-2xl font-black text-white ${topupReceivedAmount && parseFloat(topupReceivedAmount) >= parseFloat(topupAmount) ? 'bg-[#52a675]' : 'bg-stone-300'}`}>ยืนยันการเติมเงิน</button>
                        </div>
                    )}
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
                            <button onClick={() => openEmpPin('TOPUP_QR')} className="w-full py-4 bg-[#4b7deb] text-white rounded-2xl font-black shadow-md active:scale-95">ดำเนินการเรียบร้อย</button>
                        </div>
                    )}
                    {topupStep === 'SUCCESS' && (
                        <>
                            {/* 🌟 1. เพิ่มคลาส print:hidden ที่ตัว Modal */}
                            <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 flex flex-col items-center print:hidden">
                                <div className="w-16 h-16 bg-[#eef8f2] text-[#52a675] rounded-full flex items-center justify-center mb-4"><span className="material-symbols-outlined text-4xl">check</span></div>
                                <h2 className="text-2xl font-black text-stone-800 mb-1">เติมเงินสำเร็จ!</h2>
                                <p className="text-stone-400 font-bold text-xs mb-6 tracking-wide">สลิปชั่วคราว - การเติมเงิน</p>

                                <div className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-5 mb-6 text-sm font-bold text-stone-500 space-y-3">
                                    <div className="flex justify-between"><span>รหัสอ้างอิง:</span><span className="text-stone-800">{topupReceipt?.id}</span></div>
                                    <div className="flex justify-between"><span>ลูกค้า:</span><span className="text-stone-800">{selectedMember?.name}</span></div>
                                    <div className="flex justify-between"><span>ช่องทาง:</span><span className="text-[#861b00] uppercase">{topupReceipt?.paymentMethod}</span></div>
                                    <div className="border-t border-stone-200 border-dashed pt-3 mt-1 flex justify-between items-center"><span className="text-[#52a675] font-black">ยอดที่เติม:</span><span className="text-[#52a675] font-black text-lg">฿{topupReceipt?.amount.toLocaleString()}</span></div>
                                    <div className="bg-stone-200/50 p-2 rounded-lg flex justify-between items-center mt-2"><span>ยอดคงเหลือปัจจุบัน:</span><span className="text-stone-800">฿{(selectedMember?.wallet || 0).toLocaleString()}</span></div>
                                </div>
                                {/* 🌟 2. แบ่งเป็น 2 ปุ่ม: พิมพ์สลิป และ ชำระเงินต่อ */}
                                <div className="flex gap-3 w-full">
                                    {/* เปลี่ยนปุ่มพิมพ์สลิปในหน้า Success ของการเติมเงิน */}
                                    <button
                                        onClick={() => {
                                            // 🌟 ใส่ Delay 300ms เพื่อให้ Component ReceiptPrintout เรนเดอร์ให้เสร็จก่อน
                                            setTimeout(() => window.print(), 300);
                                        }}
                                        className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm font-black rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">print</span> พิมพ์สลิป
                                    </button>
                                    <button onClick={() => { resetTopupFlow(); setTimeout(() => { if (selectedMember && selectedMember.wallet >= netTotal) { setIsMemberPinFlow(true); setMemberPin(''); } }, 100); }} className="flex-[2] py-4 bg-[#861b00] hover:bg-black text-white text-sm font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-1 active:scale-95">
                                        ชำระเงินต่อ <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                            {/* 🌟 3. เรียกใช้ Component ใบเสร็จ (มันจะล่องหนอยู่ รอเครื่องปริ้นท์ดึงไปพิมพ์) */}
                            <ReceiptPrintout txn={topupReceipt} />
                        </>
                    )}
                </div>
            )}

            {/* 🔴🌟 MAIN CHECKOUT MODAL (โครงสร้างหลัก) */}
            <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl w-full max-w-5xl h-full max-h-[85vh] md:max-h-[80vh] relative z-10 overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300">

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
                                        {item.name_th || item.name_en || item.name}
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

                <div className="w-full md:w-7/12 p-6 md:p-8 flex flex-col bg-white h-full">
                    {checkoutStep === 'SUMMARY' && (
                        <div className="flex-1 flex flex-col animate-in slide-in-from-right-8 duration-300 min-h-0">
                            <h3 className="font-black text-xl text-[#861b00] mb-6 flex items-center gap-2 shrink-0">
                                <span className="material-symbols-outlined text-[24px]">receipt_long</span> สรุปบิลชำระเงิน
                            </h3>

                            <div className="space-y-4 mb-6 shrink-0">
                                {selectedMember ? (
                                    <div className="w-full bg-[#fdf8f5] border-2 border-[#861b00]/20 p-4 rounded-[1.25rem] flex items-center justify-between shadow-sm animate-in zoom-in-95">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-[#861b00] text-white rounded-full flex items-center justify-center font-black text-xl shadow-inner">
                                                {String(selectedMember.name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-stone-800 text-base">{selectedMember.name}</span>
                                                    {appliedTierName && <span className="bg-[#861b00] text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{appliedTierName}</span>}
                                                </div>
                                                <span className="text-xs text-stone-500 font-medium mt-0.5">ยอด E-Wallet: ฿{(selectedMember.wallet || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => { setSelectedMember(null); setAppliedCoupon(null); }} className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors border border-transparent hover:border-red-100">
                                            <span className="material-symbols-outlined text-[18px]">close</span>
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => setCheckoutStep('SELECT_MEMBER')} className="w-full bg-blue-600 border-2 border-blue-600 text-white py-3.5 rounded-[1.25rem] font-black flex items-center justify-center gap-2 hover:bg-blue-700 hover:border-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95 group">
                                        <span className="material-symbols-outlined text-[24px] text-white group-hover:scale-110 transition-transform">person_add</span> ผูกสมาชิก เพื่อรับส่วนลดและสะสมแต้ม
                                    </button>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white flex items-center gap-2 px-3 rounded-2xl border border-amber-200 shadow-sm">
                                        <span className="material-symbols-outlined text-amber-500 text-[18px]">local_activity</span>
                                        <select 
                                            value={selectedCouponId} 
                                            onChange={(e) => { 
                                                const val = e.target.value; 
                                                setSelectedCouponId(val); 
                                                if (!val) setAppliedCoupon(null); 
                                                else { 
                                                    const coupon = marketing?.coupons?.find(c => String(c.id) === String(val)); 
                                                    setAppliedCoupon(coupon || null); 
                                                } 
                                            }} 
                                            className="bg-transparent font-bold text-[11px] outline-none text-stone-700 w-full h-full py-3 appearance-none cursor-pointer"
                                        >
                                            <option value="">-- คูปอง --</option>
                                            {marketing?.coupons?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="bg-white flex items-center gap-2 px-3 rounded-2xl border border-emerald-200 shadow-sm">
                                        <span className="material-symbols-outlined text-emerald-500 text-[18px]">local_offer</span>
                                        <select 
                                            value={selectedPromotionId} 
                                            onChange={(e) => { 
                                                const val = e.target.value; 
                                                setSelectedPromotionId(val); 
                                                if (!val) setAppliedPromotion(null); 
                                                else { 
                                                    const promo = marketing?.promotions?.find(p => String(p.id) === String(val)); 
                                                    if (promo && isPromoActive(promo) && isPromotionEligible(promo)) {
                                                        setAppliedPromotion(promo);
                                                    } else {
                                                        setAppliedPromotion(null);
                                                        alert('ไม่สามารถใช้โปรโมชั่นนี้ได้');
                                                    }
                                                } 
                                            }} 
                                            className="bg-transparent font-bold text-[11px] outline-none text-stone-700 w-full h-full py-3 appearance-none cursor-pointer"
                                        >
                                            <option value="">-- โปรโมชั่น --</option>
                                            {marketing?.promotions?.filter(p => p.active === 1 || p.active === true || p.active === '1').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                {appliedPromotion && (
                                    <div className="hidden"></div>
                                )}
                                <button 
                                    onClick={() => setIsQueueModalOpen(true)} 
                                    className={`w-full py-2.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-2 transition-allactive:scale-95 shadow-sm border ${queueNumber ? 'bg-purple-100 border-purple-200 text-purple-900' : 'bg-whiteborder-stone-200 text-stone-600 hover:bg-stone-50'}`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">confirmation_number</span> 
                                    {queueNumber ? `คิวที่: ${queueNumber}` : 'ระบุคิวลูกค้า'}
                                </button>
                            </div>
                        

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

                            <div className="mt-8 shrink-0">
                                {!selectedMember ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={() => setCheckoutStep('PAY_CASH')} className="bg-[#52a675] hover:bg-[#41875e] text-white py-5 rounded-[1.25rem] flex flex-col items-center gap-1.5 shadow-[0_8px_16px_-6px_rgba(82,166,117,0.4)] active:scale-95 transition-all"><span className="material-symbols-outlined text-[28px]">payments</span><span className="font-black text-sm uppercase tracking-wide">เงินสด</span></button>
                                        <button onClick={() => { setCheckoutStep('PAY_QR'); setReceivedAmount(netTotal.toString()); }} className="bg-[#4b7deb] hover:bg-[#3a65c4] text-white py-5 rounded-[1.25rem] flex flex-col items-center gap-1.5 shadow-[0_8px_16px_-6px_rgba(75,125,235,0.4)] active:scale-95 transition-all"><span className="material-symbols-outlined text-[28px]">qr_code_scanner</span><span className="font-black text-sm uppercase tracking-wide">สแกน QR</span></button>
                                    </div>
                                ) : (
                                    <button onClick={() => { if (selectedMember.wallet < netTotal) { setIsTopupFlow(true); setTopupStep('PROMPT'); } else { setIsMemberPinFlow(true); setMemberPin(''); } }} className="w-full bg-[#2c2929] hover:bg-black text-white py-5 rounded-[1.25rem] flex flex-col items-center justify-center gap-1.5 shadow-[0_10px_20px_-8px_rgba(0,0,0,0.5)] active:scale-95 transition-all">
                                        <span className="material-symbols-outlined text-[28px] text-amber-400">account_balance_wallet</span><span className="font-black text-[15px]">ชำระผ่าน E-Wallet</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

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
                                {members?.filter(m => {
                                    const searchStr = String(memberSearch || '').toLowerCase();
                                    const nameStr = String(m.name || '').toLowerCase();
                                    const phoneStr = String(m.phone || '').toLowerCase();
                                    const nicknameStr = String(m.nickname || '').toLowerCase();
                                    return nameStr.includes(searchStr) || phoneStr.includes(searchStr) || nicknameStr.includes(searchStr);
                                }).map(member => {
                                    const mTier = getMemberTier(member.points || 0);
                                    const initial = String(member.name || 'U').charAt(0).toUpperCase();
                                    return (
                                        <button key={member.id} onClick={() => { setSelectedMember(member); setCheckoutStep('SUMMARY'); }} className="w-full bg-stone-50/30 border border-stone-100 p-4 rounded-[1.25rem] flex items-center justify-between hover:bg-white hover:border-[#861b00]/30 hover:shadow-[0_4px_12px_-4px_rgba(134,27,0,0.1)] transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-stone-200/50 text-stone-600 rounded-full flex items-center justify-center font-black text-xl group-hover:bg-[#861b00] group-hover:text-white transition-colors">{initial}</div>
                                                <div className="text-left"><p className="font-bold text-stone-800 text-base leading-tight">{member.name}</p><p className="text-xs text-stone-400 font-medium mt-0.5">{member.phone}</p></div>
                                            </div>
                                            {mTier && <div className="border border-stone-200 px-3 py-1.5 rounded-lg text-[11px] font-bold text-stone-500 bg-white shadow-sm uppercase">{mTier.name}</div>}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

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
                                <button onClick={() => openEmpPin('CASH')} className={`w-full py-5 text-white text-lg font-black rounded-[1.25rem] transition-all active:scale-95 flex items-center justify-center gap-2 ${(!receivedAmount || parseFloat(receivedAmount) < netTotal) ? 'bg-stone-300 shadow-none' : 'bg-[#52a675] hover:bg-[#41875e] shadow-[0_8px_16px_-6px_rgba(82,166,117,0.4)]'}`} disabled={!receivedAmount || parseFloat(receivedAmount) < netTotal}><span className="material-symbols-outlined text-[24px]">task_alt</span> ยืนยันชำระเงิน</button>
                            </div>
                        </div>
                    )}

                    {checkoutStep === 'PAY_QR' && (
                        <div className="flex-1 flex flex-col animate-in slide-in-from-right-8 duration-300 min-h-0">
                
                            {/* Header */}
                            <div className="flex justify-between items-center mb-6 shrink-0 border-b border-stone-100 pb-4">
                                <h3 className="font-black text-2xl text-[#4b7deb]">สแกน QR กสิกร</h3>
                                <button onClick={handleQRBack}
                                    className="w-10 h-10 bg-stone-50 text-stone-500 rounded-full flex items-center justify-center hover:bg-stone-200 transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                                </button>
                            </div>
                
                            {/* idle: ยังไม่ได้กดสร้าง QR */}
                            {qrStatus === 'idle' && (
                                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                                    <p className="text-stone-500 font-bold text-center">
                                        ยอดที่ต้องชำระ<br />
                                        <span className="text-[#861b00] font-black text-4xl mt-1 block">฿{netTotal.toLocaleString()}</span>
                                    </p>
                                    <button onClick={handleCreateQR}
                                        className="px-10 py-4 bg-[#1e4a9c] text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all flex items-center gap-3 text-lg">
                                        <span className="material-symbols-outlined text-[28px]">qr_code</span>
                                        สร้าง QR Code
                                    </button>
                                </div>
                            )}
                
                            {/* loading: กำลังเรียก API */}
                            {qrStatus === 'loading' && (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-16 h-16 border-4 border-[#4b7deb] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                        <p className="text-stone-400 font-bold">กำลังสร้าง QR Code...</p>
                                    </div>
                                </div>
                            )}
                
                            {/* ready: แสดง QR + polling อยู่ */}
                            {qrStatus === 'ready' && qrImage && (
                                <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-stone-50/50 rounded-[2rem] border border-stone-100 mb-6">
                                    <img
                                        src={qrImage.src}
                                        alt="QR Payment"
                                        className="w-56 h-56 rounded-2xl border-4 border-white shadow-xl"
                                    />
                                    <p className="text-[#861b00] font-black text-3xl">฿{netTotal.toLocaleString()}</p>
                                    <p className="text-stone-400 font-bold text-sm animate-pulse">รอการยืนยันจากธนาคาร...</p>
                                </div>
                            )}
                
                            {/* paid: สำเร็จ */}
                            {qrStatus === 'paid' && (
                                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-emerald-500">
                                    <span className="material-symbols-outlined text-[80px]">check_circle</span>
                                    <p className="font-black text-2xl">ชำระเงินสำเร็จ!</p>
                                    <p className="text-stone-400 font-bold text-sm">กำลังบันทึกรายการ...</p>
                                </div>
                            )}
                
                            {/* error: เชื่อมต่อไม่ได้ */}
                            {qrStatus === 'error' && (
                                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                                    <span className="material-symbols-outlined text-[60px] text-red-400">error</span>
                                    <p className="text-red-500 font-black text-lg">เชื่อมต่อ KBank ไม่ได้</p>
                                    <button onClick={() => setQrStatus('idle')}
                                        className="px-6 py-3 border-2 border-red-200 text-red-500 font-black rounded-2xl hover:bg-red-50 transition-colors">
                                        ลองใหม่
                                    </button>
                                </div>
                            )}
                
                            {/* ปุ่ม Manual Confirm (polling ช้า แต่ลูกค้าสแกนแล้ว) */}
                            {qrStatus === 'ready' && (
                                <button onClick={() => { if (qrPollRef) clearInterval(qrPollRef); openEmpPin('QR'); }}
                                    className="w-full py-4 bg-stone-800 hover:bg-black text-white text-sm font-black rounded-[1.25rem] active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0">
                                    <span className="material-symbols-outlined text-[20px]">task_alt</span>
                                    ยืนยันด้วยตนเอง (ถ้าสแกนแล้ว)
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>

            {/* 🔐 Employee PIN Modal — ยืนยันพนักงานก่อนทำรายการ */}
            {empPinModal.isOpen && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/75 backdrop-blur-sm" onClick={closeEmpPin} />
                    <div
                        className="relative z-10 w-full max-w-[320px] bg-white rounded-[2.5rem] shadow-[0_32px_80px_rgba(0,0,0,0.4)] overflow-hidden animate-in zoom-in-95 duration-200"
                        style={{ animation: empPinShake ? 'empPinShake 0.55s ease-in-out' : undefined }}
                    >
                        {/* Header */}
                        <div className={`w-full px-6 pt-8 pb-6 flex flex-col items-center gap-3 ${empPinModal.pendingMethod?.startsWith('TOPUP') ? 'bg-[#861b00]' : empPinModal.pendingMethod === 'QR' ? 'bg-[#1e4a9c]' : 'bg-[#52a675]'}`}>
                            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[30px] text-white">
                                    {empPinModal.pendingMethod?.startsWith('TOPUP') ? 'account_balance_wallet' : empPinModal.pendingMethod === 'QR' ? 'qr_code_scanner' : 'payments'}
                                </span>
                            </div>
                            <div className="text-center">
                                <p className="text-white/65 text-[11px] font-bold uppercase tracking-[0.18em]">ยืนยันตัวตนพนักงาน</p>
                                <p className="text-white text-[17px] font-black mt-0.5">
                                    {empPinModal.pendingMethod === 'CASH' ? 'ชำระเงินสด' : empPinModal.pendingMethod === 'QR' ? 'ชำระผ่าน QR' : empPinModal.pendingMethod === 'TOPUP_CASH' ? 'เติมเงิน (สด)' : 'เติมเงิน (QR)'}
                                </p>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-7 pb-7 pt-5 flex flex-col items-center gap-4">
                            <p className="text-stone-400 text-[12px] font-bold text-center">ใส่ PIN พนักงานคนใดก็ได้ 6 หลัก<br />เพื่อบันทึกชื่อผู้ทำรายการ</p>

                            {empPinSuccess ? (
                                <div className="flex flex-col items-center gap-2 py-2 animate-in zoom-in duration-200">
                                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-emerald-600 text-[28px]">check_circle</span>
                                    </div>
                                    <p className="text-emerald-600 font-black text-[15px]">{empPinSuccess.name}</p>
                                    <p className="text-emerald-400 text-[11px] font-bold">{empPinSuccess.role === 'admin' ? '👑 Admin' : '🧑‍💼 Staff'}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex gap-3">
                                        {Array.from({ length: 6 }).map((_, i) => (
                                            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${i < empPin.length ? 'bg-[#861b00] border-[#861b00] scale-110' : 'bg-transparent border-stone-300'}`} />
                                        ))}
                                    </div>
                                    <div className="h-5 flex items-center justify-center">
                                        {empPinError && (
                                            <p className="text-red-500 text-[12px] font-bold flex items-center gap-1 animate-in fade-in duration-200">
                                                <span className="material-symbols-outlined text-[14px]">error</span>{empPinError}
                                            </p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2.5 w-full">
                                        {['1','2','3','4','5','6','7','8','9'].map(d => (
                                            <button key={d} onClick={() => handleEmpPinDigit(d)} className="h-14 rounded-2xl bg-stone-100 text-stone-800 text-[20px] font-black active:scale-95 hover:bg-stone-200 transition-all">{d}</button>
                                        ))}
                                        <button onClick={closeEmpPin} className="h-14 rounded-2xl bg-transparent text-stone-400 active:scale-95 hover:bg-red-50 hover:text-red-400 transition-all flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[22px]">close</span>
                                        </button>
                                        <button onClick={() => handleEmpPinDigit('0')} className="h-14 rounded-2xl bg-stone-100 text-stone-800 text-[20px] font-black active:scale-95 hover:bg-stone-200 transition-all">0</button>
                                        <button onClick={() => handleEmpPinDigit('DEL')} className="h-14 rounded-2xl bg-transparent text-stone-400 active:scale-95 hover:bg-stone-100 transition-all flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[22px]">backspace</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <style>{`
                        @keyframes empPinShake {
                            0%,100%{transform:translateX(0)} 15%{transform:translateX(-8px)} 30%{transform:translateX(8px)}
                            45%{transform:translateX(-6px)} 60%{transform:translateX(6px)} 75%{transform:translateX(-4px)} 90%{transform:translateX(4px)}
                        }
                    `}</style>
                </div>
            )}
        </>
    );
}