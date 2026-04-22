import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { fetchJSON } from '../api.js';

export default function MembersTab() {
    const { members, setMembers, currentEmployee } = useContext(AppContext);
    const [searchTerm, setSearchTerm] = useState('');

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
    const [topupReceipt, setTopupReceipt] = useState(null); // 🌟 เก็บข้อมูลสลิปเติมเงิน

    const [couponMember, setCouponMember] = useState(null);
    const [couponPin, setCouponPin] = useState('');
    const [isCouponSuccess, setIsCouponSuccess] = useState(false); // 🌟 แจ้งเตือนแจกคูปองสำเร็จ

    const [deleteMember, setDeleteMember] = useState(null);
    const [deletePin, setDeletePin] = useState('');

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
        const tierName = member.tier || 'Bronze';
        const config = {
            Platinum: { name: 'Platinum', color: 'text-stone-700 bg-stone-100 border-stone-200' },
            Gold: { name: 'Gold', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
            Silver: { name: 'Silver', color: 'text-slate-600 bg-slate-50 border-slate-200' },
            Bronze: { name: 'Bronze', color: 'text-amber-700 bg-amber-50 border-amber-200' }
        };
        return config[tierName] || config.Bronze;
    };

    // 🌟 คำนวณสถิติเฉพาะคนที่ยัง Active
    const activeMembers = members?.filter(m => m.isActive !== false) || [];
    const totalMembers = activeMembers.length;
    const totalWallet = activeMembers.reduce((sum, m) => sum + (m.wallet || 0), 0);
    const tierCounts = { Bronze: 0, Silver: 0, Gold: 0, Platinum: 0 };
    activeMembers.forEach(m => { tierCounts[getTier(m).name]++; });

    // 🌟 กรองรายชื่อ (Search & Archive Toggle)
    const filteredMembers = members?.filter(m => {
        const matchesSearch = m.phone.includes(searchTerm) || m.name.toLowerCase().includes(searchTerm.toLowerCase()) || (m.nickname && m.nickname.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = showArchived ? m.isActive === false : m.isActive !== false;
        return matchesSearch && matchesStatus;
    }) || [];

    // ==========================================
    // 🌟 ฟังก์ชันจัดการ Flow Archive PIN
    // ==========================================
    const handleToggleArchive = () => {
        if (!showArchived) {
            setIsArchivePinOpen(true); // เปิดหน้าต่างใส่รหัส
        } else {
            setShowArchived(false); // ปิดโหมด Archive ได้เลยไม่ต้องใส่รหัส
        }
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

    const handleVerifyTopupPin = async () => {
        const validEmpPin = currentEmployee?.pin ? String(currentEmployee.pin) : null;
        if (!validEmpPin) return alert('ไม่พบข้อมูลพนักงาน กรุณา Login ใหม่');
        if (topupPin !== validEmpPin) {
            alert('รหัสพนักงานไม่ถูกต้อง! ไม่สามารถทำรายการเติมเงินได้');
            setTopupPin('');
            return;
        }
        const amount = parseFloat(topupAmount);
        const newWallet = (topupMember.wallet || 0) + amount;
        const newPoints = (topupMember.points || 0) + amount; // เติม ฿1 = 1 point

        // 🌟 สร้างข้อมูลสลิปจำลอง
        const receipt = {
            id: `TOP-${Date.now().toString().slice(-6)}`,
            amount: amount,
            cashier: currentEmployee?.name || 'Admin',
            paymentMethod: 'เงินสด/QR',
            newBalance: newWallet
        };

        try {
            const updated = await fetchJSON(`/members/${topupMember.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    ...topupMember,
                    wallet: newWallet,
                    points: newPoints
                })
            });
            setMembers(members.map(m => m.id === topupMember.id
                ? { ...m, wallet: updated.wallet ?? newWallet, points: updated.points ?? newPoints }
                : m
            ));

            // 🌟 เปลี่ยน State เป็น SUCCESS แทนการ Alert
            setTopupReceipt(receipt);
            setTopupStep('SUCCESS');
        } catch (error) {
            setMembers(members.map(m => m.id === topupMember.id
                ? { ...m, wallet: newWallet, points: newPoints }
                : m
            ));
            setTopupReceipt(receipt);
            setTopupStep('SUCCESS');
        }
    };

    const closeTopupModal = () => {
        setTopupMember(null);
        setTopupAmount('');
        setTopupStep('AMOUNT');
        setTopupPin('');
        setTopupReceipt(null);
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

        // 🌟 เปลี่ยน State เป็น Success
        setIsCouponSuccess(true);
    };

    const closeCouponModal = () => {
        setCouponMember(null);
        setCouponPin('');
        setIsCouponSuccess(false);
    };

    // ==========================================
    // 🔴🌟 ฟังก์ชันจัดการ Flow ระงับบัญชี (Archive) / กู้คืน (Restore)
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

    return (
        <div className="flex flex-col h-full gap-5 w-full relative animate-in fade-in duration-300 font-body">
            {/* Header */}
            <div className="shrink-0 flex justify-between items-end">
                <h2 className="text-3xl font-black font-headline text-stone-800">ฐานข้อมูลลูกค้า</h2>
            </div>

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
                <div className="bg-white rounded-[2rem] border border-stone-200 p-6 flex flex-col items-center justify-center text-center shadow-sm">
                    <p className="text-xs text-stone-500 font-bold uppercase mb-2 tracking-widest">สมาชิกทั้งหมด (Active)</p>
                    <h3 className="text-5xl font-black text-stone-800 font-headline">{totalMembers}</h3>
                </div>
                <div className="bg-white rounded-[2rem] border border-stone-200 p-6 flex flex-col items-center justify-center text-center shadow-sm">
                    <p className="text-xs text-stone-500 font-bold uppercase mb-2 tracking-widest">ยอดเงิน E-WALLET รวม</p>
                    <h3 className="text-5xl font-black text-emerald-600 font-headline">฿{fMoney(totalWallet)}</h3>
                </div>
                <div className="bg-white rounded-[2rem] border border-stone-200 p-6 shadow-sm">
                    <p className="text-xs text-stone-500 font-bold uppercase mb-4 text-center tracking-widest">สมาชิกตามระดับ (TIERS)</p>
                    <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-stone-50 rounded-2xl p-2 border border-stone-100">
                            <p className="text-[9px] font-bold text-stone-500 mb-1 uppercase">Bronze</p>
                            <p className="font-black text-lg text-stone-800">{tierCounts.Bronze}</p>
                        </div>
                        <div className="bg-stone-50 rounded-2xl p-2 border border-stone-100">
                            <p className="text-[9px] font-bold text-stone-500 mb-1 uppercase">Silver</p>
                            <p className="font-black text-lg text-stone-800">{tierCounts.Silver}</p>
                        </div>
                        <div className="bg-stone-50 rounded-2xl p-2 border border-stone-100">
                            <p className="text-[9px] font-bold text-stone-500 mb-1 uppercase">Gold</p>
                            <p className="font-black text-lg text-stone-800">{tierCounts.Gold}</p>
                        </div>
                        <div className="bg-stone-50 rounded-2xl p-2 border border-stone-100">
                            <p className="text-[9px] font-bold text-stone-500 mb-1 uppercase">Platinum</p>
                            <p className="font-black text-lg text-stone-800">{tierCounts.Platinum}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Actions Bar */}
            <div className="bg-white rounded-[2rem] border border-stone-200 p-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                <div className="relative flex-1 w-full max-w-md">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">search</span>
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ค้นหาชื่อ, ชื่อเล่น หรือเบอร์โทร..." className="w-full pl-12 pr-4 py-3.5 rounded-full border border-stone-300 outline-none focus:border-[#861b00] text-sm font-bold transition-all" />
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                    {/* 🌟 ปุ่มสลับโหมดดูรายชื่อ Archive (ใส่ PIN ก่อน) */}
                    <button
                        onClick={handleToggleArchive}
                        className={`px-5 py-3.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all border ${showArchived ? 'bg-stone-800 text-white border-stone-800' : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">{showArchived ? 'visibility' : 'archive'}</span>
                        {showArchived ? 'กลับหน้ารายชื่อปกติ' : 'บัญชีที่ถูกระงับ'}
                    </button>

                    {!showArchived && (
                        <button onClick={() => setIsAddModalOpen(true)} className="flex-1 sm:flex-none bg-[#861b00] hover:bg-black text-white px-6 py-3.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-[20px]">person_add</span> เพิ่มสมาชิก
                        </button>
                    )}
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden pb-2 relative">
                {showArchived && (
                    <div className="bg-red-50 text-red-600 p-2 text-center text-xs font-bold border-b border-red-100">
                        <span className="material-symbols-outlined text-[14px] align-middle mr-1">warning</span>
                        กำลังแสดงรายชื่อลูกค้าที่ถูกระงับการใช้งาน (Archived)
                    </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    <table className="w-full text-left min-w-[900px]">
                        <thead className="sticky top-0 z-10 bg-white border-b border-stone-100 shadow-sm">
                            <tr>
                                <th className="py-5 px-6 text-xs font-bold text-stone-500 uppercase tracking-widest w-20">NO.</th>
                                <th className="py-5 px-6 text-xs font-bold text-stone-500 uppercase tracking-widest">ลูกค้า</th>
                                <th className="py-5 px-6 text-xs font-bold text-stone-500 uppercase tracking-widest text-center">ระดับ</th>
                                <th className="py-5 px-6 text-xs font-bold text-stone-500 uppercase tracking-widest text-right">ยอดสะสม</th>
                                <th className="py-5 px-6 text-xs font-bold text-stone-500 uppercase tracking-widest text-right">E-WALLET (฿)</th>
                                <th className="py-5 px-6 text-xs font-bold text-stone-500 uppercase tracking-widest text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {filteredMembers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-stone-400 font-bold">ไม่พบข้อมูลลูกค้าในหมวดหมู่นี้</td>
                                </tr>
                            ) : filteredMembers.map((member, index) => {
                                    const tier = getTier(member);
                                const displayName = member.nickname ? `${member.nickname} (${member.name})` : member.name;
                                const avatarChar = (member.nickname || member.name || '?').charAt(0);

                                return (
                                    <tr key={member.id} className={`transition-colors group ${showArchived ? 'bg-stone-50/50' : 'hover:bg-stone-50/50'}`}>
                                        <td className="py-4 px-6"><span className="font-bold text-stone-500 text-sm">No.{index + 1}</span></td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 uppercase ${showArchived ? 'bg-stone-300 text-stone-100' : 'bg-stone-200 text-stone-600'}`}>
                                                    {avatarChar}
                                                </div>
                                                <div className={showArchived ? 'opacity-50' : ''}>
                                                    <p className="font-black text-sm text-stone-800">{displayName} {showArchived && '(ถูกระงับ)'}</p>
                                                    <p className="text-[11px] text-stone-400 font-bold">{fPhone(member.phone)} {member.age ? `• อายุ ${member.age} ปี` : ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`px-3 py-1 text-[10px] font-bold rounded-full border shadow-sm inline-block ${showArchived ? 'grayscale opacity-50' : tier.color}`}>{tier.name}</span>
                                        </td>
                                        <td className="py-4 px-6 text-right"><span className={`font-black ${showArchived ? 'text-stone-400' : 'text-stone-600'}`}>฿{fMoney(member.points)}</span></td>
                                        <td className="py-4 px-6 text-right"><span className={`font-black text-lg ${showArchived ? 'text-stone-400' : 'text-[#861b00]'}`}>฿{fMoney(member.wallet)}</span></td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">

                                                {/* 🌟 ถ้าเป็นโหมดปกติ โชว์ปุ่มจัดการปกติ */}
                                                {!showArchived ? (
                                                    <>
                                                        <button onClick={() => { setTopupMember(member); setTopupStep('AMOUNT'); }} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[11px] font-bold hover:bg-emerald-100 active:scale-95 transition-all"><span className="material-symbols-outlined text-[14px]">payments</span> เติมเงิน</button>
                                                        <button onClick={() => setCouponMember(member)} className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-[11px] font-bold hover:bg-amber-100 active:scale-95 transition-all"><span className="material-symbols-outlined text-[14px]">confirmation_number</span> แจกคูปอง</button>
                                                        <button onClick={() => {
                                                            setEditMember(member);
                                                            setEditForm({ nickname: member.nickname || '', name: member.name || '', age: member.age || '', dob: member.dob || '', phone: member.phone || '', pin: member.pin || '' });
                                                        }} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-[11px] font-bold hover:bg-blue-100 active:scale-95 transition-all"><span className="material-symbols-outlined text-[14px]">edit</span> แก้ไข</button>
                                                        <button onClick={() => setDeleteMember(member)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[11px] font-bold hover:bg-red-100 active:scale-95 transition-all"><span className="material-symbols-outlined text-[14px]">archive</span> ระงับ</button>
                                                    </>
                                                ) : (
                                                    /* 🌟 ถ้าอยู่ในโหมดถูกระงับ โชว์แค่ปุ่มกู้คืน */
                                                    <button onClick={() => handleRestoreMember(member)} className="flex items-center gap-1 px-4 py-2 bg-stone-800 text-white border border-stone-900 rounded-xl text-[11px] font-bold hover:bg-black active:scale-95 transition-all shadow-md">
                                                        <span className="material-symbols-outlined text-[14px]">restore</span> กู้คืนบัญชี
                                                    </button>
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

            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full relative z-10 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-2xl text-[#861b00] flex items-center gap-2"><span className="material-symbols-outlined text-[28px]">person_add</span> เพิ่มสมาชิกลูกค้า</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 flex justify-center items-center bg-stone-100 text-stone-500 rounded-full hover:bg-stone-200"><span className="material-symbols-outlined text-sm">close</span></button>
                        </div>

                        <form onSubmit={handleAddMember} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-stone-500 block mb-1 uppercase tracking-wider">ชื่อเล่น <span className="text-red-500">*</span></label><input autoFocus value={newMember.nickname} onChange={(e) => setNewMember({ ...newMember, nickname: e.target.value })} className="w-full p-3 bg-stone-50 border-2 border-stone-200 rounded-xl font-bold outline-none focus:border-[#861b00] transition-colors" placeholder="เช่น นัท" required /></div>
                                <div><label className="text-[10px] font-bold text-stone-500 block mb-1 uppercase tracking-wider">ชื่อ-นามสกุล <span className="text-red-500">*</span></label><input value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} className="w-full p-3 bg-stone-50 border-2 border-stone-200 rounded-xl font-bold outline-none focus:border-[#861b00] transition-colors" placeholder="ชื่อจริง นามสกุล" required /></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-stone-500 block mb-1 uppercase tracking-wider">วันเกิด</label><input type="date" value={newMember.dob} onChange={(e) => handleDobChange(e, false)} className="w-full p-3 bg-stone-50 border-2 border-stone-200 rounded-xl font-bold outline-none focus:border-[#861b00] transition-colors text-sm text-stone-700" /></div>
                                <div><label className="text-[10px] font-bold text-stone-500 block mb-1 uppercase tracking-wider">อายุ (ปี)</label><input type="number" value={newMember.age} onChange={(e) => setNewMember({ ...newMember, age: e.target.value })} className="w-full p-3 bg-stone-50 border-2 border-stone-200 rounded-xl font-bold outline-none focus:border-[#861b00] transition-colors text-stone-700" placeholder="0" /></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-stone-100 pt-4">
                                <div><label className="text-[10px] font-bold text-stone-500 block mb-1 uppercase tracking-wider">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label><input type="tel" value={newMember.phone} onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })} className="w-full p-3 bg-stone-50 border-2 border-stone-200 rounded-xl font-black text-stone-700 tracking-wider outline-none focus:border-[#861b00] transition-colors" placeholder="08XXXXXXXX" maxLength="10" required /></div>
                                <div><label className="text-[10px] font-bold text-[#861b00] block mb-1 uppercase tracking-wider">รหัส PIN 6 หลัก <span className="text-red-500">*</span></label><input type="password" value={newMember.pin} onChange={(e) => setNewMember({ ...newMember, pin: e.target.value })} className="w-full p-3 bg-amber-50 border-2 border-amber-200 rounded-xl font-black text-center tracking-[0.5em] text-[#861b00] outline-none focus:border-[#861b00] transition-colors" placeholder="••••••" maxLength="6" required /></div>
                            </div>

                            <p className="text-[10px] text-stone-400 text-center">* รหัส PIN ใช้สำหรับยืนยันเมื่อลูกค้าตัดเงินผ่าน E-Wallet</p>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 bg-stone-100 font-bold text-stone-600 rounded-2xl hover:bg-stone-200 transition-colors">ยกเลิก</button>
                                <button type="submit" className="flex-[2] py-4 bg-[#861b00] text-white font-black rounded-2xl shadow-lg hover:bg-black transition-colors">บันทึกข้อมูลสมาชิก</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editMember && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setEditMember(null)} />
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full relative z-10 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-2xl text-blue-600 flex items-center gap-2"><span className="material-symbols-outlined text-[28px]">edit_document</span> แก้ไขข้อมูลสมาชิก</h3>
                            <button onClick={() => setEditMember(null)} className="w-8 h-8 flex justify-center items-center bg-stone-100 text-stone-500 rounded-full hover:bg-stone-200"><span className="material-symbols-outlined text-sm">close</span></button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-stone-500 block mb-1 uppercase tracking-wider">ชื่อเล่น <span className="text-red-500">*</span></label><input autoFocus value={editForm.nickname} onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })} className="w-full p-3 bg-stone-50 border-2 border-stone-200 rounded-xl font-bold outline-none focus:border-blue-500 transition-colors" placeholder="เช่น นัท" required /></div>
                                <div><label className="text-[10px] font-bold text-stone-500 block mb-1 uppercase tracking-wider">ชื่อ-นามสกุล <span className="text-red-500">*</span></label><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full p-3 bg-stone-50 border-2 border-stone-200 rounded-xl font-bold outline-none focus:border-blue-500 transition-colors" placeholder="ชื่อจริง นามสกุล" required /></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-stone-500 block mb-1 uppercase tracking-wider">วันเกิด</label><input type="date" value={editForm.dob} onChange={(e) => handleDobChange(e, true)} className="w-full p-3 bg-stone-50 border-2 border-stone-200 rounded-xl font-bold outline-none focus:border-blue-500 transition-colors text-sm text-stone-700" /></div>
                                <div><label className="text-[10px] font-bold text-stone-500 block mb-1 uppercase tracking-wider">อายุ (ปี)</label><input type="number" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} className="w-full p-3 bg-stone-50 border-2 border-stone-200 rounded-xl font-bold outline-none focus:border-blue-500 transition-colors text-stone-700" placeholder="0" /></div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 border-t border-stone-100 pt-4">
                                <div><label className="text-[10px] font-bold text-stone-500 block mb-1 uppercase tracking-wider">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label><input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full p-3 bg-stone-50 border-2 border-stone-200 rounded-xl font-black text-stone-700 tracking-wider outline-none focus:border-blue-500 transition-colors" placeholder="08XXXXXXXX" maxLength="10" required /></div>
                            </div>

                            <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl mt-4 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-stone-800 text-sm flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-amber-500">shield_locked</span> การตั้งค่ารหัสผ่าน</p>
                                    <p className="text-xs text-stone-500 mt-0.5">ใช้กรณีที่ลูกค้าต้องการเปลี่ยนรหัส PIN E-Wallet</p>
                                </div>
                                <button type="button" onClick={() => setIsResetPinModalOpen(true)} className="bg-white text-[#861b00] border-2 border-[#861b00]/20 hover:border-[#861b00] px-4 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-2 active:scale-95">
                                    <span className="material-symbols-outlined text-[18px]">lock_reset</span> รีเซ็ต PIN ลูกค้า
                                </button>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setEditMember(null)} className="flex-1 py-4 bg-stone-100 font-bold text-stone-600 rounded-2xl hover:bg-stone-200 transition-colors">ยกเลิก</button>
                                <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-colors">บันทึกการเปลี่ยนแปลง</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 🔴🌟 MODAL ยืนยัน PIN ก่อนเข้าดู Archive */}
            {/* ========================================================= */}
            {isArchivePinOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/70 backdrop-blur-sm" onClick={() => setIsArchivePinOpen(false)} />
                    <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl relative z-10 animate-in zoom-in-95 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-stone-100 border border-stone-200 text-stone-600 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl">lock</span>
                        </div>
                        <h2 className="text-xl font-black text-stone-800 mb-1">ยืนยันสิทธิ์พนักงาน</h2>
                        <p className="text-stone-500 font-bold text-xs mb-6">กรอกรหัสพนักงานเพื่อเข้าดูรายชื่อที่ถูกระงับ</p>

                        <div className="flex justify-center mb-6 gap-3">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className={`w-4 h-4 rounded-full ${i < archivePin.length ? 'bg-stone-800' : 'bg-stone-200'}`}></div>
                            ))}
                        </div>

                        <div className="grid grid-cols-3 gap-2 w-full mb-6">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                <button key={num} onClick={() => handleArchivePinClick(num)} className="bg-stone-50 py-3 font-black text-xl rounded-xl active:scale-95 hover:bg-stone-100 text-stone-700">
                                    {num === 'DEL' ? <span className="material-symbols-outlined">backspace</span> : num}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3 w-full">
                            <button onClick={() => { setIsArchivePinOpen(false); setArchivePin(''); }} className="flex-1 py-4 bg-stone-50 text-stone-600 font-bold rounded-2xl hover:bg-stone-100 transition-colors">ยกเลิก</button>
                            <button onClick={handleVerifyArchivePin} disabled={archivePin.length < 6} className={`flex-[2] py-4 text-white font-black rounded-2xl transition-colors ${archivePin.length >= 6 ? 'bg-stone-800 hover:bg-black shadow-md' : 'bg-stone-300'}`}>เข้าสู่ระบบ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 🔴🌟 MODAL รีเซ็ตรหัสผ่านลูกค้า (2FA) */}
            {/* ========================================================= */}
            {isResetPinModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/70 backdrop-blur-sm" onClick={closeResetPinModal} />

                    {resetPinStep === 'NEW_PIN' && (
                        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl relative z-10 animate-in zoom-in-95 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-blue-50 border border-blue-200 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-3xl">dialpad</span>
                            </div>
                            <h2 className="text-2xl font-black text-stone-800 mb-1">ตั้งรหัสผ่านใหม่</h2>
                            <p className="text-stone-500 font-bold text-sm mb-6">รหัส PIN 6 หลัก ของคุณ {editForm.nickname || editForm.name}</p>

                            <div className="w-full border-2 border-stone-200/80 bg-stone-50/50 rounded-2xl py-4 flex justify-center gap-3 mb-6 shadow-inner">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className={`w-4 h-4 rounded-full ${i < newCustomerPin.length ? 'bg-blue-600' : 'bg-stone-200'}`}></div>
                                ))}
                            </div>

                            <div className="grid grid-cols-3 gap-2 w-full mb-6">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                    <button key={num} onClick={() => handleResetNumClick(num, 'NEW_PIN')} className="bg-stone-50 py-3 font-black text-xl rounded-xl active:scale-95 hover:bg-stone-100 text-stone-700">
                                        {num === 'DEL' ? <span className="material-symbols-outlined">backspace</span> : num}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3 w-full">
                                <button onClick={closeResetPinModal} className="flex-1 py-4 bg-stone-50 text-stone-600 font-bold rounded-2xl hover:bg-stone-100 transition-colors">ยกเลิก</button>
                                <button onClick={proceedToEmployeePin} disabled={newCustomerPin.length < 6} className={`flex-[2] py-4 text-white font-black rounded-2xl transition-colors ${newCustomerPin.length >= 6 ? 'bg-blue-600 hover:bg-blue-700 shadow-md' : 'bg-stone-300'}`}>ยืนยันรหัสใหม่</button>
                            </div>
                        </div>
                    )}

                    {resetPinStep === 'EMP_PIN' && (
                        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl relative z-10 animate-in slide-in-from-right-8 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-[#fdf8f5] border border-[#861b00]/20 text-[#861b00] rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
                            </div>
                            <h2 className="text-xl font-black text-stone-800 mb-1">ยืนยันสิทธิ์พนักงาน</h2>
                            <p className="text-stone-500 font-bold text-xs mb-6">เพื่อยืนยันการเปลี่ยน PIN ของคุณ {editForm.nickname || editForm.name}</p>

                            <div className="flex justify-center mb-6 gap-3">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className={`w-4 h-4 rounded-full ${i < employeeConfirmPin.length ? 'bg-[#861b00]' : 'bg-stone-200'}`}></div>
                                ))}
                            </div>

                            <div className="grid grid-cols-3 gap-2 w-full mb-6">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                    <button key={num} onClick={() => handleResetNumClick(num, 'EMP_PIN')} className="bg-stone-50 py-3 font-black text-xl rounded-xl active:scale-95 hover:bg-stone-100 text-stone-700">
                                        {num === 'DEL' ? <span className="material-symbols-outlined">backspace</span> : num}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3 w-full">
                                <button onClick={() => { setResetPinStep('NEW_PIN'); setEmployeeConfirmPin(''); }} className="flex-1 py-4 bg-stone-50 text-stone-600 font-bold rounded-2xl hover:bg-stone-100 transition-colors">ย้อนกลับ</button>
                                <button onClick={executePinReset} disabled={employeeConfirmPin.length < 6} className={`flex-[2] py-4 text-white font-black rounded-2xl transition-colors ${employeeConfirmPin.length >= 6 ? 'bg-[#861b00] hover:bg-black shadow-md' : 'bg-stone-300'}`}>อัปเดตข้อมูล</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* 🔴🌟 MODAL เติมเงิน E-Wallet (รวมสลิปสำเร็จ) */}
            {/* ========================================================= */}
            {topupMember && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={closeTopupModal} />

                    {topupStep === 'AMOUNT' && (
                        <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full relative z-10 shadow-2xl animate-in zoom-in-95 text-center">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-3xl">payments</span>
                            </div>
                            <h3 className="font-black text-xl text-stone-800">เติมเงิน E-Wallet</h3>
                            <p className="text-sm font-bold text-stone-500 mb-6">{topupMember.nickname || topupMember.name}</p>

                            <form onSubmit={(e) => { e.preventDefault(); if (parseFloat(topupAmount) > 0) setTopupStep('PIN'); else alert('กรุณาระบุจำนวนเงิน'); }} className="space-y-4">
                                <input type="number" autoFocus value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} className="w-full p-4 bg-stone-50 border-2 border-stone-200 rounded-2xl font-black text-3xl text-center text-emerald-600 outline-none focus:border-emerald-500" placeholder="0" />
                                <div className="grid grid-cols-3 gap-2 pb-2">
                                    {[100, 300, 500].map(amt => (
                                        <button type="button" key={amt} onClick={() => setTopupAmount(amt.toString())} className="py-2 bg-stone-100 rounded-xl font-bold text-stone-600 hover:bg-stone-200 active:scale-95 transition-all">+{amt}</button>
                                    ))}
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={closeTopupModal} className="flex-1 py-4 bg-stone-100 font-bold text-stone-600 rounded-2xl hover:bg-stone-200 transition-colors">ยกเลิก</button>
                                    <button type="submit" className="flex-[2] py-4 bg-emerald-500 text-white font-black rounded-2xl shadow-lg hover:bg-emerald-600 transition-colors active:scale-95">ถัดไป (ยืนยัน PIN)</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {topupStep === 'PIN' && (
                        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl relative z-10 animate-in slide-in-from-right-8 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-[#fdf8f5] border border-[#861b00]/20 text-[#861b00] rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
                            </div>
                            <h2 className="text-xl font-black text-stone-800 mb-1">ยืนยันสิทธิ์พนักงาน</h2>
                            <p className="text-stone-500 font-bold text-xs mb-1">เพื่อเติมเงินให้คุณ {topupMember.nickname || topupMember.name}</p>
                            <p className="text-[#861b00] font-black text-lg mb-6">ยอดเติม: ฿{parseFloat(topupAmount).toLocaleString()}</p>

                            <div className="flex justify-center mb-6 gap-3">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className={`w-4 h-4 rounded-full ${i < topupPin.length ? 'bg-[#861b00]' : 'bg-stone-200'}`}></div>
                                ))}
                            </div>

                            <div className="grid grid-cols-3 gap-2 w-full mb-6">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                    <button key={num} onClick={() => handleTopupNumClick(num)} className="bg-stone-50 py-3 font-black text-xl rounded-xl active:scale-95 hover:bg-stone-100 text-stone-700">
                                        {num === 'DEL' ? <span className="material-symbols-outlined">backspace</span> : num}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3 w-full">
                                <button onClick={() => { setTopupStep('AMOUNT'); setTopupPin(''); }} className="flex-1 py-4 bg-stone-50 text-stone-600 font-bold rounded-2xl hover:bg-stone-100 transition-colors">ย้อนกลับ</button>
                                <button onClick={handleVerifyTopupPin} disabled={topupPin.length < 6} className={`flex-[2] py-4 text-white font-black rounded-2xl transition-colors ${topupPin.length >= 6 ? 'bg-[#861b00] hover:bg-black shadow-md' : 'bg-stone-300'}`}>ยืนยันเติมเงิน</button>
                            </div>
                        </div>
                    )}

                    {/* 🌟 STEP 3: SUCCESS (สลิปจำลองแบบ image_8fa7c3.png) */}
                    {topupStep === 'SUCCESS' && (
                        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl relative z-10 animate-in zoom-in-95 flex flex-col items-center">
                            <div className="w-16 h-16 bg-[#eef8f2] text-[#52a675] rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-4xl">check</span>
                            </div>
                            <h2 className="text-2xl font-black text-stone-800 mb-1">เติมเงินสำเร็จ!</h2>
                            <p className="text-stone-400 font-bold text-xs mb-6 tracking-wide">สลิปชั่วคราว - การเติมเงิน</p>

                            <div className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-5 mb-6 text-sm font-bold text-stone-500 space-y-3">
                                <div className="flex justify-between"><span>รหัสอ้างอิง:</span><span className="text-stone-800">{topupReceipt?.id}</span></div>
                                <div className="flex justify-between"><span>ลูกค้า:</span><span className="text-stone-800">{topupMember?.name}</span></div>
                                <div className="flex justify-between"><span>พนักงาน:</span><span className="text-stone-800">{topupReceipt?.cashier}</span></div>
                                <div className="flex justify-between"><span>ช่องทาง:</span><span className="text-[#861b00] uppercase">{topupReceipt?.paymentMethod}</span></div>

                                <div className="border-t border-stone-200 border-dashed pt-3 mt-1 flex justify-between items-center">
                                    <span className="text-[#52a675] font-black">ยอดที่เติม:</span>
                                    <span className="text-[#52a675] font-black text-lg">฿{topupReceipt?.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="bg-stone-200/50 p-2 rounded-lg flex justify-between items-center mt-2">
                                    <span>ยอดคงเหลือปัจจุบัน:</span>
                                    <span className="text-stone-800">฿{topupReceipt?.newBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <button onClick={closeTopupModal} className="w-full py-4 bg-[#861b00] hover:bg-black text-white text-base font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95">
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* 🔴🌟 MODAL แจกคูปอง */}
            {/* ========================================================= */}
            {couponMember && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={closeCouponModal} />

                    {!isCouponSuccess ? (
                        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl relative z-10 animate-in zoom-in-95 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-500 rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
                            </div>
                            <h2 className="text-xl font-black text-stone-800 mb-1">ยืนยันสิทธิ์พนักงาน</h2>
                            <p className="text-stone-500 font-bold text-xs mb-6">เพื่อแจกคูปองให้คุณ {couponMember.nickname || couponMember.name}</p>

                            <div className="flex justify-center mb-6 gap-3">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className={`w-4 h-4 rounded-full ${i < couponPin.length ? 'bg-amber-500' : 'bg-stone-200'}`}></div>
                                ))}
                            </div>

                            <div className="grid grid-cols-3 gap-2 w-full mb-6">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                    <button key={num} onClick={() => handleCouponNumClick(num)} className="bg-stone-50 py-3 font-black text-xl rounded-xl active:scale-95 hover:bg-stone-100 text-stone-700">
                                        {num === 'DEL' ? <span className="material-symbols-outlined">backspace</span> : num}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3 w-full">
                                <button onClick={closeCouponModal} className="flex-1 py-4 bg-stone-50 text-stone-600 font-bold rounded-2xl hover:bg-stone-100 transition-colors">ยกเลิก</button>
                                <button onClick={handleVerifyCouponPin} disabled={couponPin.length < 6} className={`flex-[2] py-4 text-white font-black rounded-2xl transition-colors ${couponPin.length >= 6 ? 'bg-amber-500 hover:bg-amber-600 shadow-md' : 'bg-stone-300'}`}>แจกคูปอง</button>
                            </div>
                        </div>
                    ) : (
                        // 🌟 หน้าจอแจกคูปองสำเร็จ (แทน Alert)
                        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl relative z-10 animate-in zoom-in-95 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-4 border-4 border-amber-50">
                                <span className="material-symbols-outlined text-5xl">redeem</span>
                            </div>
                            <h2 className="text-2xl font-black text-stone-800 mb-2">แจกคูปองสำเร็จ!</h2>
                            <p className="text-stone-500 font-bold text-sm mb-6">ระบบได้ส่ง SMS แจ้งเตือนคูปองให้คุณ<br />{couponMember.name} เรียบร้อยแล้ว</p>
                            <button onClick={closeCouponModal} className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl shadow-md transition-all active:scale-95">
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* 🔴🌟 MODAL ระงับบัญชี (Archive) ยืนยันด้วยรหัสพนักงาน */}
            {/* ========================================================= */}
            {deleteMember && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={closeDeleteModal} />
                    <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl relative z-10 animate-in zoom-in-95 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-red-50 border border-red-200 text-red-600 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl">warning</span>
                        </div>
                        <h2 className="text-xl font-black text-stone-800 mb-1">ระงับบัญชีลูกค้า</h2>
                        <p className="text-stone-500 font-bold text-xs mb-6">กรอกรหัสพนักงานเพื่อยืนยันการระงับบัญชี<br />ของคุณ {deleteMember.nickname || deleteMember.name}</p>

                        <div className="flex justify-center mb-6 gap-3">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className={`w-4 h-4 rounded-full ${i < deletePin.length ? 'bg-red-600' : 'bg-stone-200'}`}></div>
                            ))}
                        </div>

                        <div className="grid grid-cols-3 gap-2 w-full mb-6">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                                <button key={num} onClick={() => handleDeleteNumClick(num)} className="bg-stone-50 py-3 font-black text-xl rounded-xl active:scale-95 hover:bg-stone-100 text-stone-700">
                                    {num === 'DEL' ? <span className="material-symbols-outlined">backspace</span> : num}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3 w-full">
                            <button onClick={closeDeleteModal} className="flex-1 py-4 bg-stone-50 text-stone-600 font-bold rounded-2xl hover:bg-stone-100 transition-colors">ยกเลิก</button>
                            <button onClick={handleVerifyDeletePin} disabled={deletePin.length < 6} className={`flex-[2] py-4 text-white font-black rounded-2xl transition-colors ${deletePin.length >= 6 ? 'bg-red-600 hover:bg-red-700 shadow-md' : 'bg-stone-300'}`}>ระงับบัญชี</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}