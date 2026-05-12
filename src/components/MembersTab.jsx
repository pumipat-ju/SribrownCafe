import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { fetchJSON } from '../api.js';
import ReceiptPrintout from '../components/ReceiptPrintout'; // 🌟 1. Import Component ใบเสร็จเข้ามา

// 🌟 Helper Component สำหรับแอนิเมชันตัวเลขวิ่ง (Count Up)
const CountUpAnim = ({ end, isMoney = false }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let start = 0;
        const duration = 1000; // 1 วินาที
        const increment = end / (duration / 16);
        if (end === 0) return;
        const timer = setInterval(() => {
            start += increment;
            if (start >= end) { clearInterval(timer); setCount(end); }
            else setCount(start);
        }, 16);
        return () => clearInterval(timer);
    }, [end]);
    return <>{isMoney ? parseFloat(count).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.floor(count).toLocaleString()}</>;
};

export default function MembersTab({ searchTerm, crmAction, setCrmAction }) {
    const { members, setMembers, currentEmployee, employees, transactions, setTransactions, generateBillId, marketing } = useContext(AppContext);
    // 🌟 โหมดสลับดูระหว่าง "ลูกค้าปกติ" กับ "ลูกค้าที่ถูกระงับ (Archive)"
    const [showArchived, setShowArchived] = useState(false);

    // 🌟 State สำหรับ ยืนยัน PIN ก่อนเข้าดู Archive
    const [isArchivePinOpen, setIsArchivePinOpen] = useState(false);
    const [archivePin, setArchivePin] = useState('');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newMember, setNewMember] = useState({ nickname: '', name: '', age: '', dob: '', phone: '', pin: '' });

    const [editMember, setEditMember] = useState(null);
    const [editForm, setEditForm] = useState({ nickname: '', name: '', age: '', dob: '', phone: '', pin: '' });

    const [isResetPinModalOpen, setIsResetPinModalOpen] = useState(false);
    const [resetPinStep, setResetPinStep] = useState('NEW_PIN');
    const [newCustomerPin, setNewCustomerPin] = useState('');
    const [employeeConfirmPin, setEmployeeConfirmPin] = useState('');

    const [topupMember, setTopupMember] = useState(null);
    const [topupAmount, setTopupAmount] = useState('');
    const [topupStep, setTopupStep] = useState('AMOUNT'); // AMOUNT, PIN, SUCCESS
    const [topupPin, setTopupPin] = useState('');
    const [topupMethod, setTopupMethod] = useState('CASH'); // 🌟 เก็บช่องทางชำระเงิน
    const [topupReceipt, setTopupReceipt] = useState(null);

    const [qrCodeUri, setQrCodeUri] = useState('');
    const [qrChargeId, setQrChargeId] = useState('');
    const [qrPollingRef, setQrPollingRef] = useState(null);

    const [couponMember, setCouponMember] = useState(null);
    const [couponPin, setCouponPin] = useState('');
    const [isCouponSuccess, setIsCouponSuccess] = useState(false);

    const [deleteMember, setDeleteMember] = useState(null);
    const [deletePin, setDeletePin] = useState('');

    useEffect(() => {
        if (crmAction === 'addMember') {
            setIsAddModalOpen(true);
            setCrmAction(null);
        } else if (crmAction === 'viewArchive') {
            if (!showArchived) {
                setIsArchivePinOpen(true);
            } else {
                setShowArchived(false);
            }
            setCrmAction(null);
        }
    }, [crmAction, showArchived, setCrmAction]);

    // ==========================================
    // Helper Functions
    // ==========================================
    const fMoney = (n) => parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fPhone = (p) => {
        if (!p) return '-';
        const cleaned = p.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
        return match ? `${match[1]}-${match[2]}-${match[3]}` : p;
    };

    const getTier = (member) => {
        let rawTier = (member.tier || 'Bronze').trim();
        let tierName = rawTier.charAt(0).toUpperCase() + rawTier.slice(1).toLowerCase();

        if (tierName === 'Platinum') tierName = 'Diamond';

        // 🌟 เปลี่ยนสีให้มินิมอล สบายตาแบบ SRIBROWN (อิงสีจาก MarketingTab)
        const config = {
            Diamond: { name: 'Diamond', color: 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 border border-blue-300 shadow-sm' },
            Gold: { name: 'Gold', color: 'bg-gradient-to-br from-yellow-100 via-yellow-200 to-amber-300 text-amber-700 border border-yellow-300 shadow-sm' },
            Silver: { name: 'Silver', color: 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 border border-slate-300 shadow-sm' },
            Bronze: { name: 'Bronze', color: 'bg-gradient-to-br from-orange-50 to-orange-100 text-orange-700 border border-orange-200 shadow-sm' }
        };

        return config[tierName] || config.Bronze;
    };

    const activeMembers = members?.filter(m => m.isActive !== false) || [];
    const totalMembers = activeMembers.length;
    const totalWallet = activeMembers.reduce((sum, m) => sum + (m.wallet || 0), 0);

    const tierCounts = { Bronze: 0, Silver: 0, Gold: 0, Diamond: 0 };
    activeMembers.forEach(m => {
        const t = getTier(m).name;
        if (tierCounts[t] !== undefined) tierCounts[t]++;
    });

    const filteredMembers = members?.filter(m => {
        const matchesSearch = m.phone.includes(searchTerm) || m.name.toLowerCase().includes(searchTerm.toLowerCase()) || (m.nickname && m.nickname.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = showArchived ? m.isActive === false : m.isActive !== false;
        return matchesSearch && matchesStatus;
    }) || [];

    // ==========================================
    // 🌟 ฟังก์ชันจัดการ Flow Archive PIN
    // ==========================================
    const handleToggleArchive = () => {
        if (!showArchived) { setIsArchivePinOpen(true); }
        else { setShowArchived(false); }
    };

    const handleArchivePinClick = (num) => {
        if (num === 'C') setArchivePin('');
        else if (num === 'DEL') setArchivePin(prev => prev.slice(0, -1));
        else if (archivePin.length < 6) setArchivePin(prev => prev + num);
    };

    const handleVerifyArchivePin = () => {
        const validEmpPin = currentEmployee?.pin ? String(currentEmployee.pin) : null;
        if (!validEmpPin) return alert('ไม่พบข้อมูลพนักงาน กรุณา Login ใหม่');
        if (archivePin === validEmpPin) {
            setShowArchived(true);
            setIsArchivePinOpen(false);
            setArchivePin('');
        } else {
            alert('รหัสพนักงานไม่ถูกต้อง! ไม่อนุญาตให้เข้าถึงข้อมูลนี้');
            setArchivePin('');
        }
    };

    // ================= ACTION FUNCTIONS ================= //
    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!newMember.name || !newMember.phone || !newMember.pin) return alert('กรุณากรอก ชื่อ, เบอร์โทร และ PIN ให้ครบถ้วน');
        if (newMember.pin.length !== 6) return alert('รหัส PIN ต้องมี 6 หลักพอดีครับ');

        try {
            const dbName = newMember.nickname ? `${newMember.nickname} (${newMember.name})` : newMember.name;
            const created = await fetchJSON('/members/', {
                method: 'POST',
                body: JSON.stringify({
                    name: dbName,
                    phone: newMember.phone,
                    pin: newMember.pin,
                    points: 0,
                    wallet: 0,
                    isActive: true,
                    age: newMember.age ? parseInt(newMember.age) : null,
                    dob: newMember.dob || null
                })
            });
            setMembers([created, ...members]);
            setIsAddModalOpen(false);
            setNewMember({ nickname: '', name: '', age: '', dob: '', phone: '', pin: '' });
        } catch (error) {
            alert('Failed to add member: ' + error.message);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editForm.name || !editForm.phone) return alert('กรุณากรอก ชื่อ, เบอร์โทร ให้ครบถ้วน');

        try {
            const dbName = editForm.nickname ? `${editForm.nickname} (${editForm.name})` : editForm.name;
            const updated = await fetchJSON(`/members/${editMember.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    ...editMember,
                    name: dbName,
                    phone: editForm.phone,
                    age: editForm.age ? parseInt(editForm.age) : null,
                    dob: editForm.dob || null
                })
            });
            setMembers(members.map(m => m.id === editMember.id ? { ...m, ...updated, nickname: editForm.nickname, name: editForm.name } : m));
            setEditMember(null);
        } catch (error) {
            alert('Failed to edit member: ' + error.message);
        }
    };

    const handleDobChange = (e, isEdit = false) => {
        const dobVal = e.target.value;
        let ageVal = '';
        if (dobVal) {
            const birthDate = new Date(dobVal);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
            ageVal = age.toString();
        }
        if (isEdit) setEditForm({ ...editForm, dob: dobVal, age: ageVal });
        else setNewMember({ ...newMember, dob: dobVal, age: ageVal });
    };

    // ==========================================
    // 🌟 ฟังก์ชันจัดการ Flow รีเซ็ตรหัส PIN
    // ==========================================
    const handleResetNumClick = (num, type) => {
        const setter = type === 'NEW_PIN' ? setNewCustomerPin : setEmployeeConfirmPin;
        const currentVal = type === 'NEW_PIN' ? newCustomerPin : employeeConfirmPin;
        if (num === 'C') setter('');
        else if (num === 'DEL') setter(prev => prev.slice(0, -1));
        else if (currentVal.length < 6) setter(prev => prev + num);
    };

    const proceedToEmployeePin = () => {
        if (newCustomerPin.length !== 6) return alert('ลูกค้าต้องตั้งรหัสผ่านใหม่ 6 หลักครับ');
        setResetPinStep('EMP_PIN');
    };

    const executePinReset = async () => {
        const validEmpPin = currentEmployee?.pin ? String(currentEmployee.pin) : null;
        if (!validEmpPin) return alert('ไม่พบข้อมูลพนักงาน กรุณา Login ใหม่');
        if (employeeConfirmPin !== validEmpPin) {
            alert('รหัสพนักงานไม่ถูกต้อง! ไม่อนุญาตให้เปลี่ยน PIN ลูกค้าครับ');
            setEmployeeConfirmPin('');
            return;
        }
        try {
            await fetchJSON(`/members/${editMember.id}`, { method: 'PUT', body: JSON.stringify({ ...editMember, pin: newCustomerPin }) });
            setMembers(members.map(m => m.id === editMember.id ? { ...m, pin: newCustomerPin } : m));
            alert('อัปเดตรหัส PIN ใหม่ของลูกค้าสำเร็จ!');
            closeResetPinModal();
        } catch (error) {
            setMembers(members.map(m => m.id === editMember.id ? { ...m, pin: newCustomerPin } : m));
            alert('อัปเดตรหัส PIN สำเร็จ (Local Mode)');
            closeResetPinModal();
        }
    };

    const closeResetPinModal = () => {
        setIsResetPinModalOpen(false);
        setResetPinStep('NEW_PIN');
        setNewCustomerPin('');
        setEmployeeConfirmPin('');
    };

    // ==========================================
    // 🌟 ฟังก์ชันจัดการ Flow เติมเงิน
    // ==========================================
    const handleTopupNumClick = (num) => {
        if (num === 'C') setTopupPin('');
        else if (num === 'DEL') setTopupPin(prev => prev.slice(0, -1));
        else if (topupPin.length < 6) setTopupPin(prev => prev + num);
    };

    // 🌟 1. ย้ายขึ้นมาบนสุด เพื่อแก้ปัญหาหน้าจอ Crash (ขาว)
    const closeTopupModal = () => {
        if (qrPollingRef) { clearInterval(qrPollingRef); setQrPollingRef(null); }
        setTopupMember(null);
        setTopupAmount('');
        setTopupStep('AMOUNT');
        setTopupPin('');
        setTopupMethod('CASH');
        setTopupReceipt(null);
        setQrCodeUri('');
        setQrChargeId('');
    };

    const handleVerifyTopupPin = async () => {
        const authEmp = employees?.find(emp => String(emp.pin) === String(topupPin));
        if (!authEmp) {
            alert('รหัสพนักงานไม่ถูกต้อง!');
            setTopupPin('');
            return;
        }

        const amount = parseFloat(topupAmount || 0);
        const newWallet = parseFloat(topupMember.wallet || 0) + amount;
        const newPoints = parseFloat(topupMember.points || 0) + amount;
        const newTopupId = generateBillId('TOPUP', transactions);
        const now = new Date();

        const dbTxnPayload = {
            bill_id: newTopupId,
            type: 'TOPUP',
            amount: amount,
            method: topupMethod,
            desc: `เติมเงินให้: ${topupMember.name}`,
            cashier: authEmp.name,
            date_raw: now.toISOString(),
            items: JSON.stringify([{ name: 'เติมเงิน E-Wallet', qty: 1, price: amount }])
        };

        const uiTxnData = {
            ...dbTxnPayload,
            id: newTopupId,
            subtotal: amount,
            time: now.toLocaleTimeString('th-TH').slice(0, 5) + ' น.',
            date: now.toLocaleDateString('th-TH')
        };

        const cleanMemberPayload = {
            name: String(topupMember.name),
            phone: String(topupMember.phone),
            pin: String(topupMember.pin),
            points: newPoints,
            wallet: newWallet,
            age: topupMember.age ? parseInt(topupMember.age) : null,
            dob: topupMember.dob || null
        };

        // ถ้าเลือก QR → สร้าง QR ก่อน แล้วรอ polling
        if (topupMethod === 'QR') {
            try {
                const qrData = await fetchJSON('/payments/qr/create', {
                    method: 'POST',
                    body: JSON.stringify({ amount, order_id: newTopupId })
                });
                setQrCodeUri(qrData.qrCode);
                setQrChargeId(qrData.chargeId);
                setTopupStep('QR_WAITING');
                setTopupPin('');

                // เริ่ม polling ทุก 3 วินาที
                const interval = setInterval(async () => {
                    try {
                        const res = await fetchJSON(`/payments/qr/status/${qrData.chargeId}`);
                        if (res.status === 'PAID') {
                            clearInterval(interval);
                            setQrPollingRef(null);
                            // อัปเดต wallet หลังจ่ายแล้ว
                            const updatedMember = await fetchJSON(`/members/${topupMember.id}`, {
                                method: 'PUT',
                                body: JSON.stringify(cleanMemberPayload)
                            });
                            const dbTxn = await fetchJSON('/transactions/', {
                                method: 'POST',
                                body: JSON.stringify(dbTxnPayload)
                            });
                            setTransactions(prev => [{ ...uiTxnData, id: dbTxn?.id || newTopupId }, ...prev]);
                            setMembers(members.map(m => m.id === topupMember.id ? updatedMember : m));
                            setTopupReceipt({
                                ...uiTxnData,
                                paymentMethod: topupMethod,
                                timestamp: now,
                                newBalance: updatedMember.wallet
                            });
                            setTopupStep('SUCCESS');
                        }
                    } catch (err) {
                        console.error('Polling error:', err);
                    }
                }, 3000);
                setQrPollingRef(interval);

            } catch (err) {
                alert('ไม่สามารถสร้าง QR ได้: ' + err.message);
            }
            return;
        }

        // CASH flow เหมือนเดิม
        try {
            const updatedMember = await fetchJSON(`/members/${topupMember.id}`, {
                method: 'PUT',
                body: JSON.stringify(cleanMemberPayload)
            });
            const dbTxn = await fetchJSON('/transactions/', {
                method: 'POST',
                body: JSON.stringify(dbTxnPayload)
            });
            setTransactions(prev => [{ ...uiTxnData, id: dbTxn?.id || newTopupId }, ...prev]);
            setMembers(members.map(m => m.id === topupMember.id ? updatedMember : m));
            setTopupReceipt({
                ...uiTxnData,
                paymentMethod: topupMethod,
                timestamp: now,
                newBalance: updatedMember.wallet
            });
            setTopupStep('SUCCESS');
        } catch (error) {
            console.error("Save Error:", error);
            setTransactions(prev => [uiTxnData, ...prev]);
            setMembers(members.map(m => m.id === topupMember.id ? { ...m, wallet: newWallet, points: newPoints } : m));
            setTopupReceipt({
                ...uiTxnData,
                paymentMethod: topupMethod,
                timestamp: now,
                newBalance: newWallet
            });
            setTopupStep('SUCCESS');
        }
    };

    // ==========================================
    // 🌟 ฟังก์ชันจัดการ Flow แจกคูปอง
    // ==========================================
    const handleCouponNumClick = (num) => {
        if (num === 'C') setCouponPin('');
        else if (num === 'DEL') setCouponPin(prev => prev.slice(0, -1));
        else if (couponPin.length < 6) setCouponPin(prev => prev + num);
    };

    const handleVerifyCouponPin = () => {
        const validEmpPin = currentEmployee?.pin ? String(currentEmployee.pin) : null;
        if (!validEmpPin) return alert('ไม่พบข้อมูลพนักงาน กรุณา Login ใหม่');
        if (couponPin !== validEmpPin) {
            alert('รหัสพนักงานไม่ถูกต้อง! ไม่สามารถทำรายการแจกคูปองได้');
            setCouponPin('');
            return;
        }
        setIsCouponSuccess(true);
    };

    const closeCouponModal = () => {
        setCouponMember(null);
        setCouponPin('');
        setIsCouponSuccess(false);
    };

    // ==========================================
    // 🔴🌟 ฟังก์ชันจัดการ Flow ระงับบัญชี / กู้คืน
    // ==========================================
    const handleDeleteNumClick = (num) => {
        if (num === 'C') setDeletePin('');
        else if (num === 'DEL') setDeletePin(prev => prev.slice(0, -1));
        else if (deletePin.length < 6) setDeletePin(prev => prev + num);
    };

    const handleVerifyDeletePin = async () => {
        const validEmpPin = currentEmployee?.pin ? String(currentEmployee.pin) : null;
        if (!validEmpPin) return alert('ไม่พบข้อมูลพนักงาน กรุณา Login ใหม่');
        if (deletePin !== validEmpPin) {
            alert('รหัสพนักงานไม่ถูกต้อง! ไม่อนุญาตให้ระงับบัญชี');
            setDeletePin('');
            return;
        }

        if (window.confirm(`ยืนยันการระงับบัญชี\nคุณต้องการระงับการใช้งานของ "${deleteMember.name}" ใช่หรือไม่?\n(ข้อมูลจะไม่ถูกลบถาวร สามารถกู้คืนได้)`)) {
            try {
                await fetchJSON(`/members/${deleteMember.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ ...deleteMember, isActive: false })
                });
                setMembers(members.map(m => m.id === deleteMember.id ? { ...m, isActive: false } : m));
            } catch (error) {
                setMembers(members.map(m => m.id === deleteMember.id ? { ...m, isActive: false } : m));
            }
        }
        closeDeleteModal();
    };

    const closeDeleteModal = () => {
        setDeleteMember(null);
        setDeletePin('');
    };

    const handleRestoreMember = async (member) => {
        if (window.confirm(`ต้องการกู้คืนบัญชีของ "${member.name}" กลับมาใช้งานใช่หรือไม่?`)) {
            try {
                await fetchJSON(`/members/${member.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ ...member, isActive: true })
                });
                setMembers(members.map(m => m.id === member.id ? { ...m, isActive: true } : m));
            } catch (error) {
                setMembers(members.map(m => m.id === member.id ? { ...m, isActive: true } : m));
            }
        }
    };


    // ==========================================
    // 🌟 EARLY RETURN: หน้าจอเติมเงินสำเร็จ (หนี print:hidden)
    // ==========================================
    if (topupMember && topupStep === 'SUCCESS' && topupReceipt) {
        return (
            <>
                {/* 🖨️ เครื่องพิมพ์จะมองเห็นตัวนี้ (จัดตารางสวยงาม) */}
                <ReceiptPrintout txn={topupReceipt} />

                {/* 🖥️ ส่วนแสดงผลบนจอปกติ (ซ่อนตอนพิมพ์) */}
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in print:hidden">
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.2)] relative z-10 animate-bounce-modal flex flex-col items-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/40 border-4 border-white">
                            <span className="material-symbols-outlined text-5xl">check_circle</span>
                        </div>
                        <h2 className="text-3xl font-black text-stone-800 mb-2">เติมเงินสำเร็จ!</h2>
                        <p className="text-stone-400 font-bold text-sm mb-8 tracking-wide uppercase">Transaction Complete</p>

                        <div className="w-full bg-stone-50 rounded-[1.5rem] p-6 mb-8 text-sm space-y-4 font-bold text-stone-500 border border-stone-100 shadow-inner relative overflow-hidden">
                            {/* Ticket edge decoration */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full"></div>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-white rounded-full"></div>

                            <div className="flex justify-between"><span>รหัสอ้างอิง:</span><span className="text-stone-800">{topupReceipt?.id}</span></div>
                            <div className="flex justify-between"><span>ลูกค้า:</span><span className="text-stone-800">{topupMember?.name}</span></div>
                            <div className="flex justify-between"><span>พนักงาน:</span><span className="text-stone-800">{topupReceipt?.cashier}</span></div>

                            <div className="flex justify-between">
                                <span>ช่องทางรับเงิน:</span>
                                <span className="text-stone-800 font-black">
                                    {topupReceipt?.paymentMethod === 'CASH' ? 'เงินสด' : 'QR Payment'}
                                </span>
                            </div>

                            <div className="border-t-2 border-stone-200 border-dashed pt-4 mt-2 flex justify-between items-center">
                                <span className="text-emerald-600 font-black">ยอดที่เติม:</span>
                                <span className="text-emerald-600 font-black text-2xl">฿{fMoney(topupReceipt?.amount)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-xs">ยอดคงเหลือใหม่:</span>
                                <span className="text-stone-800 font-black text-lg">฿{fMoney(topupReceipt?.newBalance)}</span>
                            </div>
                        </div>

                        {/* 🌟 2 ปุ่มเหมือนหน้า Checkout */}
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => { setTimeout(() => window.print(), 300); }}
                                className="flex-[1] py-4 bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm font-black rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[20px]">print</span> พิมพ์สลิป
                            </button>
                            <button
                                onClick={closeTopupModal}
                                className="flex-[1.5] py-4 bg-stone-800 hover:bg-black text-white text-base font-black rounded-2xl shadow-xl shadow-stone-800/30 transition-all active:scale-95"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }


    // ==========================================
    // 🖥️ MAIN RETURN
    // ==========================================
    return (
        <div className="flex flex-col h-full gap-5 w-full relative animate-in fade-in duration-500 font-body print:hidden">

            <style>{`
                @keyframes gradient-x {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 4s ease infinite;
                }
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .shimmer-effect {
                    position: relative;
                    overflow: hidden;
                }
                .shimmer-effect::after {
                    content: '';
                    position: absolute;
                    top: 0; left: -100%; width: 50%; height: 100%;
                    background: linear-gradient(to right, transparent, rgba(255,255,255,0.6), transparent);
                    transform: skewX(-20deg);
                    animation: shimmer 2.5s infinite;
                }
                @keyframes slide-up-fade {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-stagger {
                    animation: slide-up-fade 0.5s ease-out forwards;
                    opacity: 0;
                }
                .neumorph-btn {
                    background: #f8fafc;
                    box-shadow: 4px 4px 8px #d1d5db, -4px -4px 8px #ffffff;
                    transition: all 0.2s ease;
                }
                .neumorph-btn:active {
                    box-shadow: inset 4px 4px 8px #d1d5db, inset -4px -4px 8px #ffffff;
                    transform: translateY(2px);
                }
                @keyframes bounce-in {
                    0% { transform: scale(0.9); opacity: 0; }
                    60% { transform: scale(1.02); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-bounce-modal {
                    animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
            `}</style>

            {/* 💎 1. Premium Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 shrink-0">
                <div className="bg-white rounded-[1.5rem] lg:rounded-[2rem] border border-stone-100 p-5 lg:p-6 flex flex-col items-center justify-center text-center shadow-lg shadow-stone-200/50 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                    <p className="text-[10px] lg:text-xs text-stone-400 font-bold uppercase mb-1 lg:mb-2 tracking-widest">สมาชิก (Active)</p>
                    <h3 className="text-3xl md:text-2xl lg:text-4xl xl:text-5xl font-black text-stone-800 font-headline">
                        <CountUpAnim end={totalMembers} />
                    </h3>
                </div>
                <div className="bg-white rounded-[1.5rem] lg:rounded-[2rem] border border-stone-100 p-5 lg:p-6 flex flex-col items-center justify-center text-center shadow-lg shadow-emerald-100/50 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 min-w-0">
                    <p className="text-[10px] lg:text-xs text-stone-400 font-bold uppercase mb-1 lg:mb-2 tracking-widest">ยอดเงิน E-WALLET</p>
                    <h3 className="text-3xl md:text-2xl lg:text-4xl xl:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-emerald-600 font-headline truncate w-full px-2">
                        ฿<CountUpAnim end={totalWallet} isMoney={true} />
                    </h3>
                </div>
                <div className="bg-white rounded-[1.5rem] lg:rounded-[2rem] border border-stone-100 p-4 lg:p-6 shadow-lg shadow-stone-200/50 flex flex-col justify-center hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                    <p className="text-[10px] lg:text-xs text-stone-400 font-bold uppercase mb-3 text-center tracking-widest">สมาชิกตามระดับ (TIERS)</p>
                    <div className="grid grid-cols-4 gap-2 lg:gap-3 text-center">

                        {/* Bronze */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 text-orange-700 border border-orange-200 rounded-xl lg:rounded-2xl p-2 lg:p-2.5 shadow-sm hover:scale-105 transition-transform cursor-default">
                            <p className="text-[8px] lg:text-[9px] font-black mb-0.5 uppercase tracking-widest opacity-80">Bronze</p>
                            <p className="font-black text-sm lg:text-xl"><CountUpAnim end={tierCounts.Bronze} /></p>
                        </div>

                        {/* Silver */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 border border-slate-300 rounded-xl lg:rounded-2xl p-2 lg:p-2.5 shadow-sm hover:scale-105 transition-transform cursor-default">
                            <p className="text-[8px] lg:text-[9px] font-black mb-0.5 uppercase tracking-widest opacity-80">Silver</p>
                            <p className="font-black text-sm lg:text-xl"><CountUpAnim end={tierCounts.Silver} /></p>
                        </div>

                        {/* Gold */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-yellow-100 via-yellow-200 to-amber-300 text-amber-700 border border-yellow-300 rounded-xl lg:rounded-2xl p-2 lg:p-2.5 shadow-sm hover:scale-105 transition-transform cursor-default">
                            <p className="text-[8px] lg:text-[9px] font-black mb-0.5 uppercase tracking-widest opacity-80">Gold</p>
                            <p className="font-black text-sm lg:text-xl"><CountUpAnim end={tierCounts.Gold} /></p>
                        </div>

                        {/* Diamond */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 border border-blue-300 rounded-xl lg:rounded-2xl p-2 lg:p-2.5 shadow-sm hover:scale-105 transition-transform cursor-default">
                            <p className="text-[8px] lg:text-[9px] font-black mb-0.5 uppercase tracking-widest opacity-80">Diamond</p>
                            <p className="font-black text-sm lg:text-xl"><CountUpAnim end={tierCounts.Diamond} /></p>
                        </div>

                    </div>
                </div>
            </div>

            {/* 🎞️ 2. Staggered Data Table */}
            <div className="bg-white rounded-[2rem] border border-stone-100 shadow-xl shadow-stone-200/30 flex flex-col flex-1 min-h-0 overflow-hidden relative">
                {showArchived && (
                    <div className="bg-red-50 text-red-600 p-2 text-center text-xs font-bold border-b border-red-100">
                        <span className="material-symbols-outlined text-[14px] align-middle mr-1">warning</span>
                        กำลังแสดงรายชื่อลูกค้าที่ถูกระงับการใช้งาน (Archived)
                    </div>
                )}

                <div className="flex-1 overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[1050px]">
                        <thead className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-stone-100 shadow-sm">
                            <tr>
                                <th className="py-5 px-6 text-xs font-black text-stone-400 uppercase tracking-widest w-20 whitespace-nowrap">NO.</th>
                                <th className="py-5 px-6 text-xs font-black text-stone-400 uppercase tracking-widest whitespace-nowrap">ลูกค้า</th>
                                <th className="py-5 px-6 text-xs font-black text-stone-400 uppercase tracking-widest text-center whitespace-nowrap">ระดับ</th>
                                <th className="py-5 px-6 text-xs font-black text-stone-400 uppercase tracking-widest text-right whitespace-nowrap">ยอดสะสม</th>
                                <th className="py-5 px-6 text-xs font-black text-stone-400 uppercase tracking-widest text-right whitespace-nowrap">E-WALLET (฿)</th>
                                <th className="py-5 px-6 text-xs font-black text-stone-400 uppercase tracking-widest text-center whitespace-nowrap">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                            {filteredMembers.length === 0 ? (
                                <tr><td colSpan="6" className="py-16 text-center text-stone-400 font-bold">ไม่พบข้อมูลลูกค้า</td></tr>
                            ) : filteredMembers.map((member, index) => {
                                const tier = getTier(member);
                                const displayName = member.nickname ? `${member.nickname} (${member.name})` : member.name;
                                const avatarChar = (member.nickname || member.name || '?').charAt(0);

                                return (
                                    <tr key={member.id} className="animate-stagger hover:bg-stone-50/50 transition-colors group" style={{ animationDelay: `${index * 50}ms` }}>
                                        <td className="py-4 px-6 whitespace-nowrap"><span className="font-bold text-stone-400 text-sm">{(index + 1).toString().padStart(2, '0')}</span></td>
                                        <td className="py-4 px-6 whitespace-nowrap">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm shrink-0 uppercase shadow-inner ${showArchived ? 'bg-stone-200 text-stone-500' : 'bg-gradient-to-br from-stone-100 to-stone-200 text-stone-700'}`}>
                                                    {avatarChar}
                                                </div>
                                                <div className={showArchived ? 'opacity-50' : ''}>
                                                    <p className="font-black text-[15px] text-stone-800">{displayName} {showArchived && '(ถูกระงับ)'}</p>
                                                    <p className="text-[11px] text-stone-400 font-bold mt-0.5">{fPhone(member.phone)} {member.age ? `• อายุ ${member.age} ปี` : ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center whitespace-nowrap">
                                            <div className={`w-[90px] mx-auto py-1.5 text-[11px] font-black rounded-full shadow-sm flex items-center justify-center transition-all tracking-wider ${showArchived ? 'bg-stone-200 text-stone-400 opacity-50' : tier.color}`}>
                                                {tier.name}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right whitespace-nowrap"><span className={`font-black ${showArchived ? 'text-stone-400' : 'text-stone-500'}`}>฿{fMoney(member.points)}</span></td>
                                        <td className="py-4 px-6 text-right whitespace-nowrap"><span className={`font-black text-lg ${showArchived ? 'text-stone-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-[#861b00] to-red-600'}`}>฿{fMoney(member.wallet)}</span></td>
                                        <td className="py-4 px-6 whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                                                {!showArchived ? (
                                                    <>
                                                        <button onClick={() => { setTopupMember(member); setTopupStep('AMOUNT'); }} className="flex items-center gap-1 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[11px] font-bold hover:bg-emerald-500 hover:text-white hover:shadow-lg hover:shadow-emerald-500/30 transition-all"><span className="material-symbols-outlined text-[15px]">payments</span> เติมเงิน</button>
                                                        <button onClick={() => setCouponMember(member)} className="flex items-center gap-1 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-[11px] font-bold hover:bg-amber-500 hover:text-white hover:shadow-lg hover:shadow-amber-500/30 transition-all"><span className="material-symbols-outlined text-[15px]">confirmation_number</span> แจกคูปอง</button>
                                                        <button onClick={() => { setEditMember(member); setEditForm({ nickname: member.nickname || '', name: member.name || '', age: member.age || '', dob: member.dob || '', phone: member.phone || '', pin: member.pin || '' }); }} className="flex items-center gap-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[11px] font-bold hover:bg-blue-500 hover:text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all"><span className="material-symbols-outlined text-[15px]">edit</span> แก้ไข</button>
                                                        <button onClick={() => setDeleteMember(member)} className="flex items-center gap-1 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[11px] font-bold hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/30 transition-all"><span className="material-symbols-outlined text-[15px]">archive</span> ระงับ</button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => handleRestoreMember(member)} className="flex items-center gap-1 px-5 py-2.5 bg-stone-800 text-white rounded-xl text-[11px] font-bold hover:bg-black transition-all shadow-md"><span className="material-symbols-outlined text-[15px]">restore</span> กู้คืนบัญชี</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ================= MODALS ================= */}

            {/* 🎈 4. Bouncy Modal (Add Member) */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsAddModalOpen(false)} />
                    <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-8 max-w-lg w-full relative z-10 shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white animate-bounce-modal">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-[#861b00] to-red-600 flex items-center gap-2"><span className="material-symbols-outlined text-[28px] text-[#861b00]">person_add</span> เพิ่มสมาชิกลูกค้า</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 flex justify-center items-center bg-stone-100 text-stone-500 rounded-full hover:bg-stone-200 transition-colors"><span className="material-symbols-outlined text-sm">close</span></button>
                        </div>
                        <form onSubmit={handleAddMember} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-stone-400 block mb-1 uppercase tracking-wider">ชื่อเล่น <span className="text-red-500">*</span></label><input autoFocus value={newMember.nickname} onChange={(e) => setNewMember({ ...newMember, nickname: e.target.value })} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-[#861b00]/10 focus:border-[#861b00] transition-all" required /></div>
                                <div><label className="text-[10px] font-bold text-stone-400 block mb-1 uppercase tracking-wider">ชื่อ-นามสกุล <span className="text-red-500">*</span></label><input value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-[#861b00]/10 focus:border-[#861b00] transition-all" required /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-stone-400 block mb-1 uppercase tracking-wider">วันเกิด</label><input type="date" value={newMember.dob} onChange={(e) => handleDobChange(e, false)} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-[#861b00]/10 focus:border-[#861b00] transition-all text-sm text-stone-700" /></div>
                                <div><label className="text-[10px] font-bold text-stone-400 block mb-1 uppercase tracking-wider">อายุ (ปี)</label><input type="number" value={newMember.age} onChange={(e) => setNewMember({ ...newMember, age: e.target.value })} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-[#861b00]/10 focus:border-[#861b00] transition-all text-stone-700" placeholder="0" /></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-stone-100 pt-4">
                                <div><label className="text-[10px] font-bold text-stone-400 block mb-1 uppercase tracking-wider">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label><input type="tel" value={newMember.phone} onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-black text-stone-700 tracking-wider outline-none focus:ring-4 focus:ring-[#861b00]/10 focus:border-[#861b00] transition-all" placeholder="08XXXXXXXX" maxLength="10" required /></div>
                                <div><label className="text-[10px] font-bold text-[#861b00] block mb-1 uppercase tracking-wider">รหัส PIN 6 หลัก <span className="text-red-500">*</span></label><input type="password" value={newMember.pin} onChange={(e) => setNewMember({ ...newMember, pin: e.target.value })} className="w-full p-3.5 bg-amber-50/50 border border-amber-200 rounded-2xl font-black text-center tracking-[0.5em] text-[#861b00] outline-none focus:ring-4 focus:ring-amber-400/20 focus:border-amber-400 transition-all shadow-inner" placeholder="••••••" maxLength="6" required /></div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 bg-stone-100 font-bold text-stone-500 rounded-2xl hover:bg-stone-200 transition-colors">ยกเลิก</button>
                                <button type="submit" className="flex-[2] py-4 bg-gradient-to-r from-[#861b00] to-[#a12c12] text-white font-black rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">บันทึกข้อมูลสมาชิก</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editMember && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setEditMember(null)} />
                    <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-8 max-w-lg w-full relative z-10 shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white animate-bounce-modal">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center gap-2"><span className="material-symbols-outlined text-[28px] text-blue-600">edit_document</span> แก้ไขข้อมูล</h3>
                            <button onClick={() => setEditMember(null)} className="w-8 h-8 flex justify-center items-center bg-stone-100 text-stone-500 rounded-full hover:bg-stone-200"><span className="material-symbols-outlined text-sm">close</span></button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-stone-400 block mb-1 uppercase tracking-wider">ชื่อเล่น <span className="text-red-500">*</span></label><input autoFocus value={editForm.nickname} onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" required /></div>
                                <div><label className="text-[10px] font-bold text-stone-400 block mb-1 uppercase tracking-wider">ชื่อ-นามสกุล <span className="text-red-500">*</span></label><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" required /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-stone-400 block mb-1 uppercase tracking-wider">วันเกิด</label><input type="date" value={editForm.dob} onChange={(e) => handleDobChange(e, true)} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm text-stone-700" /></div>
                                <div><label className="text-[10px] font-bold text-stone-400 block mb-1 uppercase tracking-wider">อายุ (ปี)</label><input type="number" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-stone-700" placeholder="0" /></div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 border-t border-stone-100 pt-4">
                                <div><label className="text-[10px] font-bold text-stone-400 block mb-1 uppercase tracking-wider">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label><input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-black text-stone-700 tracking-wider outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" placeholder="08XXXXXXXX" maxLength="10" required /></div>
                            </div>
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-2xl mt-4 flex justify-between items-center shadow-inner">
                                <div>
                                    <p className="font-bold text-blue-800 text-sm flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px] text-blue-500">shield_locked</span> การตั้งค่ารหัสผ่าน</p>
                                    <p className="text-[10px] text-blue-500/70 mt-0.5 font-bold uppercase">รีเซ็ต PIN กรณีลูกค้าลืมรหัส</p>
                                </div>
                                <button type="button" onClick={() => setIsResetPinModalOpen(true)} className="bg-white text-blue-600 px-4 py-2.5 rounded-xl font-black text-xs shadow-sm hover:shadow-md hover:scale-105 transition-all flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px]">lock_reset</span> รีเซ็ต PIN
                                </button>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setEditMember(null)} className="flex-1 py-4 bg-stone-100 font-bold text-stone-500 rounded-2xl hover:bg-stone-200 transition-colors">ยกเลิก</button>
                                <button type="submit" className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">บันทึกการเปลี่ยนแปลง</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 🛡️ 5. Neumorphism Keypad & Bouncy Modals (Archive / Delete) */}
            {(isArchivePinOpen || deleteMember) && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => { setIsArchivePinOpen(false); closeDeleteModal(); }} />
                    <div className="bg-[#f8fafc] rounded-[2.5rem] p-8 w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative z-10 animate-bounce-modal flex flex-col items-center text-center border border-white">
                        <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner ${deleteMember ? 'bg-red-100 text-red-600' : 'bg-stone-200 text-stone-600'}`}>
                            <span className="material-symbols-outlined text-4xl">{deleteMember ? 'warning' : 'lock'}</span>
                        </div>
                        <h2 className="text-2xl font-black text-stone-800 mb-1">ยืนยันสิทธิ์พนักงาน</h2>
                        <p className="text-stone-500 font-bold text-[13px] mb-8 leading-tight">{deleteMember ? `กรอกรหัสพนักงานเพื่อยืนยัน\nระงับบัญชีคุณ ${deleteMember.nickname || deleteMember.name}` : 'กรอกรหัสพนักงานเพื่อ\nเข้าดูรายชื่อที่ถูกระงับ'}</p>

                        <div className="flex justify-center mb-8 gap-4 bg-stone-200/50 p-4 rounded-2xl shadow-inner w-full">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className={`w-3.5 h-3.5 rounded-full transition-colors duration-300 ${(deleteMember ? deletePin : archivePin).length > i ? (deleteMember ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-stone-800 shadow-[0_0_8px_rgba(0,0,0,0.3)]') : 'bg-stone-300'}`}></div>
                            ))}
                        </div>

                        <div className="grid grid-cols-3 gap-4 w-full mb-8">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                <button key={num} onClick={() => deleteMember ? handleDeleteNumClick(num) : handleArchivePinClick(num)} className="neumorph-btn py-4 font-black text-2xl rounded-2xl text-stone-700 flex items-center justify-center">
                                    {num === 'DEL' ? <span className="material-symbols-outlined text-3xl">backspace</span> : num}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3 w-full">
                            <button onClick={() => { setIsArchivePinOpen(false); closeDeleteModal(); setArchivePin(''); }} className="flex-1 py-4 font-bold text-stone-400 hover:text-stone-600">ยกเลิก</button>
                            <button onClick={deleteMember ? handleVerifyDeletePin : handleVerifyArchivePin} disabled={(deleteMember ? deletePin : archivePin).length < 6} className={`flex-[2] py-4 rounded-2xl text-white font-black text-lg transition-all ${(deleteMember ? deletePin : archivePin).length >= 6 ? (deleteMember ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-lg shadow-red-500/30' : 'bg-gradient-to-r from-stone-700 to-stone-900 shadow-lg shadow-stone-800/30') : 'bg-stone-300'}`}>ยืนยัน</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🛡️ Reset PIN Modal (Neumorphism Keypad) */}
            {isResetPinModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={closeResetPinModal} />
                    <div className="bg-[#f8fafc] rounded-[2.5rem] p-8 w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative z-10 animate-bounce-modal flex flex-col items-center text-center border border-white">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-[1.2rem] flex items-center justify-center mb-4 shadow-inner">
                            <span className="material-symbols-outlined text-3xl">{resetPinStep === 'NEW_PIN' ? 'dialpad' : 'admin_panel_settings'}</span>
                        </div>
                        <h2 className="text-2xl font-black text-stone-800 mb-1">{resetPinStep === 'NEW_PIN' ? 'ตั้งรหัสผ่านใหม่' : 'ยืนยันสิทธิ์พนักงาน'}</h2>
                        <p className="text-stone-500 font-bold text-xs mb-8">{resetPinStep === 'NEW_PIN' ? `รหัส PIN 6 หลัก ของคุณ ${editForm.nickname || editForm.name}` : `เพื่อยืนยันการเปลี่ยน PIN ของคุณ ${editForm.nickname || editForm.name}`}</p>

                        <div className="flex justify-center mb-8 gap-4 bg-stone-200/50 p-4 rounded-2xl shadow-inner w-full">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className={`w-3.5 h-3.5 rounded-full transition-colors duration-300 ${(resetPinStep === 'NEW_PIN' ? newCustomerPin : employeeConfirmPin).length > i ? (resetPinStep === 'NEW_PIN' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-stone-800 shadow-[0_0_8px_rgba(0,0,0,0.3)]') : 'bg-stone-300'}`}></div>
                            ))}
                        </div>

                        <div className="grid grid-cols-3 gap-4 w-full mb-8">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                <button key={num} onClick={() => handleResetNumClick(num, resetPinStep)} className="neumorph-btn py-4 font-black text-2xl rounded-2xl text-stone-700 flex items-center justify-center">
                                    {num === 'DEL' ? <span className="material-symbols-outlined text-3xl">backspace</span> : num}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3 w-full">
                            <button onClick={resetPinStep === 'NEW_PIN' ? closeResetPinModal : () => { setResetPinStep('NEW_PIN'); setEmployeeConfirmPin(''); }} className="flex-1 py-4 font-bold text-stone-400 hover:text-stone-600">ย้อนกลับ</button>
                            <button onClick={resetPinStep === 'NEW_PIN' ? proceedToEmployeePin : executePinReset} disabled={(resetPinStep === 'NEW_PIN' ? newCustomerPin : employeeConfirmPin).length < 6} className={`flex-[2] py-4 rounded-2xl text-white font-black text-lg transition-all ${(resetPinStep === 'NEW_PIN' ? newCustomerPin : employeeConfirmPin).length >= 6 ? (resetPinStep === 'NEW_PIN' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30' : 'bg-gradient-to-r from-stone-700 to-stone-900 shadow-lg shadow-stone-800/30') : 'bg-stone-300'}`}>{resetPinStep === 'NEW_PIN' ? 'ถัดไป' : 'ยืนยันรีเซ็ต'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 💸 เติมเงิน Modal */}
            {topupMember && topupStep !== 'SUCCESS' && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={closeTopupModal} />

                    {topupStep === 'AMOUNT' && (
                        <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-8 max-w-sm w-full relative z-10 shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-bounce-modal text-center border border-white">

                            {/* 🌟 ปุ่ม X มุมขวาบน สำหรับยกเลิก */}
                            <button onClick={closeTopupModal} className="absolute top-6 right-6 w-8 h-8 flex justify-center items-center bg-stone-100 text-stone-500 rounded-full hover:bg-stone-200 transition-colors">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>

                            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                                <span className="material-symbols-outlined text-4xl">account_balance_wallet</span>
                            </div>
                            <h3 className="font-black text-2xl text-stone-800 mb-1">เติมเงิน E-Wallet</h3>
                            <p className="text-sm font-bold text-stone-400 mb-8">คุณ {topupMember.nickname || topupMember.name}</p>

                            <form onSubmit={(e) => e.preventDefault()}>
                                <div className="relative mb-6">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-emerald-600/50">฿</span>
                                    <input type="number" autoFocus value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} className="w-full pl-16 pr-6 py-5 bg-emerald-50/50 border-2 border-emerald-100 rounded-3xl font-black text-5xl text-center text-emerald-600 outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-inner" placeholder="0" />
                                </div>
                                <div className="grid grid-cols-3 gap-3 mb-8">
                                    {[100, 300, 500].map(amt => (
                                        <button type="button" key={amt} onClick={() => setTopupAmount(amt.toString())} className="py-3 bg-stone-50 rounded-2xl font-black text-stone-600 hover:bg-stone-100 hover:scale-105 active:scale-95 transition-all border border-stone-200/50 shadow-sm">+{amt}</button>
                                    ))}
                                </div>

                                {/* 🌟 2 ปุ่มชำระเงินแทนปุ่มถัดไป */}
                                <p className="text-[10px] font-bold text-stone-400 mb-2 uppercase tracking-widest text-left pl-2">เลือกช่องทางรับเงิน</p>
                                <div className="grid grid-cols-2 gap-3 mb-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (parseFloat(topupAmount) > 0) {
                                                setTopupMethod('CASH');
                                                setTopupStep('PIN');
                                            } else alert('กรุณาระบุจำนวนเงิน');
                                        }}
                                        className="py-4 bg-emerald-50 text-emerald-600 border border-emerald-200 font-black rounded-2xl shadow-sm hover:bg-emerald-500 hover:text-white transition-all flex flex-col items-center justify-center gap-1 group active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-[28px] group-hover:scale-110 transition-transform">payments</span>
                                        เงินสด
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (parseFloat(topupAmount) > 0) {
                                                setTopupMethod('QR');
                                                setTopupStep('PIN');
                                            } else alert('กรุณาระบุจำนวนเงิน');
                                        }}
                                        className="py-4 bg-blue-50 text-blue-600 border border-blue-200 font-black rounded-2xl shadow-sm hover:bg-blue-500 hover:text-white transition-all flex flex-col items-center justify-center gap-1 group active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-[28px] group-hover:scale-110 transition-transform">qr_code_scanner</span>
                                        QR Payment
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {topupStep === 'PIN' && (
                        <div className="bg-[#f8fafc] rounded-[2.5rem] p-8 w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative z-10 animate-bounce-modal flex flex-col items-center text-center border border-white">
                            <div className="w-16 h-16 bg-stone-200 text-stone-600 rounded-[1.2rem] flex items-center justify-center mb-4 shadow-inner"><span className="material-symbols-outlined text-3xl">admin_panel_settings</span></div>
                            <h2 className="text-2xl font-black text-stone-800 mb-1">ยืนยันสิทธิ์พนักงาน</h2>
                            <p className="text-stone-500 font-bold text-sm mb-2">เพื่อเติมเงินให้คุณ {topupMember.nickname || topupMember.name}</p>
                            <p className="text-emerald-500 font-black text-2xl mb-6">ยอดเติม: ฿{parseFloat(topupAmount).toLocaleString()}</p>

                            <div className="flex justify-center mb-8 gap-4 bg-stone-200/50 p-4 rounded-2xl shadow-inner w-full">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className={`w-3.5 h-3.5 rounded-full transition-colors duration-300 ${topupPin.length > i ? 'bg-stone-800 shadow-[0_0_8px_rgba(0,0,0,0.3)]' : 'bg-stone-300'}`}></div>
                                ))}
                            </div>
                            <div className="grid grid-cols-3 gap-4 w-full mb-8">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                    <button key={num} onClick={() => handleTopupNumClick(num)} className="neumorph-btn py-4 font-black text-2xl rounded-2xl text-stone-700 flex items-center justify-center">
                                        {num === 'DEL' ? <span className="material-symbols-outlined text-3xl">backspace</span> : num}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => { setTopupStep('AMOUNT'); setTopupPin(''); }} className="flex-1 py-4 font-bold text-stone-400 hover:text-stone-600">ย้อนกลับ</button>
                                <button onClick={handleVerifyTopupPin} disabled={topupPin.length < 6} className={`flex-[2] py-4 text-white font-black rounded-2xl text-lg transition-all ${topupPin.length >= 6 ? 'bg-gradient-to-r from-stone-700 to-stone-900 shadow-lg shadow-stone-800/30' : 'bg-stone-300'}`}>ยืนยันเติมเงิน</button>
                            </div>
                        </div>
                    )}
                    {topupStep === 'QR_WAITING' && (
                        <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative z-10 animate-bounce-modal flex flex-col items-center text-center border border-white">
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-[1.2rem] flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-3xl">qr_code_2</span>
                            </div>
                            <h2 className="text-2xl font-black text-stone-800 mb-1">สแกน QR PromptPay</h2>
                            <p className="text-stone-500 font-bold text-sm mb-2">คุณ {topupMember.nickname || topupMember.name}</p>
                            <p className="text-blue-600 font-black text-2xl mb-6">฿{parseFloat(topupAmount).toLocaleString()}</p>
                            {qrCodeUri
                                ? <img src={qrCodeUri} alt="PromptPay QR" className="w-56 h-56 rounded-2xl border-4 border-blue-100 mb-6 shadow-lg" />
                                : <div className="w-56 h-56 rounded-2xl bg-stone-100 flex items-center justify-center mb-6 animate-pulse"><span className="text-stone-400 text-sm font-bold">กำลังโหลด QR...</span></div>
                            }
                            <p className="text-stone-400 font-bold text-sm animate-pulse mb-6">⏳ รอการยืนยันการชำระเงิน...</p>
                            <button onClick={closeTopupModal} className="w-full py-3 font-bold text-stone-400 hover:text-stone-600">ยกเลิก</button>
                        </div>
                    )}
                </div>
            )}

            {/* 🎟️ 6. Ticket UI Coupon Modal */}
            {couponMember && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={closeCouponModal} />

                    {!isCouponSuccess ? (
                        <div className="bg-[#f8fafc] rounded-[2.5rem] p-8 w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative z-10 animate-bounce-modal flex flex-col items-center text-center border border-white">
                            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-50 text-white rounded-[1.2rem] flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30">
                                <span className="material-symbols-outlined text-3xl">redeem</span>
                            </div>
                            <h2 className="text-xl font-black text-stone-800 mb-1">ยืนยันแจกคูปอง</h2>
                            <p className="text-stone-500 font-bold text-xs mb-8">กรอกรหัสพนักงานเพื่อแจกคูปองให้คุณ {couponMember.nickname || couponMember.name}</p>

                            <div className="flex justify-center mb-8 gap-4 bg-stone-200/50 p-4 rounded-2xl shadow-inner w-full">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className={`w-3.5 h-3.5 rounded-full transition-colors duration-300 ${couponPin.length > i ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-stone-300'}`}></div>
                                ))}
                            </div>
                            <div className="grid grid-cols-3 gap-4 w-full mb-8">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                    <button key={num} onClick={() => handleCouponNumClick(num)} className="neumorph-btn py-4 font-black text-2xl rounded-2xl text-stone-700 flex items-center justify-center">
                                        {num === 'DEL' ? <span className="material-symbols-outlined text-3xl">backspace</span> : num}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-3 w-full">
                                <button onClick={closeCouponModal} className="flex-1 py-4 font-bold text-stone-400 hover:text-stone-600">ยกเลิก</button>
                                <button onClick={handleVerifyCouponPin} disabled={couponPin.length < 6} className={`flex-[2] py-4 text-white font-black rounded-2xl text-lg transition-all ${couponPin.length >= 6 ? 'bg-gradient-to-r from-amber-500 to-yellow-500 shadow-lg shadow-amber-500/40' : 'bg-stone-300'}`}>แจกคูปอง</button>
                            </div>
                        </div>
                    ) : (
                        // 🎟️ Golden Ticket Style Success
                        <div className="bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 rounded-[2rem] p-1 w-full max-w-sm shadow-[0_20px_50px_rgba(245,158,11,0.4)] relative z-10 animate-bounce-modal">
                            <div className="bg-white/95 backdrop-blur-xl rounded-[1.8rem] p-8 flex flex-col items-center text-center relative overflow-hidden">
                                {/* Ticket Notches */}
                                <div className="absolute top-1/2 -left-4 w-8 h-8 bg-stone-900/60 rounded-full"></div>
                                <div className="absolute top-1/2 -right-4 w-8 h-8 bg-stone-900/60 rounded-full"></div>
                                <div className="absolute top-1/2 left-4 right-4 border-t-4 border-amber-200 border-dashed"></div>

                                <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-yellow-50 text-amber-500 rounded-full flex items-center justify-center mb-8 border-4 border-amber-200 relative z-10 shadow-lg">
                                    <span className="material-symbols-outlined text-6xl drop-shadow-md">redeem</span>
                                </div>
                                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-500 mb-2 relative z-10">แจกคูปองสำเร็จ!</h2>
                                <p className="text-stone-500 font-bold text-sm mb-10 leading-relaxed relative z-10">ระบบได้ส่ง SMS แจ้งเตือนคูปองให้คุณ<br /><span className="text-amber-600 font-black">{couponMember.name}</span> เรียบร้อยแล้ว</p>

                                <button onClick={closeCouponModal} className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black rounded-2xl shadow-xl shadow-amber-500/40 transition-all active:scale-95 text-lg relative z-10">
                                    ปิดหน้าต่าง
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}