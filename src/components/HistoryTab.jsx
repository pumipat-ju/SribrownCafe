import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';

export default function HistoryTab() {
  // ดึงข้อมูลรายการธุรกรรมมาจาก Context ส่วนกลาง
  const { transactions } = useContext(AppContext);
  
  // State สำหรับเก็บค่าตัวกรอง (Filter) เหมือนใน admin.html
  const [filter, setFilter] = useState('ALL'); 

  // ฟังก์ชันกรองข้อมูลตามประเภทที่เลือก (SALE, EXPENSE, TOPUP)
  const filteredData = transactions.filter(t => {
    if (filter === 'ALL') return true;
    return t.type === filter;
  });

  // คำนวณยอดรวม Dashboard (คำนวณจากทุกรายการในระบบ)
  const sumSale = transactions.filter(t => t.type === 'SALE').reduce((s, t) => s + t.amount, 0);
  const sumExp = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Math.abs(t.amount), 0);
  const sumTopup = transactions.filter(t => t.type === 'TOPUP').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 w-full">
      {/* ส่วนที่ 1: หัวข้อและปุ่มตัวกรอง */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-black text-[#861b00] font-headline flex items-center gap-2">
          <span className="material-symbols-outlined text-3xl">receipt_long</span> ประวัติการทำรายการ
        </h2>
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-stone-200 overflow-x-auto no-scrollbar">
          {['ALL', 'SALE', 'EXPENSE', 'TOPUP'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                filter === f ? 'bg-stone-800 text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'
              }`}
            >
              {f === 'ALL' ? 'ทั้งหมด' : f === 'SALE' ? 'ยอดขาย' : f === 'EXPENSE' ? 'รายจ่าย' : 'เติมเงิน'}
            </button>
          ))}
        </div>
      </div>

      {/* ส่วนที่ 2: การ์ด Dashboard สรุปยอดเงิน */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-[2rem] border shadow-sm relative overflow-hidden text-center">
          <p className="text-[10px] text-stone-500 font-bold uppercase mb-1">ยอดขายสุทธิ (Sales)</p>
          <h3 className="text-2xl font-black text-emerald-600">฿{sumSale.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border shadow-sm relative overflow-hidden text-center">
          <p className="text-[10px] text-stone-500 font-bold uppercase mb-1">รายจ่าย (Expenses)</p>
          <h3 className="text-2xl font-black text-red-500">฿{sumExp.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border shadow-sm relative overflow-hidden text-center">
          <p className="text-[10px] text-stone-500 font-bold uppercase mb-1">ยอดเติมเงิน (Top-ups)</p>
          <h3 className="text-2xl font-black text-blue-500">฿{sumTopup.toLocaleString()}</h3>
        </div>
      </div>

      {/* ส่วนที่ 3: ตารางรายการ (Table) */}
      <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-stone-50 border-b text-[10px] font-bold text-stone-500 uppercase tracking-widest">
              <tr>
                <th className="p-4 pl-6">เวลา</th>
                <th className="p-4">ประเภท</th>
                <th className="p-4">รายละเอียด</th>
                <th className="p-4 text-center">ช่องทาง</th>
                <th className="p-4 text-right pr-6">จำนวนเงิน (฿)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredData.length === 0 ? (
                <tr><td colSpan="5" className="p-10 text-center text-stone-400 font-bold italic">ไม่พบข้อมูลการทำรายการ</td></tr>
              ) : (
                filteredData.map(t => (
                  <tr key={t.id} className="hover:bg-stone-50 transition-colors">
                    <td className="p-4 pl-6 text-[10px] font-bold text-stone-600">{t.time}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-[9px] font-bold rounded-lg border ${
                        t.type === 'SALE' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        t.type === 'TOPUP' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-bold text-stone-700">{t.desc}</td>
                    <td className="p-4 text-center">
                      <span className="bg-stone-100 text-stone-500 px-2 py-0.5 rounded text-[9px] font-bold uppercase">{t.method}</span>
                    </td>
                    <td className={`p-4 pr-6 text-right font-black ${t.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
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