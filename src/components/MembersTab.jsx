import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { fetchJSON } from '../api.js';

export default function MembersTab() {
    const { members, setMembers } = useContext(AppContext);
    const [searchTerm, setSearchTerm] = useState('');

    // 🌟 1. อัปเดต State สำหรับเก็บข้อมูลเพิ่มขึ้น
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newMember, setNewMember] = useState({ nickname: '', name: '', age: '', dob: '', phone: '', pin: '' });

    const [topupMember, setTopupMember] = useState(null);
    const [topupAmount, setTopupAmount] = useState('');

    const [editMember, setEditMember] = useState(null);
    const [editForm, setEditForm] = useState({ nickname: '', name: '', age: '', dob: '', phone: '', pin: '' });

    const fMoney = (n) => parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fPhone = (p) => {
        if (!p) return '-';
        const cleaned = p.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
        return match ? `${match[1]}-${match[2]}-${match[3]}` : p;
    };

    const getTier = (points) => {
        const p = points || 0;
        if (p >= 15000) return { name: 'Platinum', color: 'text-stone-700 bg-stone-100 border-stone-200' };
        if (p >= 5000) return { name: 'Gold', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' };
        if (p >= 1000) return { name: 'Silver', color: 'text-slate-600 bg-slate-50 border-slate-200' };
        return { name: 'Bronze', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    };

    const totalMembers = members?.length || 0;
    const totalWallet = members?.reduce((sum, m) => sum + (m.wallet || 0), 0) || 0;
    const tierCounts = { Bronze: 0, Silver: 0, Gold: 0, Platinum: 0 };
    members?.forEach(m => { tierCounts[getTier(m.points).name]++; });

    const filteredMembers = members?.filter(m =>
        m.phone.includes(searchTerm) ||
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.nickname && m.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
    ) || [];

    // ================= ACTION FUNCTIONS ================= //

    // 🌟 2. อัปเดตฟังก์ชันเพิ่มสมาชิก (เช็ค PIN 6 หลัก)
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
                    wallet: 0
                })
            });
            setMembers([created, ...members]);
            setIsAddModalOpen(false);
            setNewMember({ nickname: '', name: '', age: '', dob: '', phone: '', pin: '' });
        } catch (error) {
            alert('Failed to add member: ' + error.message);
        }
    };

    const handleTopup = async (e) => {
        e.preventDefault();
        const amount = parseFloat(topupAmount);
        if (!amount || amount <= 0) return alert('กรุณาระบุจำนวนเงินที่ถูกต้อง');

        try {
            const updated = await fetchJSON(`/members/${topupMember.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: topupMember.name,
                    phone: topupMember.phone,
                    points: topupMember.points,
                    wallet: (topupMember.wallet || 0) + amount
                })
            });
            setMembers(members.map(m => m.id === topupMember.id ? { ...m, wallet: updated.wallet } : m));
            alert(`เติมเงิน ฿${amount} ให้คุณ ${topupMember.name} สำเร็จ!`);
            setTopupMember(null);
            setTopupAmount('');
        } catch (error) {
            alert('Failed to topup: ' + error.message);
        }
    };

    // 🌟 3. อัปเดตฟังก์ชันแก้ไขข้อมูล
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editForm.name || !editForm.phone || !editForm.pin) return alert('กรุณากรอก ชื่อ, เบอร์โทร และ PIN ให้ครบถ้วน');
        if (editForm.pin.length !== 6) return alert('รหัส PIN ต้องมี 6 หลักพอดีครับ');

        try {
            const dbName = editForm.nickname ? `${editForm.nickname} (${editForm.name})` : editForm.name;
            const updated = await fetchJSON(`/members/${editMember.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: dbName,
                    phone: editForm.phone,
                    pin: editForm.pin,
                    points: editMember.points,
                    wallet: editMember.wallet
                })
            });
            setMembers(members.map(m => m.id === editMember.id ? { ...m, ...updated, nickname: editForm.nickname, name: editForm.name, pin: editForm.pin } : m));
            setEditMember(null);
        } catch (error) {
            alert('Failed to edit member: ' + error.message);
        }
    };

    const handleDelete = async (member) => {
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบสมาชิก "${member.name}" ?\n(ยอดเงินและคะแนนสะสมจะหายไปทั้งหมด)`)) {
            try {
                await fetchJSON(`/members/${member.id}`, { method: 'DELETE' });
                setMembers(members.filter(m => m.id !== member.id));
            } catch (error) {
                alert('Failed to delete member: ' + error.message);
            }
        }
    };

    const handleGiveCoupon = (member) => {
        alert(`แจกคูปองให้คุณ ${member.name} สำเร็จ!\n(ระบบส่ง SMS แจ้งเตือนลูกค้าแล้ว)`);
    };

    // 🌟 ฟังก์ชันคำนวณอายุอัตโนมัติเมื่อเลือกวันเกิด
    const handleDobChange = (e, isEdit = false) => {
        const dobVal = e.target.value;
        let ageVal = '';
        if (dobVal) {
            const birthDate = new Date(dobVal);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            ageVal = age.toString();
        }

        if (isEdit) {
            setEditForm({ ...editForm, dob: dobVal, age: ageVal });
        } else {
            setNewMember({ ...newMember, dob: dobVal, age: ageVal });
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-10 w-full relative animate-in fade-in duration-300 font-body">
            {/* Header */}
            <div><h2 className="text-3xl font-black font-headline text-stone-800">ฐานข้อมูลลูกค้า</h2></div>

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-[2rem] border border-stone-200 p-6 flex flex-col items-center justify-center text-center shadow-sm">
                    <p className="text-xs text-stone-500 font-bold uppercase mb-2 tracking-widest">สมาชิกทั้งหมด</p>
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
            <div className="bg-white rounded-[2rem] border border-stone-200 p-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative flex-1 w-full max-w-md">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">search</span>
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ค้นหาชื่อ, ชื่อเล่น หรือเบอร์โทร..." className="w-full pl-12 pr-4 py-3.5 rounded-full border border-stone-300 outline-none focus:border-[#861b00] text-sm font-bold transition-all" />
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto bg-[#861b00] hover:bg-black text-white px-6 py-3.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-[20px]">person_add</span> เพิ่มสมาชิก
                </button>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[900px]">
                        <thead className="border-b border-stone-100 bg-white">
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
                            {filteredMembers.map((member, index) => {
                                const tier = getTier(member.points);
                                const displayName = member.nickname ? `${member.nickname} (${member.name})` : member.name;
                                const avatarChar = (member.nickname || member.name || '?').charAt(0);

                                return (
                                    <tr key={member.id} className="hover:bg-stone-50/50 transition-colors group">
                                        <td className="py-4 px-6"><span className="font-bold text-stone-500 text-sm">No.{index + 1}</span></td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-black text-sm shrink-0 uppercase">
                                                    {avatarChar}
                                                </div>
                                                <div>
                                                    <p className="font-black text-sm text-stone-800">{displayName}</p>
                                                    <p className="text-[11px] text-stone-400 font-bold">{fPhone(member.phone)} {member.age ? `• อายุ ${member.age} ปี` : ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`px-3 py-1 text-[10px] font-bold rounded-full border shadow-sm inline-block ${tier.color}`}>{tier.name}</span>
                                        </td>
                                        <td className="py-4 px-6 text-right"><span className="font-black text-stone-600">฿{fMoney(member.points)}</span></td>
                                        <td className="py-4 px-6 text-right"><span className="font-black text-[#861b00] text-lg">฿{fMoney(member.wallet)}</span></td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setTopupMember(member)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[11px] font-bold hover:bg-emerald-100 active:scale-95 transition-all"><span className="material-symbols-outlined text-[14px]">payments</span> เติมเงิน</button>
                                                <button onClick={() => handleGiveCoupon(member)} className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-[11px] font-bold hover:bg-amber-100 active:scale-95 transition-all"><span className="material-symbols-outlined text-[14px]">confirmation_number</span> แจกคูปอง</button>
                                                <button onClick={() => {
                                                    setEditMember(member);
                                                    setEditForm({
                                                        nickname: member.nickname || '',
                                                        name: member.name || '',
                                                        age: member.age || '',
                                                        dob: member.dob || '',
                                                        phone: member.phone || '',
                                                        pin: member.pin || ''
                                                    });
                                                }} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-[11px] font-bold hover:bg-blue-100 active:scale-95 transition-all"><span className="material-symbols-outlined text-[14px]">edit</span> แก้ไข</button>
                                                <button onClick={() => handleDelete(member)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[11px] font-bold hover:bg-red-100 active:scale-95 transition-all"><span className="material-symbols-outlined text-[14px]">delete</span> ลบ</button>
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

            {/* 🔴 Modal: เพิ่มสมาชิกใหม่ */}
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

            {/* 🔴 Modal: แก้ไขสมาชิก */}
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-stone-100 pt-4">
                                <div><label className="text-[10px] font-bold text-stone-500 block mb-1 uppercase tracking-wider">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label><input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full p-3 bg-stone-50 border-2 border-stone-200 rounded-xl font-black text-stone-700 tracking-wider outline-none focus:border-blue-500 transition-colors" placeholder="08XXXXXXXX" maxLength="10" required /></div>
                                <div><label className="text-[10px] font-bold text-blue-600 block mb-1 uppercase tracking-wider">รหัส PIN 6 หลัก <span className="text-red-500">*</span></label><input type="text" value={editForm.pin} onChange={(e) => setEditForm({ ...editForm, pin: e.target.value })} className="w-full p-3 bg-blue-50 border-2 border-blue-200 rounded-xl font-black text-center tracking-[0.5em] text-blue-700 outline-none focus:border-blue-500 transition-colors" placeholder="••••••" maxLength="6" required /></div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setEditMember(null)} className="flex-1 py-4 bg-stone-100 font-bold text-stone-600 rounded-2xl hover:bg-stone-200 transition-colors">ยกเลิก</button>
                                <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-colors">บันทึกการเปลี่ยนแปลง</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 🔴 Modal: เติมเงิน E-Wallet */}
            {topupMember && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setTopupMember(null)} />
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full relative z-10 shadow-2xl animate-in zoom-in-95 text-center">
                        <h3 className="font-black text-xl text-stone-800">เติมเงิน E-Wallet</h3>
                        <p className="text-sm font-bold text-stone-500 mb-6">{topupMember.nickname || topupMember.name}</p>
                        <form onSubmit={handleTopup} className="space-y-4">
                            <input type="number" autoFocus value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} className="w-full p-4 bg-stone-50 border-2 border-stone-200 rounded-2xl font-black text-3xl text-center text-emerald-600 outline-none focus:border-emerald-500" placeholder="0" />
                            <div className="grid grid-cols-3 gap-2 pb-2">
                                {[100, 300, 500].map(amt => (
                                    <button type="button" key={amt} onClick={() => setTopupAmount(amt.toString())} className="py-2 bg-stone-100 rounded-xl font-bold text-stone-600 hover:bg-stone-200 active:scale-95 transition-all">+{amt}</button>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setTopupMember(null)} className="flex-1 py-4 bg-stone-100 font-bold text-stone-600 rounded-2xl hover:bg-stone-200 transition-colors">ยกเลิก</button>
                                <button type="submit" className="flex-[2] py-4 bg-emerald-500 text-white font-black rounded-2xl shadow-lg hover:bg-emerald-600 transition-colors active:scale-95">ยืนยันเติมเงิน</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}