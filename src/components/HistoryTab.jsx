import React, { useContext, useState, useMemo, useRef, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import ReceiptPrintout from '../components/ReceiptPrintout';
import { fetchJSON } from '../api';

export default function HistoryTab() {
  const { transactions, setTransactions } = useContext(AppContext);

  // --- States สำหรับตัวกรองเดิม ---
  const [filter, setFilter] = useState('ALL');
  const [dateFilterType, setDateFilterType] = useState('DAY');
  const [baseDate, setBaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 🌟 1. State สำหรับฟีเจอร์ใหม่: ค้นหา และ แบ่งหน้า
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // แสดงหน้าละ 10 รายการ

  // 🌟 2. State สำหรับ Receipt Modal (ดูสลิปละเอียด)
  const [viewingTxn, setViewingTxn] = useState(null);

  // 🌟 3. State สำหรับสั่งพิมพ์ใบเสร็จแบบ Shared Component
  const [selectedPrintTxn, setSelectedPrintTxn] = useState(null);

  // 🌟 4. State สำหรับระบบ Void Bill
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidPin, setVoidPin] = useState('');
  const [voidError, setVoidError] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // ปิด Dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    const handleClickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsDropdownOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ==========================================
  // 🛠️ Helper Functions & Logic
  // ==========================================
  const getISOWeek = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  };

  const adjustDate = (direction) => {
    const newDate = new Date(baseDate);
    if (dateFilterType === 'DAY') newDate.setDate(newDate.getDate() + direction);
    if (dateFilterType === 'WEEK') newDate.setDate(newDate.getDate() + (direction * 7));
    if (dateFilterType === 'MONTH') newDate.setMonth(newDate.getMonth() + direction);
    if (dateFilterType === 'YEAR') newDate.setFullYear(newDate.getFullYear() + direction);
    setBaseDate(newDate.toISOString().split('T')[0]);
    setCurrentPage(1); // รีเซ็ตหน้าเมื่อเปลี่ยนวัน
  };

  const getDisplayDateText = () => {
    const d = new Date(baseDate);
    if (dateFilterType === 'DAY') return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    if (dateFilterType === 'WEEK') return `สัปดาห์ที่ ${getISOWeek(d).split('W')[1]} (${d.getFullYear() + 543})`;
    if (dateFilterType === 'MONTH') return d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    if (dateFilterType === 'YEAR') return `ปี ${d.getFullYear() + 543}`;
  };

  // 🌟 ฟังก์ชัน Export เป็น CSV (Excel)
  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Description', 'Method', 'Cashier', 'Amount'];
    const rows = finalFilteredData.map(t => [
      t.date + ' ' + t.time,
      t.type,
      t.desc?.replace(/,/g, ' '),
      t.method || t.paymentMethod,
      t.cashier,
      t.amount || t.total
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SriBrown_Report_${baseDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 🌟 ฟังก์ชัน พิมพ์ใบเสร็จซ้ำ (Re-print)
  const handleRePrint = (txn) => {
    setSelectedPrintTxn(txn);
    setTimeout(() => {
      window.print();
      setSelectedPrintTxn(null);
    }, 300);
  };

  // 🌟 ฟังก์ชันยกเลิกบิล (Void Bill)
  const handleVoidSubmit = async (e) => {
    e.preventDefault();
    setVoidError('');
    setIsVoiding(true);
    
    try {
      console.log('Voiding transaction:', viewingTxn.id, 'with PIN:', voidPin, 'Reason:', voidReason);
      const updatedTxn = await fetchJSON(`/transactions/${viewingTxn.id}/void/`, {
        method: 'PUT',
        body: JSON.stringify({ pin: voidPin, reason: voidReason })
      });
      console.log('Void success:', updatedTxn);
      
      // อัปเดตข้อมูลในระบบทันที
      setTransactions(prev => prev.map(t => t.id === updatedTxn.id ? { ...t, status: 'VOIDED', void_reason: updatedTxn.void_reason } : t));
      
      // ปิด modal ต่างๆ
      setShowVoidModal(false);
      setVoidPin('');
      setVoidReason('');
      setViewingTxn({ ...viewingTxn, status: 'VOIDED', void_reason: updatedTxn.void_reason });
    } catch (err) {
      setVoidError(err.message || 'รหัส PIN ไม่ถูกต้อง หรือไม่มีสิทธิ์ทำรายการ');
    } finally {
      setIsVoiding(false);
    }
  };

  // ==========================================
  // 🔍 ขบวนการกรองข้อมูล (Multi-stage Filtering)
  // ==========================================
  const finalFilteredData = useMemo(() => {
    const targetWeek = getISOWeek(new Date(baseDate));
    const targetMonth = baseDate.slice(0, 7);
    const targetYear = baseDate.slice(0, 4);

    return transactions.filter(t => {
      const txDateStr = t.date_raw || t.created_at || t.dateRaw || t.date;
      if (!txDateStr) return false;

      let dateMatch = false;
      try {
        let txDate;
        if (typeof txDateStr === 'string' && txDateStr.includes(' ') && !txDateStr.includes('T')) {
          txDate = new Date(txDateStr.replace(' ', 'T'));
        } else {
          txDate = new Date(txDateStr);
        }

        if (isNaN(txDate.getTime())) {
          throw new Error("Invalid date");
        }

        const txDateIsoStr = txDate.toISOString().split('T')[0];

        if (dateFilterType === 'DAY') dateMatch = txDateIsoStr.startsWith(baseDate) || txDateStr.startsWith(baseDate);
        else if (dateFilterType === 'WEEK') dateMatch = getISOWeek(txDate) === targetWeek;
        else if (dateFilterType === 'MONTH') dateMatch = txDateIsoStr.startsWith(targetMonth) || txDateStr.startsWith(targetMonth);
        else if (dateFilterType === 'YEAR') dateMatch = txDateIsoStr.startsWith(targetYear) || txDateStr.startsWith(targetYear);
      } catch (e) {
        if (dateFilterType === 'DAY') dateMatch = txDateStr.includes(baseDate);
      }

      if (!dateMatch) return false;
      if (filter !== 'ALL' && t.type !== filter) return false;

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const idStr = String(t.bill_id || t.id || '').toLowerCase();
        const descStr = String(t.desc || '').toLowerCase();
        const cashierStr = String(t.cashier || '').toLowerCase();

        let itemsStr = '';
        if (typeof t.items === 'string') {
          itemsStr = t.items.toLowerCase();
        } else if (Array.isArray(t.items)) {
          itemsStr = JSON.stringify(t.items).toLowerCase();
        }

        return idStr.includes(query) ||
          descStr.includes(query) ||
          cashierStr.includes(query) ||
          itemsStr.includes(query);
      }

      return true;
    });
  }, [transactions, dateFilterType, baseDate, filter, searchTerm]);

  const sumSale = finalFilteredData.filter(t => (t.type === 'SALE' || !t.type) && t.status !== 'VOIDED').reduce((s, t) => s + parseFloat(t.amount || t.total || 0), 0);
  const sumExp = finalFilteredData.filter(t => t.type === 'EXPENSE' && t.status !== 'VOIDED').reduce((s, t) => s + Math.abs(parseFloat(t.amount || t.total || 0)), 0);
  const sumTopup = finalFilteredData.filter(t => t.type === 'TOPUP' && t.status !== 'VOIDED').reduce((s, t) => s + parseFloat(t.amount || t.total || 0), 0);

  const totalPages = Math.ceil(finalFilteredData.length / itemsPerPage);
  const pagedData = finalFilteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filterOptions = [
    { id: 'DAY', label: 'รายวัน', icon: 'calendar_today' },
    { id: 'WEEK', label: 'สัปดาห์', icon: 'view_week' },
    { id: 'MONTH', label: 'รายเดือน', icon: 'calendar_month' },
    { id: 'YEAR', label: 'รายปี', icon: 'event' }
  ];
  const currentFilterOption = filterOptions.find(o => o.id === dateFilterType);

  return (
    <div className="flex flex-col h-full gap-5 w-full relative animate-in fade-in duration-500 font-body">

      {/* 🌟 Row 1: Header & Date Navigator */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <h2 className="text-2xl font-black text-[#861b00] font-headline flex items-center gap-2 whitespace-nowrap">
            <span className="material-symbols-outlined text-3xl">receipt_long</span> ประวัติรายการ
          </h2>

          <div className="flex items-center gap-3 relative" ref={dropdownRef}>
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-full text-xs font-black text-stone-700 shadow-sm hover:border-[#861b00]/50 transition-all">
              <span className="material-symbols-outlined text-[16px] text-[#861b00]">{currentFilterOption.icon}</span>
              {currentFilterOption.label}
              <span className="material-symbols-outlined text-[16px] text-stone-400 ml-1">{isDropdownOpen ? 'expand_less' : 'expand_more'}</span>
            </button>
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-40 bg-white border border-stone-100 rounded-2xl shadow-xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2">
                {filterOptions.map(option => (
                  <button key={option.id} onClick={() => { setDateFilterType(option.id); setIsDropdownOpen(false); setBaseDate(new Date().toISOString().split('T')[0]); setCurrentPage(1); }} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold transition-colors ${dateFilterType === option.id ? 'bg-[#861b00]/5 text-[#861b00]' : 'text-stone-600 hover:bg-stone-50'}`}>
                    <span className="material-symbols-outlined text-[18px]">{option.icon}</span>{option.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center bg-white border border-stone-200 rounded-full shadow-sm p-1">
              <button onClick={() => adjustDate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-500 transition-colors active:scale-95"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
              <div className="relative min-w-[120px] text-center flex items-center justify-center group px-2 cursor-pointer">
                <span className="text-xs font-black text-[#861b00]">{getDisplayDateText()}</span>
                <input type={dateFilterType === 'DAY' ? 'date' : dateFilterType === 'MONTH' ? 'month' : 'date'} value={dateFilterType === 'MONTH' ? baseDate.slice(0, 7) : baseDate} onChange={(e) => { if (e.target.value) { setBaseDate(dateFilterType === 'MONTH' ? `${e.target.value}-01` : e.target.value); setCurrentPage(1); } }} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </div>
              <button onClick={() => adjustDate(1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-500 transition-colors active:scale-95"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-[300px]">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#861b00]/50 text-[20px]">search</span>
            <input type="text" placeholder="ค้นหา: เลขบิล, รายการ, ลูกค้า, พนักงาน" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full pl-12 pr-4 py-3 bg-white border-2 border-[#861b00]/20 rounded-full text-xs font-bold outline-none focus:border-[#861b00] focus:ring-4 focus:ring-[#861b00]/10 transition-all shadow-sm text-stone-700 placeholder:text-stone-300" />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-600 flex items-center bg-stone-100 rounded-full p-0.5">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>
          <div className="flex bg-white rounded-full p-1.5 shadow-sm border border-stone-200 overflow-x-auto no-scrollbar max-w-full">
            {['ALL', 'SALE', 'EXPENSE', 'TOPUP'].map(f => (
              <button key={f} onClick={() => { setFilter(f); setCurrentPage(1); }} className={`px-4 py-2 rounded-full text-[10px] font-black transition-all whitespace-nowrap active:scale-95 ${filter === f ? 'bg-stone-800 text-white shadow-md' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'}`}>
                {f === 'ALL' ? 'ทั้งหมด' : f === 'SALE' ? 'ยอดขาย' : f === 'EXPENSE' ? 'รายจ่าย' : 'เติมเงิน'}
              </button>
            ))}
          </div>
          <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[10px] font-black hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-95 whitespace-nowrap hidden sm:flex">
            <span className="material-symbols-outlined text-[16px]">download</span>Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
        <div className="bg-white p-5 rounded-[2rem] border border-stone-100 shadow-sm text-center group hover:-translate-y-1 hover:shadow-lg transition-all">
          <div className="w-10 h-10 mx-auto bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-2"><span className="material-symbols-outlined text-[20px]">payments</span></div>
          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">ยอดขายสุทธิ</p>
          <h3 className="text-2xl font-black text-emerald-600 font-headline">฿{sumSale.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-stone-100 shadow-sm text-center group hover:-translate-y-1 hover:shadow-lg transition-all">
          <div className="w-10 h-10 mx-auto bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2"><span className="material-symbols-outlined text-[20px]">money_off</span></div>
          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">รายจ่าย</p>
          <h3 className="text-2xl font-black text-red-500 font-headline">฿{sumExp.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-stone-100 shadow-sm text-center group hover:-translate-y-1 hover:shadow-lg transition-all">
          <div className="w-10 h-10 mx-auto bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-2"><span className="material-symbols-outlined text-[20px]">account_balance_wallet</span></div>
          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">ยอดเติมเงิน</p>
          <h3 className="text-2xl font-black text-blue-500 font-headline">฿{sumTopup.toLocaleString()}</h3>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-stone-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 pb-2">
        <div className="overflow-y-auto flex-1 no-scrollbar">
          <table className="w-full text-left text-sm min-w-[850px]">
            <thead className="bg-white border-b border-stone-100 text-[10px] font-black text-stone-400 uppercase tracking-widest sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-5 pl-8 w-28">เวลา</th>
                <th className="p-5 w-40 text-[#861b00]">เลขที่บิล</th>
                <th className="p-5 w-32">ประเภท</th>
                <th className="p-5">รายละเอียด</th>
                <th className="p-5 text-center w-28">พนักงาน</th>
                <th className="p-5 text-right pr-8 w-36">จำนวนเงิน (฿)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {pagedData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-stone-300">
                      <span className="material-symbols-outlined text-5xl mb-3 opacity-50">search_off</span>
                      <p className="font-bold text-sm text-stone-400">ไม่พบข้อมูลที่ค้นหา</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedData.map(t => (
                  <tr key={t.id} onClick={() => setViewingTxn(t)} className="hover:bg-stone-50/80 transition-colors group cursor-pointer">
                    <td className="p-4 pl-8 text-[11px] font-bold text-stone-500 whitespace-nowrap">
                      {(() => {
                        const rawStr = t.date_raw || t.created_at;
                        if (!rawStr) return t.time || '--:--';
                        try {
                          let safeTxDate;
                          if (typeof rawStr === 'string' && rawStr.includes(' ') && !rawStr.includes('T')) {
                            safeTxDate = new Date(rawStr.replace(' ', 'T'));
                          } else {
                            safeTxDate = new Date(rawStr);
                          }
                          if (isNaN(safeTxDate.getTime())) return t.time || '--:--';
                          return safeTxDate.toLocaleString('th-TH', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                          }).replace(/ /g, ' ').replace(',', ' -') + ' น.';
                        } catch (e) {
                          return t.time || '--:--';
                        }
                      })()}
                    </td>
                    <td className="p-4">
                      <span className="text-[12px] font-black text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg group-hover:bg-[#861b00]/10 group-hover:text-[#861b00] transition-colors">
                        {t.bill_id || t.id}
                      </span>
                    </td>
                    <td className="p-4">
                      {t.status === 'VOIDED' ? (
                        <span className="px-4 py-1.5 text-[9px] tracking-widest font-black rounded-full inline-block bg-red-100 text-red-600 line-through">
                          VOIDED
                        </span>
                      ) : (
                        <span className={`px-4 py-1.5 text-[9px] tracking-widest font-black rounded-full inline-block ${t.type === 'SALE' || t.type === 'SHIFT_CLOSE' ? 'bg-emerald-50 text-emerald-600' :
                          t.type === 'TOPUP' ? 'bg-blue-50 text-blue-600' :
                            t.type === 'EXPENSE' ? 'bg-red-50 text-red-600' :
                              'bg-stone-100'
                          }`}>
                          {t.type === 'SHIFT_CLOSE' ? 'Z-REPORT' : (t.type || 'SALE')}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <p className={`text-[13px] font-bold truncate max-w-[300px] transition-colors ${t.status === 'VOIDED' ? 'text-stone-400 line-through' : 'text-stone-600 group-hover:text-stone-900'}`}>
                        {t.desc || (t.items ? `${t.items.length} รายการ` : '-')}
                      </p>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-[10px] font-black uppercase tracking-tighter ${t.status === 'VOIDED' ? 'text-stone-300' : 'text-stone-400'}`}>
                        {t.cashier || '-'}
                      </span>
                    </td>
                    <td className={`p-4 pr-8 text-right font-black text-[16px] ${t.status === 'VOIDED' ? 'text-stone-300 line-through' : t.type === 'EXPENSE' ? 'text-red-500' : parseFloat(t.amount || t.total) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {t.type === 'EXPENSE' ? '-' : (parseFloat(t.amount || t.total) >= 0 ? '+' : '')}฿{Math.abs(parseFloat(t.amount || t.total || 0)).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-stone-100 flex justify-between items-center bg-stone-50/50">
            <span className="text-[10px] font-bold text-stone-400">หน้า {currentPage} จาก {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${currentPage === 1 ? 'text-stone-300' : 'bg-white shadow-sm text-stone-600 hover:bg-[#861b00] hover:text-white'}`}>
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded-lg text-[11px] font-black transition-all ${currentPage === i + 1 ? 'bg-[#861b00] text-white shadow-md' : 'bg-white shadow-sm text-stone-500 hover:bg-stone-100'}`}>
                  {i + 1}
                </button>
              ))}
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${currentPage === totalPages ? 'text-stone-300' : 'bg-white shadow-sm text-stone-600 hover:bg-[#861b00] hover:text-white'}`}>
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {viewingTxn && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setViewingTxn(null)} />
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full relative z-10 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden print:hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#861b00] to-red-600" />

            <div className="text-center mb-6">
              <h4 className="font-black text-lg text-stone-800 uppercase tracking-widest">Sri Brown Coffee</h4>
              <p className="text-[10px] text-stone-400 font-bold uppercase">Transaction Receipt</p>
            </div>

            <div className="space-y-3 mb-8 text-[11px] font-bold text-stone-500 border-b border-dashed border-stone-200 pb-4">
              <div className="flex justify-between"><span>เลขที่บิล:</span><span className="text-stone-800">{viewingTxn.bill_id || viewingTxn.id}</span></div>
              <div className="flex justify-between"><span>วันที่:</span><span className="text-stone-800">{viewingTxn.date} | {viewingTxn.time}</span></div>
              <div className="flex justify-between"><span>พนักงาน:</span><span className="text-stone-800">{viewingTxn.cashier}</span></div>
              <div className="flex justify-between"><span>ช่องทาง:</span><span className="text-stone-800">{viewingTxn.method || viewingTxn.paymentMethod}</span></div>
            </div>

            <div className="space-y-4 mb-8 max-h-[300px] overflow-y-auto no-scrollbar">
              {(() => {
                // 🌟 1. ตรวจสอบก่อนว่าเป็นบิลประเภท ปิดกะ หรือไม่
                if (viewingTxn.type === 'SHIFT_CLOSE' || viewingTxn.type === 'Z_REPORT') {
                  let zData = null;
                  try {
                    const items = typeof viewingTxn.items === 'string' ? JSON.parse(viewingTxn.items) : viewingTxn.items;
                    zData = Array.isArray(items) ? items[0] : items;
                  } catch (e) { }

                  if (!zData) return <p className="text-center text-stone-400 py-4 font-bold">ไม่พบรายละเอียดการปิดกะ</p>;

                  return (
                    <div className="space-y-3 bg-stone-50 p-5 rounded-3xl border border-stone-100 shadow-inner text-[11px]">
                      <div className="flex justify-between font-bold">
                        <span className="text-stone-400 uppercase tracking-widest text-[9px]">ยอดขาย (เงินสด)</span>
                        <span className="text-stone-800 font-black">฿{parseFloat(zData.salesCash || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span className="text-stone-400 uppercase tracking-widest text-[9px]">ยอดขาย (โอน/QR)</span>
                        <span className="text-stone-800 font-black">฿{parseFloat(zData.salesOther || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span className="text-stone-400 uppercase tracking-widest text-[9px]">เติม E-Wallet (สด)</span>
                        <span className="text-stone-800 font-black">฿{parseFloat(zData.topupCash || 0).toLocaleString()}</span>
                      </div>
                      <div className="border-t border-dashed border-stone-300 my-2"></div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-[#861b00] font-black uppercase text-[10px]">เงินสดที่ควรมี</span>
                        <span className="text-[#861b00] font-black text-sm">฿{parseFloat(zData.expectedCash || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-stone-700 font-black uppercase text-[10px]">เงินสดที่นับจริง</span>
                        <span className="text-stone-700 font-black text-sm">฿{parseFloat(zData.actualCash || 0).toLocaleString()}</span>
                      </div>
                      <div className={`flex justify-between items-center p-3 rounded-2xl mt-2 font-black ${parseFloat(zData.difference || 0) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        <span className="text-[10px] uppercase">ส่วนต่างเงินสด</span>
                        <span className="text-sm">{parseFloat(zData.difference || 0) >= 0 ? '+' : ''}{parseFloat(zData.difference || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                }

                let displayItems = [];
                if (typeof viewingTxn.items === 'string') {
                  try { displayItems = JSON.parse(viewingTxn.items); } catch (e) { }
                } else if (Array.isArray(viewingTxn.items)) {
                  displayItems = viewingTxn.items;
                }

                if (displayItems.length > 0) {
                  return displayItems.map((item, i) => (
                    <div key={i} className="flex justify-between items-start">
                      <div className="flex-1 pr-4">
                        <p className="text-[12px] font-black text-stone-800">{item.name_th || item.name_en || item.name}</p>
                        <p className="text-[10px] text-stone-400">{item.qty} x ฿{item.price.toLocaleString()}</p>
                      </div>
                      <span className="text-[12px] font-black text-stone-800">฿{(item.qty * item.price).toLocaleString()}</span>
                    </div>
                  ));
                } else {
                  return <p className="text-[12px] font-black text-stone-800 text-center py-4">{viewingTxn.desc}</p>;
                }
              })()}
            </div>

            <div className="bg-stone-50 p-4 rounded-2xl mb-6">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-stone-400 uppercase">ยอดรวมสุทธิ</span>
                <span className="text-2xl font-black text-[#861b00]">฿{Math.abs(parseFloat(viewingTxn.amount || viewingTxn.total)).toLocaleString()}</span>
              </div>
            </div>

            {viewingTxn.status === 'VOIDED' && viewingTxn.void_reason && (
              <div className="bg-red-50 p-4 rounded-2xl mb-6 border border-red-100">
                <p className="text-[10px] font-black text-red-400 uppercase mb-1">เหตุผลการยกเลิก</p>
                <p className="text-xs font-bold text-red-600">{viewingTxn.void_reason}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setViewingTxn(null)} className="flex-1 py-4 bg-stone-100 font-bold text-stone-500 rounded-2xl hover:bg-stone-200 transition-all">ปิด</button>
              {viewingTxn.status !== 'VOIDED' && viewingTxn.type !== 'SHIFT_CLOSE' && viewingTxn.type !== 'Z_REPORT' && (
                <button onClick={() => setShowVoidModal(true)} className="flex-1 py-4 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-all border border-red-200">ยกเลิกบิล</button>
              )}
              <button onClick={() => handleRePrint(viewingTxn)} className="flex-[2] py-4 bg-[#861b00] text-white font-black rounded-2xl shadow-lg shadow-[#861b00]/20 hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[20px]">print</span> พิมพ์ใบเสร็จ
              </button>
            </div>

            {showVoidModal && (
              <div className="absolute inset-0 z-20 bg-white/90 backdrop-blur-sm rounded-[2.5rem] flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
                <form onSubmit={handleVoidSubmit} className="bg-white p-6 rounded-3xl shadow-xl border border-red-100 w-full text-center max-h-full overflow-y-auto">
                  <span className="material-symbols-outlined text-4xl text-red-500 mb-2">warning</span>
                  <h4 className="font-black text-lg text-stone-800 mb-1">ยืนยันการยกเลิกบิล</h4>
                  <p className="text-xs text-stone-500 font-bold mb-4">โปรดระบุหมายเหตุและใส่ PIN เพื่อยืนยัน</p>
                  
                  <div className="text-left mb-4">
                    <label className="text-[10px] font-black text-stone-400 uppercase ml-2 mb-1 block">เหตุผลที่ยกเลิก</label>
                    <select 
                      onChange={(e) => {
                        if (e.target.value === 'อื่นๆ') {
                          setVoidReason('');
                        } else {
                          setVoidReason(e.target.value);
                        }
                      }}
                      className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500 mb-2"
                    >
                      <option value="">-- เลือกเหตุผล --</option>
                      <option value="ลูกค้าเปลี่ยนใจ">ลูกค้าเปลี่ยนใจ</option>
                      <option value="พนักงานคีย์ผิด">พนักงานคีย์ผิด / รายการผิด</option>
                      <option value="บิลซ้ำ">บิลซ้ำ</option>
                      <option value="เปลี่ยนวิธีการชำระเงิน">เปลี่ยนวิธีการชำระเงิน</option>
                      <option value="อื่นๆ">อื่นๆ (ระบุเอง)</option>
                    </select>

                    {(voidReason === '' || !['ลูกค้าเปลี่ยนใจ', 'พนักงานคีย์ผิด', 'บิลซ้ำ', 'เปลี่ยนวิธีการชำระเงิน'].includes(voidReason)) && (
                      <textarea 
                        value={voidReason} 
                        onChange={e => setVoidReason(e.target.value)} 
                        placeholder="ระบุเหตุผลอื่นๆ..." 
                        required
                        className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none h-24" 
                      />
                    )}
                  </div>

                  <input type="password" value={voidPin} onChange={e => setVoidPin(e.target.value)} placeholder="PIN ผู้จัดการ" required
                    className="w-full text-center text-2xl tracking-[0.5em] font-black py-3 bg-stone-100 rounded-xl mb-2 focus:outline-none focus:ring-2 focus:ring-red-500" />
                  
                  {voidError && <p className="text-[10px] text-red-500 font-bold mb-4">{voidError}</p>}
                  
                  <div className="flex gap-2 mt-4">
                    <button type="button" onClick={() => { setShowVoidModal(false); setVoidPin(''); setVoidReason(''); setVoidError(''); }} className="flex-1 py-3 bg-stone-100 text-stone-500 font-bold rounded-xl hover:bg-stone-200">กลับ</button>
                    <button type="submit" disabled={isVoiding || !voidPin || !voidReason} className="flex-1 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 disabled:opacity-50">
                      {isVoiding ? 'กำลังยกเลิก...' : 'ยืนยัน'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedPrintTxn && <ReceiptPrintout txn={selectedPrintTxn} />}

    </div>
  );
}