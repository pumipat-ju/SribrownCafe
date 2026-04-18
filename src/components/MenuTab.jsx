import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { fetchJSON } from '../api.js';

export default function MenuTab() {
    const { categories, setCategories, menuItems, setMenuItems } = useContext(AppContext);
    const [activeCatFilter, setActiveCatFilter] = useState('all');

    // --- State สำหรับการค้นหา ---
    const [catSearch, setCatSearch] = useState('');
    const [itemSearch, setItemSearch] = useState('');

    // --- State สำหรับ Modals ---
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingCat, setEditingCat] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [newCatName, setNewCatName] = useState('');
    const [newItem, setNewItem] = useState({ name: '', price: '', cat: '', color: 'bg-white' });

    // --- State สำหรับการลากวาง (Drag & Drop) ---
    const [draggedIdx, setDraggedIdx] = useState(null);

    // ================= ฟังก์ชันจัดการข้อมูล =================
    const handleDeleteItem = async (id) => { 
        if (window.confirm('ต้องการลบเมนูนี้?')) {
            try {
                await fetchJSON(`/menu/${id}`, { method: 'DELETE' });
                setMenuItems(menuItems.filter(i => i.id !== id)); 
            } catch (e) {
                alert('Failed to delete menu: ' + e.message);
            }
        }
    };
    const handleDeleteCat = (id) => { if (window.confirm('ต้องการลบหมวดหมู่นี้?')) setCategories(categories.filter(c => c.id !== id)); };

    const saveCategory = () => {
        if (!newCatName.trim()) return;
        if (editingCat) {
            setCategories(categories.map(c => c.id === editingCat.id ? { ...c, name: newCatName } : c));
        } else {
            setCategories([...categories, { id: 'c' + Date.now(), name: newCatName }]);
        }
        setNewCatName(''); setEditingCat(null); setIsCatModalOpen(false);
    };

    const saveMenuItem = async () => {
        if (!newItem.name || !newItem.price) return;
        const finalCat = newItem.cat || categories[0]?.id;
        try {
            if (editingItem) {
                await fetchJSON(`/menu/${editingItem.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        name: newItem.name,
                        price: parseFloat(newItem.price),
                        category: finalCat,
                        image: newItem.color
                    })
                });
                setMenuItems(menuItems.map(it => it.id === editingItem.id ? { ...it, ...newItem, price: parseFloat(newItem.price), cat: finalCat } : it));
            } else {
                const created = await fetchJSON(`/menu/`, {
                    method: 'POST',
                    body: JSON.stringify({
                        name: newItem.name,
                        price: parseFloat(newItem.price),
                        category: finalCat,
                        image: newItem.color
                    })
                });
                setMenuItems([...menuItems, { id: created.id, ...newItem, price: parseFloat(newItem.price), cat: finalCat }]);
            }
            setNewItem({ name: '', price: '', cat: '', color: 'bg-white' }); setEditingItem(null); setIsItemModalOpen(false);
        } catch (e) {
            alert('Failed to save menu: ' + e.message);
        }
    };

    // ================= ระบบลากวาง (Drag & Drop) =================

    // สำหรับหมวดหมู่
    const handleDragStartCat = (idx) => setDraggedIdx(idx);
    const handleDropCat = (targetIdx) => {
        const items = [...categories];
        const draggedItem = items.splice(draggedIdx, 1)[0];
        items.splice(targetIdx, 0, draggedItem);
        setCategories(items);
        setDraggedIdx(null);
    };

    // สำหรับเมนูสินค้า
    const handleDragStartItem = (idx) => setDraggedIdx(idx);
    const handleDropItem = (targetIdx) => {
        // การลากวางเมนูจะทำได้สมบูรณ์ที่สุดเมื่ออยู่ในหน้า "ทั้งหมด" หรือหน้าหมวดหมู่ที่ไม่ได้กรองค้นหา
        const items = [...menuItems];
        const draggedItem = items.splice(draggedIdx, 1)[0];
        items.splice(targetIdx, 0, draggedItem);
        setMenuItems(items);
        setDraggedIdx(null);
    };

    // ================= การกรองข้อมูล (Filter & Search) =================
    const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()));

    const filteredItems = menuItems.filter(item => {
        const matchesCat = activeCatFilter === 'all' || item.cat === activeCatFilter;
        const matchesSearch = item.name.toLowerCase().includes(itemSearch.toLowerCase());
        return matchesCat && matchesSearch;
    });

    return (
        <div className="max-w-[95%] mx-auto h-full flex flex-col animate-in fade-in duration-500 w-full relative pb-10 font-body">

            {/* 🔴 Modals (เหมือนเดิมแต่ปรับปรุงสไตล์เล็กน้อย) */}
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

            {isItemModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
                        <h3 className="font-black text-2xl mb-6 text-stone-800 font-headline">{editingItem ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}</h3>
                        <div className="space-y-5 mb-8">
                            <div>
                                <label className="text-[10px] font-bold text-stone-400 block mb-2 uppercase tracking-widest">ชื่อเมนู</label>
                                <input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="w-full p-3.5 border-2 border-stone-100 bg-stone-50 rounded-2xl font-bold outline-none focus:border-emerald-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-stone-400 block mb-2 uppercase tracking-widest">ราคา (฿)</label>
                                    <input type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} className="w-full p-3.5 border-2 border-stone-100 bg-stone-50 rounded-2xl font-black text-emerald-600 outline-none focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-stone-400 block mb-2 uppercase tracking-widest">หมวดหมู่</label>
                                    <select value={newItem.cat} onChange={(e) => setNewItem({ ...newItem, cat: e.target.value })} className="w-full p-3.5 border-2 border-stone-100 bg-stone-50 rounded-2xl font-bold outline-none focus:border-emerald-500">
                                        <option value="">-- เลือกหมวดหมู่ --</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setIsItemModalOpen(false); setEditingItem(null); }} className="flex-1 py-4 bg-stone-100 text-stone-500 font-bold rounded-2xl">ยกเลิก</button>
                            <button onClick={saveMenuItem} className="flex-[2] py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg active:scale-95">บันทึกเมนู</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Header Area --- */}
            <div className="flex justify-between items-center mb-8 shrink-0">
                <h2 className="text-3xl font-black font-headline text-stone-800 flex items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-[#861b00]">restaurant_menu</span> จัดการเมนูสินค้า
                </h2>
                <div className="flex gap-3">
                    <button onClick={() => setIsCatModalOpen(true)} className="px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-bold text-sm shadow-md flex items-center gap-2 active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-[20px]">create_new_folder</span> เพิ่มหมวดหมู่
                    </button>
                    <button onClick={() => { setNewItem({ ...newItem, cat: activeCatFilter !== 'all' ? activeCatFilter : categories[0]?.id }); setIsItemModalOpen(true); }} className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-sm shadow-md flex items-center gap-2 active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-[20px]">add_circle</span> เพิ่มเมนู
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
                        <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-full">
                            <button onClick={() => setActiveCatFilter('all')} className={`shrink-0 px-5 py-2 text-xs rounded-full font-bold shadow-sm transition-all ${activeCatFilter === 'all' ? 'bg-stone-800 text-white scale-105' : 'bg-white border text-stone-400 hover:bg-stone-50'}`}>ทั้งหมด</button>
                            {categories.map(c => (
                                <button key={c.id} onClick={() => setActiveCatFilter(c.id)} className={`shrink-0 px-5 py-2 text-xs rounded-full font-bold shadow-sm transition-all ${activeCatFilter === c.id ? 'bg-[#861b00] text-white scale-105' : 'bg-white border text-stone-400 hover:bg-stone-50'}`}>{c.name}</button>
                            ))}
                        </div>
                        <div className="relative w-full md:w-64">
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

                    {/* Table View with Drag & Drop */}
                    <div className="overflow-y-auto flex-1 no-scrollbar border border-stone-100 rounded-[2rem] bg-white shadow-inner">
                        <table className="w-full text-left">
                            <thead className="uppercase font-bold text-stone-400 sticky top-0 bg-stone-50/90 backdrop-blur-sm z-10 shadow-sm border-b">
                                <tr>
                                    <th className="py-5 pl-8 text-[10px] tracking-widest w-12"></th>
                                    <th className="py-5 pl-2 text-[10px] tracking-widest">เมนูสินค้า</th>
                                    <th className="py-5 px-4 text-right text-[10px] tracking-widest w-32">ราคา</th>
                                    <th className="py-5 pr-8 text-center text-[10px] tracking-widest w-40">จัดการ</th>
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
                                        <td className="py-5 pl-8">
                                            <span className="material-symbols-outlined text-stone-200 group-hover:text-stone-400 transition-colors">drag_indicator</span>
                                        </td>
                                        <td className="py-5 pl-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-3 h-3 rounded-full ${it.color || 'bg-white'} border border-stone-200 shadow-sm`}></div>
                                                <span className="font-black text-stone-700 text-sm">{it.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-4 text-right">
                                            <span className="font-black text-lg text-[#861b00]">฿{it.price.toLocaleString()}</span>
                                        </td>
                                        <td className="py-5 pr-8">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingItem(it); setNewItem({ name: it.name, price: it.price.toString(), cat: it.cat, color: it.color }); setIsItemModalOpen(true); }} className="w-8 h-8 flex items-center justify-center text-emerald-500 hover:bg-emerald-50 rounded-full transition-all"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                                <button onClick={() => handleDeleteItem(it.id)} className="w-8 h-8 flex items-center justify-center text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"><span className="material-symbols-outlined text-[18px]">delete</span></button>
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