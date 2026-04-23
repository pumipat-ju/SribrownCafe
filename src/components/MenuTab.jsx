import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';

export default function MenuTab({ menuAction, setMenuAction }) {
    const { categories, setCategories, menuItems, setMenuItems, optionGroups, setOptionGroups } = useContext(AppContext);
    const [activeCatFilter, setActiveCatFilter] = useState('all');
    const [catSearch, setCatSearch] = useState('');
    const [itemSearch, setItemSearch] = useState('');
    const [draggedIdx, setDraggedIdx] = useState(null);

    const colorPalette = [
        { id: 'stone', bg: 'bg-stone-200', text: 'text-stone-700', border: 'border-stone-400' },
        { id: 'brown', bg: 'bg-[#fdf8f5]', text: 'text-[#861b00]', border: 'border-[#861b00]/30' },
        { id: 'red', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-400' },
        { id: 'orange', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-400' },
        { id: 'amber', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-400' },
        { id: 'green', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-400' },
        { id: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-400' },
        { id: 'teal', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-400' },
        { id: 'blue', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-400' },
        { id: 'purple', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-400' },
        { id: 'pink', bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-400' }
    ];

    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [editingCat, setEditingCat] = useState(null);
    const [newCatName, setNewCatName] = useState('');
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [newItem, setNewItem] = useState({ name_th: '', name_en: '', price: '', cat: 'c1', color: 'bg-stone-200', image: '', options: [] });
    const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [editingOptionGroup, setEditingOptionGroup] = useState(null);
    const [newOptionGroup, setNewOptionGroup] = useState({ name: '', applyTo: [], choices: [{ n: '', p: '' }, { n: '', p: '' }, { n: '', p: '' }, { n: '', p: '' }] });

    useEffect(() => {
        if (menuAction === 'addCategory') { setEditingCat(null); setNewCatName(''); setIsCatModalOpen(true); setMenuAction(null); }
        else if (menuAction === 'addItem') { setEditingItem(null); setNewItem({ name_th: '', name_en: '', price: '', cat: activeCatFilter !== 'all' ? activeCatFilter : categories[0]?.id, color: 'bg-stone-200', image: '', options: [] }); setIsItemModalOpen(true); setMenuAction(null); }
        else if (menuAction === 'options') { setIsOptionsModalOpen(true); setMenuAction(null); }
    }, [menuAction, activeCatFilter, categories, setMenuAction]);

    const filteredItems = menuItems.filter(m => (activeCatFilter === 'all' || String(m.cat) === String(activeCatFilter)) && ((m.name_th?.toLowerCase().includes(itemSearch.toLowerCase())) || (m.name_en?.toLowerCase().includes(itemSearch.toLowerCase()))));

    const saveCategory = () => {
        if (!newCatName.trim()) return;
        if (editingCat) setCategories(categories.map(c => c.id === editingCat.id ? { ...c, name: newCatName } : c));
        else setCategories([...categories, { id: `c${Date.now()}`, name: newCatName }]);
        setIsCatModalOpen(false); setEditingCat(null); setNewCatName('');
    };

    const saveMenuItem = () => {
        if (!newItem.name_th || !newItem.price) return alert('ระบุชื่อและราคา');
        if (editingItem) setMenuItems(menuItems.map(m => m.id === editingItem.id ? { ...m, ...newItem, price: parseFloat(newItem.price) } : m));
        else setMenuItems([{ ...newItem, id: Date.now(), price: parseFloat(newItem.price) }, ...menuItems]);
        setIsItemModalOpen(false); setEditingItem(null);
    };

    const handleImageUpload = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setNewItem({ ...newItem, image: reader.result }); reader.readAsDataURL(file); } };
    const handleDragStartCat = (idx) => setDraggedIdx(idx);
    const handleDropCat = (idx) => { const n = [...categories]; const [m] = n.splice(draggedIdx, 1); n.splice(idx, 0, m); setCategories(n); setDraggedIdx(null); };
    const handleDragStartItem = (idx) => setDraggedIdx(idx);
    const handleDropItem = (idx) => {
        const n = [...menuItems]; const v = n.filter(m => activeCatFilter === 'all' || m.cat === activeCatFilter);
        const d = n.findIndex(m => m.id === v[draggedIdx].id); const t = n.findIndex(m => m.id === v[idx].id);
        const [m] = n.splice(d, 1); n.splice(t, 0, m); setMenuItems(n); setDraggedIdx(null);
    };

    return (
        <div className="w-full h-full flex flex-col animate-in fade-in duration-500 relative font-body pb-2">

            {/* Modals Zone ( Category / Item / Options ) - คงลอจิกเดิมไว้ 100% */}
            {isCatModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] p-6 lg:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                        <h3 className="font-black text-xl lg:text-2xl mb-6 text-stone-800">{editingCat ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}</h3>
                        <input autoFocus value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="w-full p-4 border-2 border-stone-100 bg-stone-50 rounded-2xl mb-8 text-center font-bold text-lg outline-none focus:border-[#861b00]" placeholder="ระบุชื่อ..." />
                        <div className="flex gap-3"><button onClick={() => setIsCatModalOpen(false)} className="flex-1 py-3 lg:py-4 bg-stone-100 text-stone-500 font-bold rounded-2xl">ยกเลิก</button><button onClick={saveCategory} className="flex-[2] py-3 lg:py-4 bg-stone-800 text-white font-black rounded-2xl">บันทึก</button></div>
                    </div>
                </div>
            )}

            {isItemModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] p-6 lg:p-8 max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-5 shrink-0 border-b pb-4"><h3 className="font-black text-xl lg:text-2xl text-stone-800">{editingItem ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}</h3><button onClick={() => setIsItemModalOpen(false)} className="w-8 h-8 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">close</span></button></div>
                        <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar pr-2 pb-4">
                            <div className="flex gap-4 items-center bg-stone-50 border p-4 rounded-2xl">
                                <div className={`w-20 h-20 lg:w-24 lg:h-24 rounded-2xl border-2 border-stone-200 overflow-hidden flex items-center justify-center shrink-0 relative group/preview ${!newItem.image ? newItem.color : 'bg-white'}`}>
                                    {newItem.image ? <><img src={newItem.image} className="w-full h-full object-cover" /><button onClick={() => setNewItem({ ...newItem, image: '' })} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/preview:opacity-100"><span className="material-symbols-outlined text-2xl">delete</span></button></> : <div className="flex flex-col items-center text-black/40"><span className="material-symbols-outlined text-3xl">add_photo_alternate</span><span className="font-black text-xs">{newItem.name_th?.charAt(0) || '?'}</span></div>}
                                </div>
                                <div className="flex-1 space-y-2"><label className="text-[10px] font-bold text-stone-500 uppercase">อัปโหลดรูปภาพ</label><input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[11px] file:font-black file:bg-[#861b00] file:text-white cursor-pointer bg-white border rounded-xl" /></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div><label className="text-[10px] font-bold text-stone-400 uppercase">ชื่อไทย</label><input value={newItem.name_th} onChange={(e) => setNewItem({ ...newItem, name_th: e.target.value })} className="w-full p-3 border-2 border-stone-100 bg-stone-50 rounded-xl font-bold outline-none focus:border-[#861b00]" /></div>
                                <div><label className="text-[10px] font-bold text-stone-400 uppercase">Name (EN)</label><input value={newItem.name_en} onChange={(e) => setNewItem({ ...newItem, name_en: e.target.value })} className="w-full p-3 border-2 border-stone-100 bg-stone-50 rounded-xl font-bold outline-none focus:border-[#861b00]" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[10px] font-bold text-stone-400 uppercase">ราคา</label><input type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} className="w-full p-3 border-2 border-stone-100 bg-stone-50 rounded-xl font-black text-[#861b00] outline-none" /></div>
                                <div><label className="text-[10px] font-bold text-stone-400 uppercase">หมวดหมู่</label><select value={newItem.cat} onChange={(e) => setNewItem({ ...newItem, cat: e.target.value })} className="w-full p-3 border-2 border-stone-100 bg-stone-50 rounded-xl font-bold outline-none text-sm">{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                            </div>
                            <div className="pt-3 border-t"><label className="text-[10px] font-bold text-stone-500 mb-2 block uppercase">สีประจำเมนู</label><div className="flex flex-wrap gap-2">{colorPalette.map(c => <button type="button" key={c.id} onClick={() => setNewItem({ ...newItem, color: c.bg })} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${c.bg} ${newItem.color === c.bg ? 'border-stone-400 scale-110 shadow-md ring-2 ring-stone-200' : 'border-transparent'}`}>{newItem.color === c.bg && <span className="material-symbols-outlined text-[14px]">check</span>}</button>)}</div></div>
                        </div>
                        <div className="flex gap-3 shrink-0 pt-4 border-t"><button onClick={() => setIsItemModalOpen(false)} className="flex-1 py-3.5 bg-stone-100 text-stone-500 font-bold rounded-xl">ยกเลิก</button><button onClick={saveMenuItem} className="flex-[2] py-3.5 bg-[#861b00] text-white font-black rounded-xl">บันทึก</button></div>
                    </div>
                </div>
            )}

            {/* 🌟 Layout: 1:2 on iPad (md) and 1:3 on PC (lg) */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-8 flex-1 min-h-0 overflow-hidden">

                {/* 📂 Left Sidebar: Categories */}
                <div className="md:col-span-1 bg-white p-4 lg:p-6 rounded-[2.5rem] border border-stone-200 shadow-sm flex flex-col h-full overflow-hidden">
                    <div className="flex flex-col mb-4 border-b pb-4 shrink-0">
                        <span className="font-bold text-[10px] uppercase tracking-widest text-stone-400 mb-2">ค้นหาหมวดหมู่</span>
                        <div className="relative"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-300 text-sm">search</span><input type="text" value={catSearch} onChange={(e) => setCatSearch(e.target.value)} placeholder="พิมพ์..." className="w-full pl-9 pr-4 py-2 bg-stone-50 border rounded-xl text-xs font-bold outline-none focus:border-amber-500 transition-all" /></div>
                    </div>
                    <ul className="space-y-2 overflow-y-auto no-scrollbar flex-1 pr-1">
                        {categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase())).map((c, idx) => (
                            <li key={c.id} draggable onDragStart={() => handleDragStartCat(idx)} onDragOver={(e) => e.preventDefault()} onDrop={() => handleDropCat(idx)} className={`bg-stone-50 p-2.5 lg:p-3 rounded-2xl border border-transparent flex justify-between items-center text-[12px] lg:text-[13px] font-bold group hover:bg-white hover:border-amber-200 cursor-move ${draggedIdx === idx ? 'opacity-20' : ''}`}>
                                <div className="flex items-center gap-2 overflow-hidden"><span className="material-symbols-outlined text-stone-300 text-sm shrink-0">drag_indicator</span><span className="text-stone-700 truncate">{c.name}</span></div>
                                <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 shrink-0">
                                    <button onClick={() => { setEditingCat(c); setNewCatName(c.name); setIsCatModalOpen(true); }} className="w-7 h-7 rounded-full text-emerald-500 hover:bg-emerald-50 flex items-center justify-center border bg-white shadow-sm"><span className="material-symbols-outlined text-[14px]">edit</span></button>
                                    <button onClick={() => window.confirm('ลบหมวดหมู่นี้?') && setCategories(categories.filter(cat => cat.id !== c.id))} className="w-7 h-7 rounded-full text-stone-300 hover:text-red-500 flex items-center justify-center border bg-white shadow-sm"><span className="material-symbols-outlined text-[14px]">delete</span></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 🛒 Right Section: Menu Table (Compact for iPad) */}
                <div className="md:col-span-2 lg:col-span-3 bg-white p-4 lg:p-6 rounded-[2.5rem] border border-stone-200 shadow-sm flex flex-col h-full overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 border-b pb-4 shrink-0">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
                            <button onClick={() => setActiveCatFilter('all')} className={`shrink-0 px-4 py-2 text-[11px] rounded-full font-bold transition-all ${activeCatFilter === 'all' ? 'bg-stone-800 text-white' : 'bg-white border text-stone-400'}`}>ทั้งหมด</button>
                            {categories.map(c => <button key={c.id} onClick={() => setActiveCatFilter(c.id)} className={`shrink-0 px-4 py-2 text-[11px] rounded-full font-bold transition-all ${String(activeCatFilter) === String(c.id) ? 'bg-[#861b00] text-white' : 'bg-white border text-stone-400'}`}>{c.name}</button>)}
                        </div>
                        <div className="relative w-full sm:w-56 shrink-0"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-300 text-sm">search</span><input type="text" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} placeholder="ค้นหาเมนู..." className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-full text-xs font-bold outline-none focus:border-[#861b00] shadow-sm" /></div>
                    </div>

                    {/* 🌟 Compact Table with Sticky Header */}
                    <div className="overflow-x-auto flex-1 no-scrollbar border border-stone-100 rounded-[2rem] bg-white shadow-inner block w-full">
                        <table className="w-full text-left min-w-[550px] lg:min-w-full">
                            <thead className="bg-stone-50 border-b text-[10px] font-bold text-stone-500 uppercase tracking-widest sticky top-0 z-10">
                                <tr>
                                    <th className="py-4 px-4 w-12 text-center"></th>
                                    <th className="py-4 px-4">รายการสินค้า</th>
                                    <th className="py-4 px-4 text-right w-24">ราคา</th>
                                    <th className="py-4 pr-6 text-center w-24 lg:w-28">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                                {filteredItems.map((it, idx) => (
                                    <tr key={it.id} draggable onDragStart={() => handleDragStartItem(idx)} onDragOver={(e) => e.preventDefault()} onDrop={() => handleDropItem(idx)} className={`hover:bg-stone-50/50 group transition-colors cursor-move ${draggedIdx === idx ? 'opacity-20' : ''}`}>
                                        <td className="py-3 pl-4 text-center"><span className="material-symbols-outlined text-stone-200 group-hover:text-stone-400 text-[18px]">drag_indicator</span></td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl overflow-hidden border border-stone-200 shrink-0 flex items-center justify-center ${!it.image ? (it.color || 'bg-stone-200') : 'bg-white'}`}>
                                                    {it.image ? <img src={it.image} className="w-full h-full object-cover" /> : <span className="font-black text-black/30 text-[11px] lg:text-xs uppercase">{it.name_th?.charAt(0) || '?'}</span>}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-stone-800 text-[13px] lg:text-[14px] truncate">{it.name_th}</span>
                                                        <span className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-bold uppercase shrink-0 lg:hidden">
                                                            {categories.find(c => String(c.id) === String(it.cat))?.name || '-'}
                                                        </span>
                                                    </div>
                                                    {it.name_en && <span className="font-bold text-stone-400 text-[10px] lg:text-[11px] truncate">{it.name_en}</span>}
                                                    {/* Badge Category (Visible only on Large screens or PC) */}
                                                    <div className="hidden lg:block mt-1">
                                                        <span className="text-[9px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded font-black uppercase border">{categories.find(c => String(c.id) === String(it.cat))?.name || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right"><span className="font-black text-[15px] lg:text-[16px] text-[#861b00]">฿{it.price.toLocaleString()}</span></td>
                                        <td className="py-3 pr-6 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingItem(it); setNewItem({ ...it, price: it.price.toString() }); setIsItemModalOpen(true); }} className="w-9 h-9 lg:w-10 lg:h-10 rounded-full text-emerald-500 hover:bg-emerald-50 flex items-center justify-center border bg-white shadow-sm"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                                <button onClick={() => handleDeleteItem(it.id)} className="w-9 h-9 lg:w-10 lg:h-10 rounded-full text-stone-300 hover:text-red-500 flex items-center justify-center border bg-white shadow-sm"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}