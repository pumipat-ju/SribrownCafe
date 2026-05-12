import React, { useContext, useState, useRef } from 'react';
import { AppContext } from '../context/AppContext';

export default function DashboardTab() {
    const { transactions, members, inventory } = useContext(AppContext);

    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const dateInputRef = useRef(null);

    const isToday = selectedDate === todayStr;

    const displayDate = isToday
        ? 'วันนี้'
        : new Date(selectedDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

    // ฟังก์ชัน parse date จาก transaction (รองรับหลาย format)
    const parseTxDate = (t) => {
        const txDateStr = t.date_raw || t.created_at || t.dateRaw || t.date;
        if (!txDateStr) return null;
        try {
            let txDate;
            if (typeof txDateStr === 'string' && txDateStr.includes(' ') && !txDateStr.includes('T')) {
                txDate = new Date(txDateStr.replace(' ', 'T'));
            } else {
                txDate = new Date(txDateStr);
            }
            if (isNaN(txDate.getTime())) return null;
            return txDate;
        } catch (e) { return null; }
    };

    // กรอง transaction ตามวันที่เลือก
    const selectedDaySalesTxns = transactions.filter(t => {
        if (t.type !== 'SALE' || t.status === 'VOIDED') return false;
        const txDate = parseTxDate(t);
        if (!txDate) return false;
        return txDate.toISOString().startsWith(selectedDate);
    });

    const totalSales = selectedDaySalesTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalOrders = selectedDaySalesTxns.length;
    const avgBill = totalOrders > 0 ? (totalSales / totalOrders).toFixed(0) : 0;

    const lowStockItems = inventory?.filter(i => {
        const qty = i.quantity ?? i.amount ?? 0;
        const minLevel = i.min_level ?? i.min ?? null;
        return minLevel !== null && minLevel > 0 && qty <= minLevel;
    }).length || 0;

    // Bestsellers จากวันที่เลือก
    const itemCounts = {};
    selectedDaySalesTxns.forEach(t => {
        try {
            const items = typeof t.items === 'string' ? JSON.parse(t.items) : (t.items || []);
            items.forEach(item => {
                const itemName = item.name_th || item.name_en || item.name || 'ไม่ระบุชื่อ';
                if (!itemCounts[itemName]) itemCounts[itemName] = { qty: 0, rev: 0 };
                itemCounts[itemName].qty += item.qty || 1;
                itemCounts[itemName].rev += (item.price || 0) * (item.qty || 1);
            });
        } catch (e) {}
    });

    const colors = ['bg-stone-800', 'bg-orange-500', 'bg-amber-600', 'bg-yellow-500'];
    const topItems = Object.keys(itemCounts)
        .map(name => ({ name, ...itemCounts[name] }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 4)
        .map((item, idx) => ({ ...item, color: colors[idx % colors.length] }));

    // Weekly chart — 7 วันย้อนหลังจากวันที่เลือก
    const weeklyData = [];
    let maxSales = 1;
    for (let i = 6; i >= 0; i--) {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - i);
        const isoDate = d.toISOString().split('T')[0];

        const daySales = transactions.filter(t => {
            if (t.type !== 'SALE' || t.status === 'VOIDED') return false;
            const txDate = parseTxDate(t);
            if (!txDate) return false;
            return txDate.toISOString().startsWith(isoDate);
        }).reduce((sum, t) => sum + (t.amount || 0), 0);

        if (daySales > maxSales) maxSales = daySales;

        const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
        weeklyData.push({
            day: dayNames[d.getDay()],
            isoDate,
            sales: daySales,
            isSelected: isoDate === selectedDate,
            pct: 0
        });
    }

    weeklyData.forEach(d => {
        d.pct = Math.max(5, Math.round((d.sales / maxSales) * 100));
    });

    return (
        <div className="flex flex-col h-full gap-5 w-full relative animate-in fade-in duration-500 font-body">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-black text-[#861b00] font-headline flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-3xl">query_stats</span> ภาพรวมธุรกิจ (Dashboard)
                    </h2>
                    <p className="text-xs font-bold text-stone-500">
                        ข้อมูล: {displayDate} {isToday && `· ${new Date().toLocaleTimeString('th-TH')}`}
                    </p>
                </div>

                {/* Date Picker Button */}
                <div className="relative flex items-center gap-2">
                    {!isToday && (
                        <button
                            onClick={() => setSelectedDate(todayStr)}
                            className="bg-stone-100 text-stone-500 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-stone-200 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[14px]">today</span> กลับวันนี้
                        </button>
                    )}
                    <button
                        onClick={() => dateInputRef.current?.showPicker()}
                        className="bg-white border text-stone-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-stone-50 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                        {displayDate}
                    </button>
                    <input
                        ref={dateInputRef}
                        type="date"
                        value={selectedDate}
                        max={todayStr}
                        onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                        className="absolute opacity-0 w-0 h-0 pointer-events-none"
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                <div className="bg-white p-5 rounded-[2rem] border shadow-sm relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-50 rounded-full"></div>
                    <p className="text-[10px] text-stone-500 font-bold uppercase mb-1 relative z-10">ยอดขายรวม (Sales)</p>
                    <h3 className="text-3xl font-black text-emerald-600 font-headline relative z-10">฿{totalSales.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border shadow-sm relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 rounded-full"></div>
                    <p className="text-[10px] text-stone-500 font-bold uppercase mb-1 relative z-10">จำนวนบิล (Orders)</p>
                    <h3 className="text-3xl font-black text-blue-600 font-headline relative z-10">{totalOrders}</h3>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border shadow-sm relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-50 rounded-full"></div>
                    <p className="text-[10px] text-stone-500 font-bold uppercase mb-1 relative z-10">ยอดใช้จ่ายเฉลี่ย (Avg. Bill)</p>
                    <h3 className="text-3xl font-black text-purple-600 font-headline relative z-10">฿{avgBill}</h3>
                </div>
                <div className="bg-[#861b00] p-5 rounded-[2rem] shadow-md relative overflow-hidden text-white">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full"></div>
                    <p className="text-[10px] text-stone-300 font-bold uppercase mb-1 relative z-10">แจ้งเตือนสต๊อก (Low Stock)</p>
                    <h3 className="text-3xl font-black font-headline relative z-10 flex items-center gap-2">
                        {lowStockItems} <span className="text-sm font-normal text-amber-200">รายการ</span>
                    </h3>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 pb-2">

                {/* Weekly Bar Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col h-full">
                    <h3 className="font-bold text-sm text-stone-700 uppercase tracking-wider mb-6 shrink-0">
                        แนวโน้มยอดขาย (7 วันก่อน{isToday ? '' : displayDate})
                    </h3>
                    <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2 border-b border-stone-100 min-h-0">
                        {weeklyData.map((data, idx) => (
                            <div
                                key={idx}
                                onClick={() => setSelectedDate(data.isoDate)}
                                className="w-full h-full flex flex-col items-center justify-end gap-2 group cursor-pointer"
                            >
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg whitespace-nowrap">
                                    ฿{data.sales.toLocaleString()}
                                </div>
                                <div
                                    className={`w-full max-w-[40px] rounded-t-xl relative overflow-hidden transition-colors
                                        ${data.isSelected ? 'bg-emerald-100' : 'bg-stone-100 group-hover:bg-emerald-100'}`}
                                    style={{ height: `${data.pct}%` }}
                                >
                                    <div className={`absolute bottom-0 w-full h-full rounded-t-xl transition-colors
                                        ${data.isSelected ? 'bg-emerald-500' : 'bg-[#861b00] group-hover:bg-emerald-500'}`}
                                    ></div>
                                </div>
                                <span className={`text-xs font-bold ${data.isSelected ? 'text-emerald-600' : 'text-stone-400 group-hover:text-stone-800'}`}>
                                    {data.day}
                                </span>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-stone-400 font-bold mt-3 shrink-0 text-center">กดที่แท่งกราฟเพื่อดูข้อมูลของวันนั้น</p>
                </div>

                {/* Bestsellers */}
                <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col h-full">
                    <h3 className="font-bold text-sm text-stone-700 uppercase tracking-wider mb-4 shrink-0">เมนูขายดี (Bestsellers)</h3>
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                        {topItems.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-stone-300 font-bold text-sm">ยังไม่มีข้อมูลการขาย</div>
                        ) : topItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-6 h-6 shrink-0 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center text-[10px] font-black">
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-xs text-stone-800 truncate">{item.name}</p>
                                    <div className="w-full bg-stone-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                        <div
                                            className={`h-full ${item.color} rounded-full`}
                                            style={{ width: topItems.length > 0 ? `${(item.qty / topItems[0].qty) * 100}%` : '0%' }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-black text-xs text-stone-700">{item.qty}</p>
                                    <p className="text-[9px] text-stone-400 font-bold uppercase">แก้ว</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}