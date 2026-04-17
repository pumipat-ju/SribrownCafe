import React, { useState } from 'react';

export default function InventoryTab() {
    // จำลองข้อมูลคลังสินค้า (มีจำนวนที่มีอยู่ และจุดแจ้งเตือนขั้นต่ำ min)
    const [inventory, setInventory] = useState([
        { id: 1, name: 'เมล็ดกาแฟ (คั่วกลาง)', category: 'วัตถุดิบ', amount: 2500, unit: 'g', min: 1000 },
        { id: 2, name: 'เมล็ดกาแฟ (คั่วเข้ม)', category: 'วัตถุดิบ', amount: 800, unit: 'g', min: 1000 },
        { id: 3, name: 'นมสด', category: 'วัตถุดิบ', amount: 2, unit: 'แกลลอน', min: 5 },
        { id: 4, name: 'แก้วพลาสติก 16oz', category: 'บรรจุภัณฑ์', amount: 450, unit: 'ใบ', min: 200 },
        { id: 5, name: 'หลอด', category: 'บรรจุภัณฑ์', amount: 50, unit: 'ชิ้น', min: 100 },
    ]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [addAmount, setAddAmount] = useState('');

    // นับจำนวนสินค้าที่สถานะต่างๆ
    const lowStockCount = inventory.filter(i => i.amount <= i.min && i.amount > 0).length;
    const outOfStockCount = inventory.filter(i => i.amount === 0).length;

    // ฟังก์ชันคำนวณสถานะและสี
    const getStatus = (amount, min) => {
        if (amount === 0) return { label: 'หมด', color: 'bg-red-50 text-red-600 border-red-200', bar: 'bg-red-500', width: '0%' };
        if (amount <= min) return { label: 'ใกล้หมด', color: 'bg-amber-50 text-amber-600 border-amber-200', bar: 'bg-amber-400', width: `${(amount / min) * 50}%` };
        return { label: 'ปกติ', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', bar: 'bg-emerald-500', width: '100%' };
    };

    // ฟังก์ชันเปิดหน้าต่างเติมของ
    const openRestockModal = (item) => {
        setSelectedItem(item);
        setAddAmount('');
        setIsModalOpen(true);
    };

    // ฟังก์ชันยืนยันการเติมของ
    const handleRestock = () => {
        if (!addAmount || isNaN(addAmount)) return alert('กรุณาระบุจำนวน');
        setInventory(inventory.map(item =>
            item.id === selectedItem.id
                ? { ...item, amount: item.amount + parseFloat(addAmount) }
                : item
        ));
        setIsModalOpen(false);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 w-full relative">

            {/* 📦 Modal: รับของเข้าสต๊อก */}
            {isModalOpen && selectedItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full relative z-10 animate-fade-in shadow-2xl">
                        <h3 className="font-black text-2xl mb-2 font-headline text-[#861b00]">รับของเข้าสต๊อก</h3>
                        <p className="text-stone-500 text-sm font-bold mb-6">รายการ: {selectedItem.name}</p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="text-[10px] font-bold block mb-1 text-stone-500 uppercase">จำนวนที่รับเพิ่ม ({selectedItem.unit})</label>
                                <input
                                    type="number" autoFocus
                                    value={addAmount} onChange={(e) => setAddAmount(e.target.value)}
                                    className="w-full p-4 bg-stone-50 border-2 border-stone-200 rounded-xl font-black text-xl text-center outline-none focus:border-[#861b00]"
                                    placeholder="0"
                                />
                            </div>
                            <div className="bg-stone-50 p-4 rounded-xl text-center border">
                                <p className="text-[10px] text-stone-500 font-bold uppercase mb-1">ยอดคงเหลือใหม่</p>
                                <p className="text-xl font-black text-emerald-600">
                                    {selectedItem.amount + (parseFloat(addAmount) || 0)} <span className="text-sm">{selectedItem.unit}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-stone-100 font-bold text-stone-600 rounded-2xl hover:bg-stone-200 transition-colors">ยกเลิก</button>
                            <button onClick={handleRestock} className="flex-[2] py-4 bg-[#861b00] text-white font-bold rounded-2xl shadow-lg hover:bg-black transition-colors">ยืนยันรับเข้า</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ส่วนเนื้อหาหลัก --- */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black font-headline text-[#861b00] flex items-center gap-2">
                    <span className="material-symbols-outlined text-3xl">inventory_2</span> คลังสินค้าและวัตถุดิบ
                </h2>
                <button className="bg-[#861b00] text-white px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-black transition-colors shadow-md">
                    <span className="material-symbols-outlined text-[18px]">add_circle</span> เพิ่มรายการใหม่
                </button>
            </div>

            {/* การ์ด Dashboard สต๊อก */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-[2rem] border shadow-sm flex flex-col justify-center text-center">
                    <p className="text-[10px] text-stone-500 font-bold uppercase mb-1">รายการทั้งหมด</p>
                    <h3 className="text-3xl font-black text-stone-800">{inventory.length} <span className="text-sm text-stone-400">รายการ</span></h3>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border shadow-sm flex flex-col justify-center text-center relative overflow-hidden">
                    <p className="text-[10px] text-stone-500 font-bold uppercase mb-1">ใกล้หมด (Low Stock)</p>
                    <h3 className="text-3xl font-black text-amber-500">{lowStockCount} <span className="text-sm text-stone-400">รายการ</span></h3>
                    {lowStockCount > 0 && <div className="absolute top-0 right-0 w-2 h-full bg-amber-400"></div>}
                </div>
                <div className="bg-white p-5 rounded-[2rem] border shadow-sm flex flex-col justify-center text-center relative overflow-hidden">
                    <p className="text-[10px] text-stone-500 font-bold uppercase mb-1">สินค้าหมด (Out of Stock)</p>
                    <h3 className="text-3xl font-black text-red-500">{outOfStockCount} <span className="text-sm text-stone-400">รายการ</span></h3>
                    {outOfStockCount > 0 && <div className="absolute top-0 right-0 w-2 h-full bg-red-500 animate-pulse"></div>}
                </div>
            </div>

            {/* ตารางคลังสินค้า */}
            <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left text-sm min-w-[800px]">
                        <thead className="bg-stone-50 border-b text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                            <tr>
                                <th className="p-4 pl-6 w-1/3">รายการวัตถุดิบ/สินค้า</th>
                                <th className="p-4 w-32">หมวดหมู่</th>
                                <th className="p-4 w-48">ปริมาณคงเหลือ</th>
                                <th className="p-4 w-28 text-center">สถานะ</th>
                                <th className="p-4 text-center pr-6">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {inventory.map(item => {
                                const status = getStatus(item.amount, item.min);
                                return (
                                    <tr key={item.id} className="hover:bg-stone-50 transition-colors group">
                                        <td className="p-4 pl-6">
                                            <p className="font-bold text-xs text-stone-800">{item.name}</p>
                                            <p className="text-[9px] text-stone-400 font-bold uppercase">ขั้นต่ำ: {item.min} {item.unit}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-[9px] bg-stone-100 text-stone-500 font-bold px-2 py-1 rounded border">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-black text-xs text-stone-700">{item.amount}</span>
                                                <span className="text-[9px] text-stone-400 font-bold">{item.unit}</span>
                                            </div>
                                            {/* แถบหลอดแก้วแสดงปริมาณ */}
                                            <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden flex items-center">
                                                <div className={`h-full rounded-full transition-all duration-500 ${status.bar}`} style={{ width: status.width }}></div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase border shadow-sm ${status.color}`}>
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center pr-6">
                                            <button
                                                onClick={() => openRestockModal(item)}
                                                className="text-[10px] bg-white px-3 py-1.5 rounded-lg border border-stone-200 text-[#861b00] font-bold flex items-center gap-1 hover:bg-stone-50 shadow-sm mx-auto active:scale-95 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">move_to_inbox</span> รับเข้า
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}