import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export default function DashboardTab() {
    const { transactions, members, inventory } = useContext(AppContext);

    const today = new Date().toISOString().split('T')[0];

    const todaySalesTxns = transactions.filter(t => {
        if (t.type !== 'SALE' || t.status === 'VOIDED') return false;
        const txDateStr = t.date_raw || t.created_at || t.dateRaw || t.date;
        if (!txDateStr) return false;
        try {
            let txDate;
            if (typeof txDateStr === 'string' && txDateStr.includes(' ') && !txDateStr.includes('T')) {
                txDate = new Date(txDateStr.replace(' ', 'T'));
            } else {
                txDate = new Date(txDateStr);
            }
            if (isNaN(txDate.getTime())) return false;
            return txDate.toISOString().startsWith(today) || (typeof txDateStr === 'string' && txDateStr.startsWith(today));
        } catch (e) { return false; }
    });

    const totalSales = todaySalesTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalOrders = todaySalesTxns.length;
    const avgBill = totalOrders > 0 ? (totalSales / totalOrders).toFixed(0) : 0;
    const lowStockItems = inventory?.filter(i => (i.quantity || i.amount || 0) <= (i.min_level || i.min || 0)).length || 0;

    const itemCounts = {};
    transactions.filter(t => t.type === 'SALE' && t.status !== 'VOIDED').forEach(t => {
        try {
            const items = typeof t.items === 'string' ? JSON.parse(t.items) : (t.items || []);
            items.forEach(item => {
                if (!itemCounts[item.name]) itemCounts[item.name] = { qty: 0, rev: 0 };
                itemCounts[item.name].qty += item.qty || 1;
                itemCounts[item.name].rev += (item.price || 0) * (item.qty || 1);
            });
        } catch (e) {}
    });

    const colors = ['bg-stone-800', 'bg-orange-500', 'bg-amber-600', 'bg-yellow-500'];
    const topItems = Object.keys(itemCounts)
        .map(name => ({ name, ...itemCounts[name] }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 4)
        .map((item, idx) => ({ ...item, color: colors[idx % colors.length] }));

    const weeklyData = [];
    let maxSales = 1;
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const isoDate = d.toISOString().split('T')[0];
        
        const daySales = transactions.filter(t => {
            if (t.type !== 'SALE' || t.status === 'VOIDED') return false;
            const txDateStr = t.date_raw || t.created_at || t.dateRaw || t.date;
            if (!txDateStr) return false;
            try {
                let txDate;
                if (typeof txDateStr === 'string' && txDateStr.includes(' ') && !txDateStr.includes('T')) {
                    txDate = new Date(txDateStr.replace(' ', 'T'));
                } else {
                    txDate = new Date(txDateStr);
                }
                if (isNaN(txDate.getTime())) return false;
                return txDate.toISOString().startsWith(isoDate) || (typeof txDateStr === 'string' && txDateStr.startsWith(isoDate));
            } catch (e) { return false; }
        }).reduce((sum, t) => sum + (t.amount || 0), 0);

        if (daySales > maxSales) maxSales = daySales;

        const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
        weeklyData.push({
            day: dayNames[d.getDay()],
            sales: daySales,
            pct: 0
        });
    }

    weeklyData.forEach(d => {
        d.pct = Math.max(5, Math.round((d.sales / maxSales) * 100));
    });

    return (
        // 🌟 เอา max-w ออก และใส่ h-full flex flex-col
        <div className="flex flex-col h-full gap-5 w-full relative animate-in fade-in duration-500 font-body">

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-black text-[#861b00] font-headline flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-3xl">query_stats</span> ภาพรวมธุรกิจ (Dashboard)
                    </h2>
                    <p className="text-xs font-bold text-stone-500">ข้อมูลอัปเดตล่าสุด: วันนี้ {new Date().toLocaleTimeString('th-TH')}</p>
                </div>
                <button className="bg-white border text-stone-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-stone-50">
                    <span className="material-symbols-outlined text-[16px]">calendar_month</span> วันนี้
                </button>
            </div>

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

            {/* 🌟 ให้กริดนี้ใช้พื้นที่ที่เหลือ flex-1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 pb-2">
                <div className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col h-full">
                    <h3 className="font-bold text-sm text-stone-700 uppercase tracking-wider mb-6 shrink-0">แนวโน้มยอดขาย (7 วัน)</h3>
                    <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2 border-b border-stone-100 min-h-0">
                        {weeklyData.map((data, idx) => (
                            <div key={idx} className="w-full h-full flex flex-col items-center justify-end gap-2 group cursor-pointer">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                    ฿{data.sales.toLocaleString()}
                                </div>
                                <div className={`w-full max-w-[40px] bg-stone-100 rounded-t-xl relative overflow-hidden group-hover:bg-emerald-100 transition-colors h-full`} style={{ height: `${data.pct}%` }}>
                                    <div className="absolute bottom-0 w-full h-full bg-[#861b00] rounded-t-xl group-hover:bg-emerald-500 transition-colors"></div>
                                </div>
                                <span className="text-xs font-bold text-stone-400 group-hover:text-stone-800">{data.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col h-full">
                    <h3 className="font-bold text-sm text-stone-700 uppercase tracking-wider mb-4 shrink-0">เมนูขายดี (Bestsellers)</h3>
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                        {topItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-6 h-6 shrink-0 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center text-[10px] font-black">
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-xs text-stone-800 truncate">{item.name}</p>
                                    <div className="w-full bg-stone-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${(item.qty / topItems[0].qty) * 100}%` }}></div>
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