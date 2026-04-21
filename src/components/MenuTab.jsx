import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';

export default function MenuTab() {
    const { categories, setCategories, menuItems, setMenuItems, optionGroups, setOptionGroups } = useContext(AppContext);

    const [activeCatFilter, setActiveCatFilter] = useState('all');
    const [catSearch, setCatSearch] = useState('');
    const [itemSearch, setItemSearch] = useState('');
    const [draggedIdx, setDraggedIdx] = useState(null);

    // Modals State
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [editingCat, setEditingCat] = useState(null);
    const [newCatName, setNewCatName] = useState('');

    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [newItem, setNewItem] = useState({ name_th: '', name_en: '', price: '', cat: 'c1', color: 'bg-stone-100', options: [] });

    // 🌟 State สำหรับระบบจัดการ Options
    const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [editingOptionGroup, setEditingOptionGroup] = useState(null);
    const [newOptionGroup, setNewOptionGroup] = useState({
        name: '',
        applyTo: [],
        choices: [
            { n: '', p: '' }, { n: '', p: '' }, { n: '', p: '' }, { n: '', p: '' }
        ]
    });

    const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()));
    const filteredItems = menuItems.filter(m =>
        (activeCatFilter === 'all' || String(m.cat) === String(activeCatFilter)) &&
        ((m.name_th && m.name_th.toLowerCase().includes(itemSearch.toLowerCase())) ||
            (m.name_en && m.name_en.toLowerCase().includes(itemSearch.toLowerCase())) ||
            (!m.name_th && !m.name_en && m.name && m.name.toLowerCase().includes(itemSearch.toLowerCase())))
    );

    // --- ฟังก์ชันจัดการ หมวดหมู่ (Categories) ---
    const saveCategory = () => {
        if (!newCatName.trim()) return;
        if (editingCat) {
            setCategories(categories.map(c => c.id === editingCat.id ? { ...c, name: newCatName } : c));
        } else {
            setCategories([...categories, { id: `c${Date.now()}`, name: newCatName }]);
        }
        setIsCatModalOpen(false);
        setEditingCat(null);
        setNewCatName('');
    };

    const handleDeleteCat = (id) => {
        if (window.confirm('ลบหมวดหมู่นี้? (เมนูข้างในจะไม่ถูกลบ แต่จะกลายเป็นไม่มีหมวดหมู่)')) {
            setCategories(categories.filter(c => c.id !== id));
        }
    };

    // --- ฟังก์ชันจัดการ เมนู (Items) ---
    const saveMenuItem = () => {
        if (!newItem.name_th && !newItem.name_en && !newItem.name) return alert('กรุณาระบุชื่อเมนู');
        if (!newItem.price) return alert('กรุณาระบุราคา');

        if (editingItem) {
            setMenuItems(menuItems.map(m => m.id === editingItem.id ? { ...m, ...newItem, price: parseFloat(newItem.price) } : m));
        } else {
            setMenuItems([{ ...newItem, id: Date.now(), price: parseFloat(newItem.price), name: newItem.name_th || newItem.name_en }, ...menuItems]);
        }
        setIsItemModalOpen(false);
        setEditingItem(null);
    };

    const handleDeleteItem = (id) => {
        if (window.confirm('แน่ใจหรือไม่ว่าต้องการลบเมนูนี้?')) {
            setMenuItems(menuItems.filter(m => m.id !== id));
        }
    };

    const handleToggleOptionForItem = (groupId) => {
        const currentOptions = newItem.options || [];
        if (currentOptions.includes(groupId)) {
            setNewItem({ ...newItem, options: currentOptions.filter(id => id !== groupId) });
        } else {
            setNewItem({ ...newItem, options: [...currentOptions, groupId] });
        }
    };

    // --- ฟังก์ชันจัดการ ระบบตัวเลือกเสริม (Options Group) ---
    const toggleOptionGroupActive = (groupId) => {
        // ในระบบจริงอาจจะมีการบันทึกสถานะ Active/Inactive ของกลุ่ม
        alert(`สลับสถานะเปิด/ปิด สำหรับกลุ่ม ID: ${groupId} (ฟังก์ชันรอกำหนดใน Backend)`);
    };

    const handleDeleteOptionGroup = (groupId) => {
        if (window.confirm('แน่ใจหรือไม่ว่าต้องการลบกลุ่มตัวเลือกนี้?')) {
            setOptionGroups(optionGroups.filter(g => g.id !== groupId));
        }
    };

    const handleOpenCreateGroup = (groupToEdit = null) => {
        if (groupToEdit) {
            setEditingOptionGroup(groupToEdit);
            // เติม choices ให้ครบ 4 ช่องถ้ามีไม่ถึง
            const paddedChoices = [...groupToEdit.choices];
            while (paddedChoices.length < 4) {
                paddedChoices.push({ n: '', p: '' });
            }
            setNewOptionGroup({
                name: groupToEdit.name,
                applyTo: groupToEdit.applyTo || [],
                choices: paddedChoices.slice(0, 4) // จำกัดแค่ 4 ช่องตาม UI
            });
        } else {
            setEditingOptionGroup(null);
            setNewOptionGroup({
                name: '',
                applyTo: [],
                choices: [{ n: '', p: '' }, { n: '', p: '' }, { n: '', p: '' }, { n: '', p: '' }]
            });
        }
        setIsCreateGroupModalOpen(true);
        setIsOptionsModalOpen(false);
    };

    const handleChoiceChange = (index, field, value) => {
        const updatedChoices = [...newOptionGroup.choices];
        updatedChoices[index] = { ...updatedChoices[index], [field]: value };
        setNewOptionGroup({ ...newOptionGroup, choices: updatedChoices });
    };

    const handleCategoryApplyToggle = (catId) => {
        const currentApplyTo = newOptionGroup.applyTo;
        if (currentApplyTo.includes(catId)) {
            setNewOptionGroup({ ...newOptionGroup, applyTo: currentApplyTo.filter(id => id !== catId) });
        } else {
            setNewOptionGroup({ ...newOptionGroup, applyTo: [...currentApplyTo, catId] });
        }
    };

    const saveOptionGroup = () => {
        if (!newOptionGroup.name.trim()) return alert('กรุณาระบุชื่อกลุ่ม');
        if (newOptionGroup.applyTo.length === 0) return alert('กรุณาเลือกหมวดหมู่ที่แสดงผลอย่างน้อย 1 หมวดหมู่');

        // กรองเอาเฉพาะตัวเลือกที่มีชื่อ
        const validChoices = newOptionGroup.choices
            .filter(c => c.n.trim() !== '')
            .map(c => ({ n: c.n.trim(), p: parseFloat(c.p) || 0 }));

        if (validChoices.length === 0) return alert('กรุณาระบุรายการย่อยอย่างน้อย 1 รายการ');

        const finalGroup = {
            id: editingOptionGroup ? editingOptionGroup.id : `og_${Date.now()}`,
            name: newOptionGroup.name.trim(),
            applyTo: newOptionGroup.applyTo,
            choices: validChoices
        };

        if (editingOptionGroup) {
            setOptionGroups(optionGroups.map(g => g.id === editingOptionGroup.id ? finalGroup : g));
        } else {
            setOptionGroups([...optionGroups, finalGroup]);
        }

        setIsCreateGroupModalOpen(false);
        setIsOptionsModalOpen(true); // กลับไปหน้าจัดการตัวเลือก
    };


    // --- Drag & Drop (คงเดิม) ---
    const handleDragStartCat = (idx) => setDraggedIdx(idx);
    const handleDropCat = (idx) => {
        const newCats = [...categories];
        const [moved] = newCats.splice(draggedIdx, 1);
        newCats.splice(idx, 0, moved);
        setCategories(newCats);
        setDraggedIdx(null);
    };
    const handleDragStartItem = (idx) => setDraggedIdx(idx);
    const handleDropItem = (idx) => {
        const newItems = [...menuItems];
        const visibleItems = newItems.filter(m => activeCatFilter === 'all' || m.cat === activeCatFilter);
        const globalDraggedIdx = newItems.findIndex(m => m.id === visibleItems[draggedIdx].id);
        const globalTargetIdx = newItems.findIndex(m => m.id === visibleItems[idx].id);

        const [moved] = newItems.splice(globalDraggedIdx, 1);
        newItems.splice(globalTargetIdx, 0, moved);
        setMenuItems(newItems);
        setDraggedIdx(null);
    };

    return (
        <div className="max-w-[95%] mx-auto h-full flex flex-col animate-in fade-in duration-500 w-full relative pb-10 font-body">

            {/* 🔴 Modal: เพิ่ม/แก้ไขหมวดหมู่ */}
            {isCatModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                        <h3 className="font-black text-2xl mb-6 text-stone-800 font-headline">{editingCat ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}</h3>
                        <input autoFocus value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="w-full p-4 border-2 border-stone-100 bg-stone-50 rounded-2xl mb-8 text-center font-bold text-lg outline-none focus:border-[#861b00] transition-all" placeholder="ระบุชื่อ..." />
                        <div className="flex gap-3">
                            <button onClick={() => { setIsCatModalOpen(false); setEditingCat(null); setNewCatName(''); }} className="flex-1 py-4 bg-stone-100 text-stone-500 font-bold rounded-2xl hover:bg-stone-200">ยกเลิก</button>
                            <button onClick={saveCategory} className="flex-[2] py-4 bg-stone-800 text-white font-black rounded-2xl shadow-lg active:scale-95">บันทึก</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🔴 Modal: เพิ่ม/แก้ไขเมนู */}
            {isItemModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <h3 className="font-black text-2xl mb-6 text-stone-800 font-headline shrink-0">{editingItem ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}</h3>

                        <div className="space-y-5 mb-8 flex-1 overflow-y-auto no-scrollbar pr-2">
                            <div>
                                <label className="text-[10px] font-bold text-stone-400 block mb-2 uppercase tracking-widest">ชื่อเมนู (TH)</label>
                                <input value={newItem.name_th} onChange={(e) => setNewItem({ ...newItem, name_th: e.target.value })} className="w-full p-3.5 border-2 border-stone-100 bg-stone-50 rounded-2xl font-bold outline-none focus:border-[#861b00]" placeholder="เช่น อเมริกาโน่" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-stone-400 block mb-2 uppercase tracking-widest">Product Name (EN)</label>
                                <input value={newItem.name_en} onChange={(e) => setNewItem({ ...newItem, name_en: e.target.value })} className="w-full p-3.5 border-2 border-stone-100 bg-stone-50 rounded-2xl font-bold outline-none focus:border-[#861b00]" placeholder="e.g. Americano" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-stone-400 block mb-2 uppercase tracking-widest">ราคา (฿)</label>
                                    <input type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} className="w-full p-3.5 border-2 border-stone-100 bg-stone-50 rounded-2xl font-black text-[#861b00] outline-none focus:border-[#861b00]" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-stone-400 block mb-2 uppercase tracking-widest">หมวดหมู่</label>
                                    <select value={newItem.cat} onChange={(e) => setNewItem({ ...newItem, cat: e.target.value })} className="w-full p-3.5 border-2 border-stone-100 bg-stone-50 rounded-2xl font-bold outline-none focus:border-[#861b00] text-sm">
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* ตัวเลือกเพิ่มเติม (Options) สำหรับเมนูนี้ */}
                            <div className="pt-2 border-t border-stone-100 mt-4">
                                <label className="text-[10px] font-bold text-stone-500 mb-2 block uppercase tracking-widest">
                                    ตัวเลือกเพิ่มเติม (Options)
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {optionGroups?.map(group => {
                                        const isSelected = newItem.options?.includes(group.id);
                                        return (
                                            <button
                                                key={group.id}
                                                type="button"
                                                onClick={() => handleToggleOptionForItem(group.id)}
                                                className={`px-3 py-1.5 text-[11px] font-bold rounded-full border transition-all flex items-center gap-1 active:scale-95 ${isSelected
                                                    ? 'bg-[#861b00] text-white border-[#861b00] shadow-sm'
                                                    : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'
                                                    }`}
                                            >
                                                {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                                                {group.name}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-[9px] text-stone-400 mt-2 font-medium">
                                    *คลิกเพื่อเลือกกลุ่มตัวเลือกที่ลูกค้าสามารถปรับแต่งได้เวลาสั่งเมนูนี้
                                </p>
                            </div>

                        </div>
                        <div className="flex gap-3 shrink-0 pt-4 border-t border-stone-100">
                            <button onClick={() => { setIsItemModalOpen(false); setEditingItem(null); }} className="flex-1 py-4 bg-stone-100 text-stone-500 font-bold rounded-2xl">ยกเลิก</button>
                            <button onClick={saveMenuItem} className="flex-[2] py-4 bg-[#861b00] text-white font-black rounded-2xl shadow-lg active:scale-95">บันทึกเมนู</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🔴🌟 Modal: จัดการตัวเลือกเสริม (image_5a0b57.png) */}
            {isOptionsModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[85vh]">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h3 className="font-black text-2xl text-[#861b00] font-headline">จัดการตัวเลือกเสริม</h3>
                            <button onClick={() => setIsOptionsModalOpen(false)} className="w-8 h-8 flex justify-center items-center bg-stone-100 text-stone-400 rounded-full hover:bg-stone-200 transition-colors">
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1 min-h-0">
                            {optionGroups.map((group) => (
                                <div key={group.id} className="bg-white border-2 border-stone-100 rounded-2xl p-4 shadow-sm relative group/card">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-black text-stone-800 text-base">{group.name}</h4>
                                        <div className="flex items-center gap-2">
                                            {/* Toggle Switch (จำลอง UI) */}
                                            <button
                                                onClick={() => toggleOptionGroupActive(group.id)}
                                                className="w-10 h-5 rounded-full bg-[#52a675] relative flex items-center transition-colors px-0.5"
                                            >
                                                <div className="w-4 h-4 bg-white rounded-full transform translate-x-5 transition-transform shadow-sm"></div>
                                            </button>

                                            {/* ปุ่มแก้ไข / ลบ */}
                                            <button onClick={() => handleOpenCreateGroup(group)} className="w-7 h-7 flex items-center justify-center text-emerald-500 border border-stone-200 rounded-full hover:bg-emerald-50 bg-white transition-colors">
                                                <span className="material-symbols-outlined text-[14px]">edit</span>
                                            </button>
                                            <button onClick={() => handleDeleteOptionGroup(group.id)} className="w-7 h-7 flex items-center justify-center text-red-500 border border-stone-200 rounded-full hover:bg-red-50 bg-white transition-colors">
                                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* ป้ายแสดงหมวดหมู่ที่ใช้งาน */}
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {group.applyTo.map(catId => {
                                            const catName = categories.find(c => c.id === catId)?.name || catId;
                                            return (
                                                <span key={catId} className="bg-[#fcf5ef] text-[#861b00] text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-[#861b00]/10">
                                                    {catName}
                                                </span>
                                            )
                                        })}
                                    </div>

                                    {/* ตัวเลือกย่อย (สรุป) */}
                                    <div className="w-full bg-white border border-stone-200 rounded-xl p-2.5 text-[11px] font-medium text-stone-500 truncate">
                                        {group.choices.map(c => `${c.n}${c.p ? `(+${c.p})` : ''}`).join(', ')}
                                    </div>
                                </div>
                            ))}

                            {optionGroups.length === 0 && (
                                <div className="text-center py-10 text-stone-400">
                                    <p className="font-bold text-sm">ยังไม่มีตัวเลือกเสริม</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 shrink-0 mt-2">
                            <button
                                onClick={() => handleOpenCreateGroup()}
                                className="w-full py-4 bg-[#2c2929] hover:bg-black text-white font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                สร้างกลุ่ม
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🔴🌟 Modal: สร้าง/แก้ไข กลุ่มตัวเลือก*/}
            {isCreateGroupModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h3 className="font-black text-2xl text-[#861b00] font-headline">{editingOptionGroup ? 'แก้ไขกลุ่มตัวเลือก' : 'สร้างกลุ่มตัวเลือก'}</h3>
                            <button onClick={() => { setIsCreateGroupModalOpen(false); setIsOptionsModalOpen(true); }} className="w-8 h-8 flex justify-center items-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors">
                                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-5 pr-1 min-h-0 pb-4">

                            {/* ชื่อกลุ่ม */}
                            <div>
                                <label className="text-[11px] font-bold text-stone-500 mb-2 block">ชื่อกลุ่ม</label>
                                <input
                                    value={newOptionGroup.name}
                                    onChange={(e) => setNewOptionGroup({ ...newOptionGroup, name: e.target.value })}
                                    className="w-full p-3.5 bg-white border-2 border-stone-300 rounded-xl font-bold outline-none focus:border-[#861b00] text-stone-800"
                                    placeholder="เช่น เมล็ดกาแฟ, ความหวาน"
                                />
                            </div>

                            {/* แสดงผลในหมวดหมู่ */}
                            <div>
                                <label className="text-[11px] font-bold text-stone-500 mb-2 block">แสดงผลในหมวดหมู่</label>
                                <div className="p-3 border-2 border-stone-100 border-dashed rounded-xl bg-stone-50/50 flex flex-wrap gap-2">
                                    {categories.map(c => {
                                        const isSelected = newOptionGroup.applyTo.includes(c.id);
                                        return (
                                            <button
                                                key={c.id}
                                                onClick={() => handleCategoryApplyToggle(c.id)}
                                                className={`px-3 py-2 text-[12px] font-bold rounded-lg border bg-white flex items-center gap-2 transition-all ${isSelected ? 'border-[#861b00] text-[#861b00]' : 'border-stone-200 text-stone-500'
                                                    }`}
                                            >
                                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${isSelected ? 'bg-[#861b00] border-[#861b00]' : 'border-stone-300'}`}>
                                                    {isSelected && <span className="material-symbols-outlined text-[12px] text-white">check</span>}
                                                </div>
                                                {c.name}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* รายการย่อย */}
                            <div>
                                <label className="text-[11px] font-bold text-stone-500 mb-2 block">รายการย่อย</label>
                                <div className="space-y-2">
                                    {newOptionGroup.choices.map((choice, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                value={choice.n}
                                                onChange={(e) => handleChoiceChange(idx, 'n', e.target.value)}
                                                placeholder={`ตัวเลือก ${idx + 1}`}
                                                className="flex-[2] p-3 bg-white border-2 border-stone-300 rounded-xl text-sm font-bold outline-none focus:border-[#861b00] text-stone-800"
                                            />
                                            <input
                                                type="number"
                                                value={choice.p}
                                                onChange={(e) => handleChoiceChange(idx, 'p', e.target.value)}
                                                placeholder="+ราคา"
                                                className="flex-1 p-3 bg-white border-2 border-stone-300 rounded-xl text-sm font-bold text-center outline-none focus:border-[#861b00] text-stone-800 placeholder-stone-400"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>

                        <div className="pt-4 shrink-0 mt-2 border-t border-stone-100">
                            <button
                                onClick={saveOptionGroup}
                                className="w-full py-4 bg-[#861b00] hover:bg-[#6a1500] text-white font-black rounded-2xl shadow-lg transition-all text-lg"
                            >
                                บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* --- Header Area --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 shrink-0 gap-4">
                <h2 className="text-3xl font-black font-headline text-stone-800 flex items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-[#861b00]">restaurant_menu</span> จัดการเมนูสินค้า
                </h2>

                {/* 🌟 ปรับตำแหน่งและดีไซน์ปุ่มทั้ง 3 ให้เป๊ะตามรูปภาพ */}
                <div className="flex gap-3 overflow-x-auto no-scrollbar w-full sm:w-auto pb-2 sm:pb-0">

                    {/* 1. ปุ่มเพิ่มหมวดหมู่ (สีเหลืองส้ม) */}
                    <button onClick={() => setIsCatModalOpen(true)} className="shrink-0 px-6 py-3.5 bg-[#f49f0a] hover:bg-[#d97706] text-white rounded-full font-black text-[13px] shadow-sm flex items-center gap-2 active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-[20px]">create_new_folder</span> เพิ่มหมวดหมู่
                    </button>

                    {/* 2. ปุ่มเพิ่มเมนู (สีเขียว) */}
                    <button onClick={() => {
                        setNewItem({ name_th: '', name_en: '', price: '', cat: activeCatFilter !== 'all' ? activeCatFilter : categories[0]?.id, color: 'bg-white', options: [] });
                        setIsItemModalOpen(true);
                    }} className="shrink-0 px-6 py-3.5 bg-[#339b61] hover:bg-[#208b3a] text-white rounded-full font-black text-[13px] shadow-sm flex items-center gap-2 active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-[20px]">add_circle</span> เพิ่มเมนู
                    </button>

                    {/* 3. ปุ่มตัวเลือกเสริม (สีน้ำตาลเข้ม/ดำ) */}
                    <button onClick={() => setIsOptionsModalOpen(true)} className="shrink-0 px-6 py-3.5 bg-[#2c2828] hover:bg-black text-white rounded-full font-black text-[13px] shadow-sm flex items-center gap-2 active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-[20px]">tune</span> ตัวเลือกเสริม
                    </button>

                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 min-h-0 overflow-hidden">

                {/* 📂 ฝั่งซ้าย: หมวดหมู่ */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-stone-200 shadow-sm flex flex-col h-full overflow-hidden">
                    <div className="flex flex-col mb-6 border-b border-stone-50 pb-4">
                        <span className="font-bold text-[10px] uppercase tracking-widest text-stone-400 mb-3">ค้นหาหมวดหมู่</span>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-300 text-sm">search</span>
                            <input
                                type="text"
                                value={catSearch}
                                onChange={(e) => setCatSearch(e.target.value)}
                                placeholder="พิมพ์เพื่อค้นหา..."
                                className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold outline-none focus:border-amber-500 transition-all"
                            />
                        </div>
                    </div>

                    <ul className="space-y-2 overflow-y-auto no-scrollbar flex-1 pr-1">
                        {filteredCategories.map((c, idx) => (
                            <li
                                key={c.id}
                                draggable
                                onDragStart={() => handleDragStartCat(idx)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => handleDropCat(idx)}
                                className={`bg-stone-50 p-3 rounded-2xl border border-transparent flex justify-between items-center text-sm font-bold group hover:bg-white hover:border-amber-200 transition-all cursor-move ${draggedIdx === idx ? 'opacity-20' : ''}`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-stone-300 text-sm group-hover:text-amber-500">drag_indicator</span>
                                    <span className="text-stone-700">{c.name}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingCat(c); setNewCatName(c.name); setIsCatModalOpen(true); }} className="w-7 h-7 flex items-center justify-center text-emerald-500 hover:bg-emerald-50 rounded-full"><span className="material-symbols-outlined text-[16px]">edit</span></button>
                                    <button onClick={() => handleDeleteCat(c.id)} className="w-7 h-7 flex items-center justify-center text-stone-300 hover:text-red-500 rounded-full"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 🛒 ฝั่งขวา: ตารางสินค้า */}
                <div className="lg:col-span-3 bg-white p-6 rounded-[2.5rem] border border-stone-200 shadow-sm flex flex-col h-full overflow-hidden">

                    {/* Upper Toolbar: Filter & Search */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-stone-50 pb-6 shrink-0">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-full pb-2 md:pb-0">
                            <button onClick={() => setActiveCatFilter('all')} className={`shrink-0 px-5 py-2 text-xs rounded-full font-bold shadow-sm transition-all ${activeCatFilter === 'all' ? 'bg-stone-800 text-white scale-105' : 'bg-white border text-stone-400 hover:bg-stone-50'}`}>ทั้งหมด</button>
                            {categories.map(c => (
                                <button key={c.id} onClick={() => setActiveCatFilter(c.id)} className={`shrink-0 px-5 py-2 text-xs rounded-full font-bold shadow-sm transition-all ${String(activeCatFilter) === String(c.id) ? 'bg-[#861b00] text-white scale-105' : 'bg-white border text-stone-400 hover:bg-stone-50'}`}>{c.name}</button>
                            ))}
                        </div>
                        <div className="relative w-full md:w-64 shrink-0">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-300">search</span>
                            <input
                                type="text"
                                value={itemSearch}
                                onChange={(e) => setItemSearch(e.target.value)}
                                placeholder="ค้นหาชื่อเมนู..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-full text-xs font-bold outline-none focus:border-[#861b00] transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-y-auto flex-1 no-scrollbar border border-stone-100 rounded-[2rem] bg-white shadow-inner">
                        <table className="w-full text-left">
                            <thead className="bg-stone-50 border-b text-[10px] font-bold text-stone-500 uppercase tracking-widest sticky top-0 z-10">
                                <tr>
                                    <th className="py-5 px-6 w-16 text-center"></th>
                                    <th className="py-5 px-4 w-1/4">ชื่อเมนู (TH)</th>
                                    <th className="py-5 px-4 w-1/4">Product Name (EN)</th>
                                    <th className="py-5 px-4 w-1/8">หมวดหมู่</th>
                                    <th className="py-5 px-4 text-right w-24">ราคา</th>
                                    <th className="py-5 pr-8 text-center w-28">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                                {filteredItems.map((it, idx) => (
                                    <tr
                                        key={it.id}
                                        draggable
                                        onDragStart={() => handleDragStartItem(idx)}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => handleDropItem(idx)}
                                        className={`hover:bg-stone-50/50 group transition-colors cursor-move ${draggedIdx === idx ? 'opacity-20' : ''}`}
                                    >
                                        <td className="py-5 pl-6 text-center">
                                            <span className="material-symbols-outlined text-stone-200 group-hover:text-stone-400 transition-colors text-[20px]">drag_indicator</span>
                                        </td>
                                        <td className="py-5 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-3 h-3 rounded-full ${it.color || 'bg-stone-200'} border border-stone-200 shadow-sm shrink-0`}></div>
                                                <span className="font-black text-stone-800 text-[13px]">{it.name_th || it.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-4">
                                            <span className="font-bold text-stone-400 text-[12px]">{it.name_en || '-'}</span>
                                        </td>
                                        <td className="py-5 px-4">
                                            <span className="text-[10px] bg-stone-100 text-stone-600 px-2.5 py-1 rounded-md font-bold uppercase border border-stone-200">
                                                {categories.find(c => String(c.id) === String(it.cat))?.name || '-'}
                                            </span>
                                        </td>
                                        <td className="py-5 px-4 text-right">
                                            <span className="font-black text-base text-[#861b00]">฿{it.price.toLocaleString()}</span>
                                        </td>
                                        <td className="py-5 pr-8 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => {
                                                    setEditingItem(it);
                                                    setNewItem({
                                                        name_th: it.name_th || it.name || '',
                                                        name_en: it.name_en || '',
                                                        price: it.price.toString(),
                                                        cat: it.cat,
                                                        color: it.color || 'bg-white',
                                                        options: it.options || [] // ดึง options เดิมมา
                                                    });
                                                    setIsItemModalOpen(true);
                                                }} className="w-8 h-8 flex items-center justify-center text-emerald-500 hover:bg-emerald-50 rounded-full transition-all"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                                <button onClick={() => handleDeleteItem(it.id)} className="w-8 h-8 flex items-center justify-center text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredItems.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="py-10 text-center text-stone-400 font-bold text-sm">ไม่พบรายการเมนู</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}