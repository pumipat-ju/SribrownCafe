import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { fetchJSON } from '../api.js';

const PRESET_COLORS = [
    { label: 'แดง', color: 'bg-red-50 text-red-700 border-red-200' },
    { label: 'น้ำเงิน', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'เขียว', color: 'bg-green-50 text-green-700 border-green-200' },
    { label: 'ส้ม', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { label: 'ม่วง', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { label: 'เหลือง', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { label: 'เทา', color: 'bg-stone-100 text-stone-700 border-stone-200' },
    { label: 'ฟ้า', color: 'bg-sky-50 text-sky-700 border-sky-200' },
];

const PRESET_ICONS = ['👑', '🧑‍💼', '🍵', '☕️', '🛠️', '📦', '💰', '🎨', '🔑', '⭐'];

function RoleBadge({ role, roles }) {
    const found = roles.find(r => r.name === role);
    if (found) {
        return (
            <p className={`text-[11px] font-bold px-3 py-1.5 rounded-md w-fit border ${found.color}`}>
                {found.icon} {found.label}
            </p>
        );
    }
    // fallback
    return (
        <p className={`text-[11px] font-bold px-3 py-1.5 rounded-md w-fit border ${role === 'admin' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-stone-100 text-stone-700 border-stone-200'}`}>
            {role === 'admin' ? '👑 Admin' : '🧑‍💼 Staff'}
        </p>
    );
}

export default function EmployeesTab() {
    const { employees, setEmployees } = useContext(AppContext);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editEmp, setEditEmp] = useState(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deletePin, setDeletePin] = useState('');
    const [form, setForm] = useState({ name: '', pin: '', role: 'staff', phone: '' });
    const [saving, setSaving] = useState(false);

    // ── Role management state ──
    const [roles, setRoles] = useState([]);
    const [rolesLoaded, setRolesLoaded] = useState(false);
    const [isRolesOpen, setIsRolesOpen] = useState(false);
    const [roleForm, setRoleForm] = useState({ name: '', label: '', color: PRESET_COLORS[6].color, icon: '🧑‍💼' });
    const [editRole, setEditRole] = useState(null);
    const [savingRole, setSavingRole] = useState(false);
    const [deleteRoleTarget, setDeleteRoleTarget] = useState(null);
    const [roleView, setRoleView] = useState('list'); // 'list' | 'form'

    useEffect(() => {
        fetchJSON('/employees/roles')
            .then(data => { setRoles(data); setRolesLoaded(true); })
            .catch(() => { setRolesLoaded(true); });
    }, []);

    const formatPhone = (phone) => {
        if (!phone) return '-';
        return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    };

    // ── Employee handlers ──
    const openAdd = () => {
        setForm({ name: '', pin: '', role: roles[0]?.name || 'staff', phone: '' });
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
        if (roles.length === 0) {
            alert('กรุณาเพิ่มโรลก่อน โดยกดปุ่ม "จัดการโรล"');
            return;
        }
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

    // ── Role handlers ──
    const openRoles = () => {
        setRoleView('list');
        setEditRole(null);
        setDeleteRoleTarget(null);
        setRoleForm({ name: '', label: '', color: PRESET_COLORS[6].color, icon: '🧑‍💼' });
        setIsRolesOpen(true);
    };

    const openAddRole = () => {
        setEditRole(null);
        setRoleForm({ name: '', label: '', color: PRESET_COLORS[6].color, icon: '🧑‍💼' });
        setRoleView('form');
    };

    const openEditRole = (role) => {
        setEditRole(role);
        setRoleForm({ name: role.name, label: role.label, color: role.color, icon: role.icon });
        setRoleView('form');
        setDeleteRoleTarget(null);
    };

    const closeRoles = () => {
        setIsRolesOpen(false);
        setEditRole(null);
        setDeleteRoleTarget(null);
        setRoleView('list');
    };

    const handleSaveRole = async () => {
        if (!roleForm.name.trim() || !roleForm.label.trim()) {
            alert('กรุณากรอกชื่อโรลให้ครบ');
            return;
        }
        setSavingRole(true);
        try {
            if (editRole) {
                const updated = await fetchJSON(`/employees/roles/${editRole.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(roleForm)
                });
                setRoles(roles.map(r => r.id === editRole.id ? updated : r));
            } else {
                const created = await fetchJSON('/employees/roles/', {
                    method: 'POST',
                    body: JSON.stringify(roleForm)
                });
                setRoles([...roles, created]);
            }
            setRoleView('list');
            setEditRole(null);
        } catch (err) {
            alert('บันทึกไม่สำเร็จ: ' + err.message);
        } finally {
            setSavingRole(false);
        }
    };

    const handleDeleteRole = async (role) => {
        try {
            await fetchJSON(`/employees/roles/${role.id}`, { method: 'DELETE' });
            setRoles(roles.filter(r => r.id !== role.id));
            setDeleteRoleTarget(null);
            // refresh employees เพราะ role อาจเปลี่ยน
            const updated = await fetchJSON('/employees/');
            setEmployees(updated);
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
                    {/* ── ปุ่มจัดการโรล ── */}
                    <button
                        onClick={openRoles}
                        className="shrink-0 bg-white border border-stone-200 text-stone-700 px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[16px]">manage_accounts</span> จัดการโรล
                    </button>
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
                                        <RoleBadge role={e.role} roles={roles} />
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

            {/* ════════════════════════════════════════
                Modal จัดการโรล
            ════════════════════════════════════════ */}
            {isRolesOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={closeRoles} />
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative z-10 flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>

                        {/* Header */}
                        <div className="flex items-center gap-3 p-6 pb-4 border-b border-stone-100">
                            <div className="w-10 h-10 bg-stone-100 text-stone-700 rounded-2xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-xl">manage_accounts</span>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-black text-stone-800">
                                    {roleView === 'form' ? (editRole ? 'แก้ไขโรล' : 'เพิ่มโรลใหม่') : 'จัดการโรล'}
                                </h2>
                                <p className="text-[11px] text-stone-400 font-bold">
                                    {roleView === 'form' ? 'กำหนดชื่อ สี และไอคอนของโรล' : `${roles.length} โรลในระบบ`}
                                </p>
                            </div>
                            {roleView === 'list' && (
                                <button
                                    onClick={openAddRole}
                                    className="bg-[#861b00] text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-black transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[14px]">add</span> เพิ่มโรล
                                </button>
                            )}
                            {roleView === 'form' && (
                                <button onClick={() => { setRoleView('list'); setEditRole(null); }} className="text-stone-400 hover:text-stone-600 transition-colors">
                                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                                </button>
                            )}
                        </div>

                        {/* ── List View ── */}
                        {roleView === 'list' && (
                            <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-2">
                                {roles.length === 0 && (
                                    <div className="py-10 text-center text-stone-400 font-bold text-sm">
                                        ยังไม่มีโรล กด "+ เพิ่มโรล" เพื่อเริ่มต้น
                                    </div>
                                )}
                                {roles.map(role => (
                                    <div key={role.id} className="flex items-center gap-3 p-3 rounded-2xl border border-stone-100 hover:bg-stone-50 transition-colors group">
                                        <div className={`text-[11px] font-bold px-3 py-1.5 rounded-md border ${role.color} flex items-center gap-1 min-w-[90px] justify-center`}>
                                            {role.icon} {role.label}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-stone-400 font-bold truncate">key: <span className="text-stone-600">{role.name}</span></p>
                                            <p className="text-[10px] text-stone-400">
                                                ใช้โดย {employees.filter(e => e.role === role.name).length} คน
                                            </p>
                                        </div>
                                        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditRole(role)}
                                                className="p-2 rounded-xl border border-stone-200 text-blue-500 hover:bg-blue-50 transition-all active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                            </button>
                                            <button
                                                onClick={() => setDeleteRoleTarget(role)}
                                                className="p-2 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 transition-all active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Confirm delete inline */}
                                {deleteRoleTarget && (
                                    <div className="mt-2 p-4 bg-red-50 rounded-2xl border border-red-200 flex flex-col gap-3">
                                        <p className="text-sm font-bold text-red-700 text-center">
                                            ลบโรล <span className="underline">{deleteRoleTarget.label}</span>?
                                        </p>
                                        <p className="text-[11px] text-red-500 text-center font-bold">
                                            พนักงานที่ใช้โรลนี้จะถูกเปลี่ยนเป็น "staff" อัตโนมัติ
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setDeleteRoleTarget(null)}
                                                className="flex-1 py-2.5 font-bold text-stone-500 rounded-xl border border-stone-200 text-xs hover:bg-stone-100 transition-colors"
                                            >ยกเลิก</button>
                                            <button
                                                onClick={() => handleDeleteRole(deleteRoleTarget)}
                                                className="flex-[2] py-2.5 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl text-xs transition-colors"
                                            >ยืนยันลบ</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Form View ── */}
                        {roleView === 'form' && (
                            <div className="flex-1 overflow-y-auto no-scrollbar p-6 flex flex-col gap-4">

                                {/* Preview Badge */}
                                <div className="flex justify-center py-2">
                                    <div className={`text-sm font-bold px-4 py-2 rounded-lg border ${roleForm.color} flex items-center gap-2`}>
                                        {roleForm.icon || '?'} {roleForm.label || 'ตัวอย่าง'}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 block">ชื่อโรล (key) *</label>
                                    <input
                                        type="text"
                                        value={roleForm.name}
                                        onChange={e => setRoleForm({ ...roleForm, name: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:border-[#861b00] transition-colors text-sm"
                                        placeholder="เช่น barista, manager"
                                        disabled={!!editRole}
                                    />
                                    <p className="text-[10px] text-stone-400 mt-1 font-bold">ใช้ตัวอักษรภาษาอังกฤษหรือ _ เท่านั้น{editRole ? ' (ไม่สามารถแก้ key ได้)' : ''}</p>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 block">ชื่อที่แสดง *</label>
                                    <input
                                        type="text"
                                        value={roleForm.label}
                                        onChange={e => setRoleForm({ ...roleForm, label: e.target.value })}
                                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:border-[#861b00] transition-colors text-sm"
                                        placeholder="เช่น บาริสต้า, ผู้จัดการ"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 block">ไอคอน</label>
                                    <div className="flex flex-wrap gap-2">
                                        {PRESET_ICONS.map(icon => (
                                            <button
                                                key={icon}
                                                onClick={() => setRoleForm({ ...roleForm, icon })}
                                                className={`w-10 h-10 rounded-xl border-2 text-xl flex items-center justify-center transition-all ${roleForm.icon === icon ? 'border-[#861b00] bg-[#861b00]/5 scale-110' : 'border-stone-200 hover:border-stone-400'}`}
                                            >
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 block">สีของโรล</label>
                                    <div className="flex flex-wrap gap-2">
                                        {PRESET_COLORS.map(({ label, color }) => (
                                            <button
                                                key={color}
                                                onClick={() => setRoleForm({ ...roleForm, color })}
                                                className={`text-[11px] font-bold px-3 py-1.5 rounded-md border transition-all ${color} ${roleForm.color === color ? 'ring-2 ring-offset-1 ring-stone-500 scale-105' : ''}`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => { setRoleView('list'); setEditRole(null); }}
                                        className="flex-1 py-3 font-bold text-stone-400 hover:text-stone-600 rounded-2xl border border-stone-200 transition-colors text-sm"
                                    >ยกเลิก</button>
                                    <button
                                        onClick={handleSaveRole}
                                        disabled={savingRole}
                                        className="flex-[2] py-3 bg-[#861b00] hover:bg-black text-white font-black rounded-2xl transition-colors disabled:opacity-50 text-sm"
                                    >
                                        {savingRole ? 'กำลังบันทึก...' : editRole ? 'บันทึกการแก้ไข' : 'เพิ่มโรล'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                                    {!rolesLoaded
                                        ? <option disabled>กำลังโหลด...</option>
                                        : roles.length === 0
                                            ? <option disabled>ยังไม่มีโรล — กด "จัดการโรล" เพื่อเพิ่ม</option>
                                            : roles.map(r => (
                                                <option key={r.id} value={r.name}>{r.icon} {r.label}</option>
                                            ))
                                    }
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