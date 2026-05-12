import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { fetchJSON } from '../api.js';

export default function EmployeesTab() {
    const { employees, setEmployees } = useContext(AppContext);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editEmp, setEditEmp] = useState(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deletePin, setDeletePin] = useState('');
    const [form, setForm] = useState({ name: '', pin: '', role: 'staff', phone: '' });
    const [saving, setSaving] = useState(false);

    const formatPhone = (phone) => {
        if (!phone) return '-';
        return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    };

    const openAdd = () => {
        setForm({ name: '', pin: '', role: 'staff', phone: '' });
        setEditEmp(null);
        setIsAddOpen(true);
    };

    const openEdit = (emp) => {
        setForm({ name: emp.name, pin: emp.pin, role: emp.role, phone: emp.phone || '' });
        setEditEmp(emp);
        setIsAddOpen(true);
    };

    const closeModal = () => {
        setIsAddOpen(false);
        setEditEmp(null);
        setForm({ name: '', pin: '', role: 'staff', phone: '' });
    };

    const handleSave = async () => {
        if (!form.name || !form.pin || form.pin.length !== 6) {
            alert('กรุณากรอกชื่อและ PIN 6 หลักให้ครบ');
            return;
        }
        setSaving(true);
        try {
            if (editEmp) {
                const updated = await fetchJSON(`/employees/${editEmp.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(form)
                });
                setEmployees(employees.map(e => e.id === editEmp.id ? updated : e));
            } else {
                const created = await fetchJSON('/employees/', {
                    method: 'POST',
                    body: JSON.stringify(form)
                });
                setEmployees([...employees, created]);
            }
            closeModal();
        } catch (err) {
            alert('บันทึกไม่สำเร็จ: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const openDelete = (emp) => {
        setDeleteTarget(emp);
        setDeletePin('');
        setIsDeleteOpen(true);
    };

    const handleDelete = async () => {
        if (deletePin.length !== 6) return;
        // ต้องใช้ PIN ของ emp ตัวเองเพื่อยืนยันลบ
        if (deletePin !== String(deleteTarget.pin)) {
            alert('PIN ไม่ถูกต้อง');
            setDeletePin('');
            return;
        }
        try {
            await fetchJSON(`/employees/${deleteTarget.id}`, { method: 'DELETE' });
            setEmployees(employees.filter(e => e.id !== deleteTarget.id));
            setIsDeleteOpen(false);
            setDeleteTarget(null);
        } catch (err) {
            alert('ลบไม่สำเร็จ: ' + err.message);
        }
    };

    return (
        <div className="flex flex-col h-full gap-4 w-full relative animate-in fade-in duration-300 font-body">

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <h2 className="text-2xl font-black font-headline text-[#861b00] flex items-center gap-2">
                    <span className="material-symbols-outlined text-3xl">badge</span> พนักงาน
                </h2>
                <div className="flex gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto pb-2 sm:pb-0">
                    <button
                        onClick={openAdd}
                        className="shrink-0 bg-[#861b00] text-white px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-black transition-colors shadow-md"
                    >
                        <span className="material-symbols-outlined text-[16px]">person_add</span> เพิ่มพนักงาน
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 pb-2">
                <div className="overflow-y-auto flex-1 no-scrollbar">
                    <table className="w-full text-left text-sm min-w-[600px]">
                        <thead className="bg-stone-50 border-b text-[10px] font-bold text-stone-500 uppercase tracking-widest sticky top-0 z-10">
                            <tr>
                                <th className="p-5 pl-6">พนักงาน</th>
                                <th className="p-5">ตำแหน่ง</th>
                                <th className="p-5">เบอร์โทร</th>
                                <th className="p-5 text-center pr-6">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {employees.map(e => (
                                <tr key={e.id} className="hover:bg-stone-50/50 transition-colors group">
                                    <td className="p-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center text-sm font-black uppercase">
                                                {e.name.charAt(0)}
                                            </div>
                                            <span className="font-bold text-stone-800">{e.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <p className={`text-[11px] font-bold px-3 py-1.5 rounded-md w-fit border ${e.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-stone-100 text-stone-700 border-stone-200'}`}>
                                            {e.role === 'admin' ? '👑 Admin' : '🧑‍💼 Staff'}
                                        </p>
                                    </td>
                                    <td className="p-4 text-xs font-bold text-stone-500">
                                        {formatPhone(e.phone)}
                                    </td>
                                    <td className="p-4 text-center pr-6">
                                        <div className="flex items-center justify-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEdit(e)}
                                                className="text-[11px] bg-white px-3 py-2 rounded-xl border border-stone-200 text-blue-500 font-bold flex items-center gap-1 hover:bg-blue-50 active:scale-95 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">edit</span> แก้ไข
                                            </button>
                                            <button
                                                onClick={() => openDelete(e)}
                                                className="text-[11px] bg-white px-3 py-2 rounded-xl border border-red-200 text-red-400 font-bold flex items-center gap-1 hover:bg-red-50 active:scale-95 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {employees.length === 0 && (
                        <div className="p-10 text-center text-stone-400 font-bold text-sm">ไม่พบข้อมูลพนักงาน</div>
                    )}
                </div>
            </div>

            {/* Modal เพิ่ม/แก้ไขพนักงาน */}
            {isAddOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={closeModal} />
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative z-10 flex flex-col gap-5">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-[#861b00]/10 text-[#861b00] rounded-2xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-2xl">{editEmp ? 'edit' : 'person_add'}</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-stone-800">{editEmp ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงานใหม่'}</h2>
                                <p className="text-xs text-stone-400 font-bold">{editEmp ? editEmp.name : 'กรอกข้อมูลให้ครบถ้วน'}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 block">ชื่อพนักงาน *</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:border-[#861b00] transition-colors"
                                    placeholder="เช่น สมชาย"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 block">เบอร์โทร</label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:border-[#861b00] transition-colors"
                                    placeholder="0812345678"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 block">ตำแหน่ง *</label>
                                <select
                                    value={form.role}
                                    onChange={e => setForm({ ...form, role: e.target.value })}
                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:border-[#861b00] transition-colors"
                                >
                                    <option value="staff">🧑‍💼 Staff</option>
                                    <option value="admin">👑 Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 block">PIN 6 หลัก *</label>
                                <input
                                    type="password"
                                    value={form.pin}
                                    onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:border-[#861b00] transition-colors tracking-[0.5em] text-center"
                                    placeholder="••••••"
                                    maxLength={6}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={closeModal} className="flex-1 py-3 font-bold text-stone-400 hover:text-stone-600 rounded-2xl border border-stone-200 transition-colors">ยกเลิก</button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-[2] py-3 bg-[#861b00] hover:bg-black text-white font-black rounded-2xl transition-colors disabled:opacity-50"
                            >
                                {saving ? 'กำลังบันทึก...' : editEmp ? 'บันทึกการแก้ไข' : 'เพิ่มพนักงาน'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal ยืนยันลบ */}
            {isDeleteOpen && deleteTarget && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setIsDeleteOpen(false)} />
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative z-10 flex flex-col items-center gap-4 text-center">
                        <div className="w-14 h-14 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl">person_remove</span>
                        </div>
                        <h2 className="text-xl font-black text-stone-800">ลบพนักงาน</h2>
                        <p className="text-sm text-stone-500 font-bold">กรอก PIN ของ <span className="text-stone-800">{deleteTarget.name}</span> เพื่อยืนยันการลบ</p>
                        <input
                            type="password"
                            value={deletePin}
                            onChange={e => setDeletePin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:border-red-400 transition-colors tracking-[0.5em] text-center text-xl"
                            placeholder="••••••"
                            maxLength={6}
                            autoFocus
                        />
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setIsDeleteOpen(false)} className="flex-1 py-3 font-bold text-stone-400 hover:text-stone-600 rounded-2xl border border-stone-200">ยกเลิก</button>
                            <button
                                onClick={handleDelete}
                                disabled={deletePin.length < 6}
                                className="flex-[2] py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-colors disabled:opacity-40"
                            >
                                ยืนยันลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}