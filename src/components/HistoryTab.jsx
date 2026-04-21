import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';

export default function HistoryTab() {
  const { transactions } = useContext(AppContext);
  const [filter, setFilter] = useState('ALL');

  const filteredData = transactions.filter(t => {
    if (filter === 'ALL') return true;
    return t.type === filter;
  });

  const sumSale = transactions.filter(t => t.type === 'SALE').reduce((s, t) => s + t.amount, 0);
  const sumExp = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Math.abs(t.amount), 0);
  const sumTopup = transactions.filter(t => t.type === 'TOPUP').reduce((s, t) => s + t.amount, 0);

  return (
    // 🌟 ปลดล็อค max-w ออก
    <div className="flex flex-col h-full gap-5 w-full relative animate-in fade-in duration-500 font-body">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <h2 className="text-2xl font-black text-[#861b00] font-headline flex items-center gap-2">
          <span className="material-symbols-outlined text-3xl">receipt_long</span> ประวัติการทำรายการ
        </h2>
        <div className="flex bg-white rounded-[1.25rem] p-1.5 shadow-sm border border-stone-200 overflow-x-auto no-scrollbar">
          {['ALL', 'SALE', 'EXPENSE', 'TOPUP'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filter === f ? 'bg-stone-800 text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'
                }`}
            >
              {f === 'ALL' ? 'ทั้งหมด' : f === 'SALE' ? 'ยอดขาย' : f === 'EXPENSE' ? 'รายจ่าย' : 'เติมเงิน'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 shrink-0">
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm relative overflow-hidden text-center">
          <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1">ยอดขายสุทธิ (Sales)</p>
          <h3 className="text-3xl font-black text-emerald-600 font-headline">฿{sumSale.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm relative overflow-hidden text-center">
          <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1">รายจ่าย (Expenses)</p>
          <h3 className="text-3xl font-black text-red-500 font-headline">฿{sumExp.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm relative overflow-hidden text-center">
          <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1">ยอดเติมเงิน (Top-ups)</p>
          <h3 className="text-3xl font-black text-blue-500 font-headline">฿{sumTopup.toLocaleString()}</h3>
        </div>
      </div>

      {/* 🌟 ตารางยืดเต็ม + Sticky */}
      <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 pb-2">
        <div className="overflow-y-auto flex-1 no-scrollbar">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-stone-50 border-b text-[10px] font-bold text-stone-500 uppercase tracking-widest sticky top-0 z-10">
              <tr>
                <th className="p-5 pl-8 w-32">เวลา</th>
                <th className="p-5 w-32">ประเภท</th>
                <th className="p-5">รายละเอียด</th>
                <th className="p-5 text-center w-32">ช่องทาง</th>
                <th className="p-5 text-right pr-8 w-40">จำนวนเงิน (฿)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredData.length === 0 ? (
                <tr><td colSpan="5" className="p-10 text-center text-stone-400 font-bold italic">ไม่พบข้อมูลการทำรายการ</td></tr>
              ) : (
                filteredData.map(t => (
                  <tr key={t.id} className="hover:bg-stone-50/50 transition-colors group">
                    <td className="p-4 pl-8 text-[11px] font-bold text-stone-500">{t.time || t.date}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1.5 text-[9px] tracking-wider font-bold rounded-md border inline-block ${t.type === 'SALE' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          t.type === 'TOPUP' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            'bg-red-50 text-red-600 border-red-100'
                        }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-bold text-stone-800">{t.desc || (t.items ? `${t.items.length} รายการ` : '-')}</td>
                    <td className="p-4 text-center">
                      <span className="bg-stone-100 border text-stone-600 px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider">{t.method || t.paymentMethod}</span>
                    </td>
                    <td className={`p-4 pr-8 text-right font-black text-lg ${t.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {t.amount >= 0 ? '+' : ''}฿{Math.abs(t.amount).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}