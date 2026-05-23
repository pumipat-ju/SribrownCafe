import React, { useState, useEffect } from 'react';
import { getPrinters, setPrinter } from '../api.js';

export default function SettingsTab() {
    const [printerList, setPrinterList] = useState([]);
    const [currentPrinter, setCurrentPrinter] = useState('');
    const [printerLoading, setPrinterLoading] = useState(false);
    const [printerMsg, setPrinterMsg] = useState({ text: '', type: '' });

    useEffect(() => {
        loadPrinters();
    }, []);

    const loadPrinters = async () => {
        setPrinterLoading(true);
        try {
            const data = await getPrinters();
            setPrinterList(data.printers || []);
            setCurrentPrinter(data.current || '');
        } catch (e) {
            console.error('Failed to load printers:', e);
            setPrinterMsg({ text: 'ไม่สามารถเชื่อมต่อ Hardware Agent ได้', type: 'error' });
        } finally {
            setPrinterLoading(false);
        }
    };

    const handleSetPrinter = async (name) => {
        if (name === currentPrinter) return;
        setPrinterLoading(true);
        setPrinterMsg({ text: '', type: '' });
        try {
            await setPrinter(name);
            setCurrentPrinter(name);
            setPrinterMsg({ text: `เปลี่ยนเครื่องพิมพ์เป็น "${name}" สำเร็จ`, type: 'success' });
            setTimeout(() => setPrinterMsg({ text: '', type: '' }), 3000);
        } catch (e) {
            setPrinterMsg({ text: e.message || 'เปลี่ยนเครื่องพิมพ์ไม่สำเร็จ', type: 'error' });
        } finally {
            setPrinterLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full gap-5 w-full relative animate-in fade-in duration-500 font-body">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-black text-[#861b00] font-headline flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-3xl">settings</span> ตั้งค่าระบบ (Settings)
                    </h2>
                    <p className="text-xs font-bold text-stone-500">
                        ตั้งค่าอุปกรณ์และฮาร์ดแวร์ที่เกี่ยวข้องกับระบบ POS
                    </p>
                </div>
            </div>

            {/* 🖨️ Printer Settings */}
            <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <h3 className="font-bold text-sm text-stone-700 uppercase tracking-wider flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">print</span> เครื่องพิมพ์ใบเสร็จ (Printer)
                    </h3>
                    <button
                        onClick={loadPrinters}
                        disabled={printerLoading}
                        className="bg-stone-100 text-stone-500 px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 hover:bg-stone-200 transition-colors disabled:opacity-50"
                    >
                        <span className={`material-symbols-outlined text-[14px] ${printerLoading ? 'animate-spin' : ''}`}>refresh</span> รีเฟรช
                    </button>
                </div>

                {printerMsg.text && (
                    <div className={`mb-4 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                        printerMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-500 border border-red-100'
                    }`}>
                        <span className="material-symbols-outlined text-[16px]">{printerMsg.type === 'success' ? 'check_circle' : 'error'}</span>
                        {printerMsg.text}
                    </div>
                )}

                {printerLoading && printerList.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-stone-300 font-bold text-sm">
                        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span> กำลังค้นหาเครื่องพิมพ์...
                    </div>
                ) : printerList.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-stone-300 font-bold text-sm">
                        ไม่พบเครื่องพิมพ์ในระบบ · กรุณาตรวจสอบ Hardware Agent
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {printerList.map((name) => (
                            <button
                                key={name}
                                onClick={() => handleSetPrinter(name)}
                                disabled={printerLoading}
                                className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.98] disabled:opacity-50 ${
                                    name === currentPrinter
                                        ? 'border-[#861b00] bg-[#861b00]/5 shadow-sm'
                                        : 'border-stone-100 bg-stone-50 hover:border-stone-300 hover:bg-white'
                                }`}
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    name === currentPrinter ? 'bg-[#861b00] text-white' : 'bg-stone-200 text-stone-400'
                                }`}>
                                    <span className="material-symbols-outlined text-[18px]">print</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-black truncate ${
                                        name === currentPrinter ? 'text-[#861b00]' : 'text-stone-600'
                                    }`}>{name}</p>
                                    {name === currentPrinter && (
                                        <p className="text-[9px] font-bold text-[#861b00]/60 uppercase tracking-widest mt-0.5">กำลังใช้งาน</p>
                                    )}
                                </div>
                                {name === currentPrinter && (
                                    <span className="material-symbols-outlined text-[#861b00] text-[18px] shrink-0">check_circle</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
