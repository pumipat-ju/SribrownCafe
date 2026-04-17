import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';

export default function MarketingTab() {
    const { marketing, setMarketing, categories } = useContext(AppContext);

    // 🌟 1. State สำหรับ Sub-Tab
    const [activeSubTab, setActiveSubTab] = useState('tiers');

    // --- State สำหรับ Modals ---
    const [tierModal, setTierModal] = useState({ isOpen: false, data: null });
    const [promoModal, setPromoModal] = useState({ isOpen: false, data: null });
    const [couponModal, setCouponModal] = useState({ isOpen: false, data: null });

    const [promoDiscountType, setPromoDiscountType] = useState('pct');
    const [couponDiscountType, setCouponDiscountType] = useState('amt');

    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, type: '', id: '', title: '' });
    const [showSuccess, setShowSuccess] = useState(false);

    const fMoney = (n) => parseFloat(n || 0).toLocaleString('en-US');

    // ================== CORE FUNCTIONS (Logic เดิมที่เพื่อนต้องการคงไว้) ================== //

    const handleGlobalSave = () => {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    const saveTier = (e) => {
        e.preventDefault();
        const form = e.target;
        const newData = {
            id: tierModal.data?.id || `t_${Date.now()}`,
            name: form.name.value,
            minSpent: parseInt(form.minSpent.value),
            maxSpent: form.maxSpent.value ? parseInt(form.maxSpent.value) : null,
            discountPct: parseInt(form.discountPct.value)
        };
        if (tierModal.data) {
            setMarketing({ ...marketing, tiers: marketing.tiers.map(t => t.id === newData.id ? newData : t) });
        } else {
            setMarketing({ ...marketing, tiers: [...marketing.tiers, newData] });
        }
        setTierModal({ isOpen: false, data: null });
    };

    const savePromo = (e) => {
        e.preventDefault();
        const form = e.target;
        const newData = {
            id: promoModal.data?.id || `p_${Date.now()}`,
            name: form.name.value,
            targetCat: form.targetCat?.value || 'all',
            minQty: parseInt(form.minQty.value),
            discountValue: parseInt(form.discountValue.value),
            discountType: promoDiscountType,
            active: promoModal.data?.active ?? true,
            eligibleFor: form.eligibleFor.value,
            startDate: form.startDate?.value || '',
            endDate: form.endDate?.value || '',
            startTime: form.startTime?.value || '',
            endTime: form.endTime?.value || ''
        };
        if (promoModal.data) {
            setMarketing({ ...marketing, promotions: marketing.promotions.map(p => p.id === newData.id ? newData : p) });
        } else {
            setMarketing({ ...marketing, promotions: [...marketing.promotions, newData] });
        }
        setPromoModal({ isOpen: false, data: null });
    };

    const saveCoupon = (e) => {
        e.preventDefault();
        const form = e.target;
        const newData = {
            id: couponModal.data?.id || `c_${Date.now()}`,
            name: form.name.value,
            type: couponDiscountType === 'pct' ? 'percent_discount' : 'fixed_discount',
            value: parseInt(form.value.value),
            eligibleFor: form.eligibleFor.value,
            icon: form.type?.value === 'free_drink' ? 'local_cafe' : 'sell'
        };
        if (form.type?.value === 'free_drink') { newData.type = 'free_drink'; newData.value = 0; }
        if (couponModal.data) {
            setMarketing({ ...marketing, coupons: marketing.coupons.map(c => c.id === newData.id ? newData : c) });
        } else {
            setMarketing({ ...marketing, coupons: [...marketing.coupons, newData] });
        }
        setCouponModal({ isOpen: false, data: null });
    };

    const executeDelete = () => {
        const { type, id } = confirmDelete;
        const newMarketing = { ...marketing };
        if (type === 'tier') newMarketing.tiers = marketing.tiers.filter(t => t.id !== id);
        if (type === 'promo') newMarketing.promotions = marketing.promotions.filter(p => p.id !== id);
        if (type === 'coupon') newMarketing.coupons = marketing.coupons.filter(c => c.id !== id);
        setMarketing(newMarketing);
        setConfirmDelete({ isOpen: false, type: '', id: '', title: '' });
    };

    const moveTier = (index, dir) => {
        const newTiers = [...marketing.tiers];
        if (index + dir >= 0 && index + dir < newTiers.length) {
            [newTiers[index], newTiers[index + dir]] = [newTiers[index + dir], newTiers[index]];
            setMarketing({ ...marketing, tiers: newTiers });
        }
    };

    const togglePromo = (id) => {
        setMarketing({
            ...marketing,
            promotions: marketing.promotions.map(p => p.id === id ? { ...p, active: !p.active } : p)
        });
    };

    return (
        /* 🌟 ขนาดกว้าง 95% และ Scale เล็กลง (75%) */
        <div className="max-w-[95%] mx-auto space-y-4 animate-in fade-in duration-500 w-full relative pb-10 font-body">

            {/* 🌟 Header Compact Area */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <h2 className="text-xl font-black font-headline text-stone-800 shrink-0 tracking-tight">การตลาด (CRM)</h2>

                    {/* Compact Pill Tabs */}
                    <div className="flex gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
                        <button onClick={() => setActiveSubTab('tiers')} className={`px-5 py-1.5 rounded-lg text-[11px] font-black transition-all ${activeSubTab === 'tiers' ? 'bg-white text-[#861b00] shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>Membership</button>
                        <button onClick={() => setActiveSubTab('promos')} className={`px-5 py-1.5 rounded-lg text-[11px] font-black transition-all ${activeSubTab === 'promos' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>Promotions</button>
                        <button onClick={() => setActiveSubTab('coupons')} className={`px-5 py-1.5 rounded-lg text-[11px] font-black transition-all ${activeSubTab === 'coupons' ? 'bg-white text-amber-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>Coupons</button>
                    </div>
                </div>

                <button onClick={handleGlobalSave} className="bg-[#2c2929] hover:bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold shadow-md active:scale-95 transition-all">
                    บันทึกข้อมูลทั้งหมด
                </button>
            </div>

            {/* 🌟 Content Area - แถวยาวแนวนอน Scale 75% */}
            <div className="animate-in slide-in-from-bottom-2 duration-500">

                {/* 🔴 TIERS TAB - ROWS */}
                {activeSubTab === 'tiers' && (
                    <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm min-h-[400px]">
                        <div className="flex justify-between items-center mb-6 px-2">
                            <h3 className="font-black text-[#861b00] flex items-center gap-2 uppercase tracking-widest text-[11px]">
                                <span className="material-symbols-outlined text-[18px]">workspace_premium</span> Membership Tiers
                            </h3>
                            <button onClick={() => setTierModal({ isOpen: true, data: null })} className="text-[#861b00] border border-[#861b00]/20 px-4 py-1.5 rounded-lg font-bold text-[10px] hover:bg-stone-50 flex items-center gap-1 transition-all">
                                <span className="material-symbols-outlined text-sm">add</span> เพิ่มระดับ
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {marketing.tiers.map((t, index) => (
                                <div key={t.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-transparent hover:bg-white hover:border-[#861b00]/20 transition-all group">
                                    <div className="flex items-center gap-4 w-1/4">
                                        <div className="flex flex-col gap-0.5">
                                            <button onClick={() => moveTier(index, -1)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-stone-200 text-stone-300 hover:text-[#861b00]"><span className="material-symbols-outlined leading-none text-[18px]">keyboard_arrow_up</span></button>
                                            <button onClick={() => moveTier(index, 1)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-stone-200 text-stone-300 hover:text-[#861b00]"><span className="material-symbols-outlined leading-none text-[18px]">keyboard_arrow_down</span></button>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black uppercase text-[#861b00] tracking-tight">{t.name}</p>
                                            <p className="text-[9px] text-stone-400 font-bold">Level {index + 1}</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 px-4">
                                        <div className="inline-flex items-center gap-2 px-4 py-1 bg-white rounded-full border border-stone-100">
                                            <p className="text-[10px] font-bold text-stone-500">ยอดสะสม: <span className="text-stone-900 font-black">฿{fMoney(t.minSpent)} {t.maxSpent ? `- ฿${fMoney(t.maxSpent)}` : 'ขึ้นไป'}</span></p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <p className="text-[9px] font-bold text-stone-400 uppercase">ลดบิล</p>
                                            <p className="text-xl font-black text-stone-800">{t.discountPct}%</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setTierModal({ isOpen: true, data: t })} className="w-8 h-8 rounded-full bg-white border border-stone-200 text-stone-400 hover:text-emerald-500 flex items-center justify-center transition-all active:scale-90"><span className="material-symbols-outlined text-[16px] leading-none">edit</span></button>
                                            <button onClick={() => setConfirmDelete({ isOpen: true, type: 'tier', id: t.id, title: t.name })} className="w-8 h-8 rounded-full bg-white border border-stone-200 text-stone-300 hover:text-red-500 flex items-center justify-center transition-all active:scale-90"><span className="material-symbols-outlined text-[16px] leading-none">delete</span></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 🔴 PROMOS TAB - ROWS */}
                {activeSubTab === 'promos' && (
                    <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm min-h-[400px]">
                        <div className="flex justify-between items-center mb-6 px-2">
                            <h3 className="font-black text-emerald-600 flex items-center gap-2 uppercase tracking-widest text-[11px]">
                                <span className="material-symbols-outlined text-[18px]">celebration</span> Promotions
                            </h3>
                            <button onClick={() => { setPromoDiscountType('pct'); setPromoModal({ isOpen: true, data: null }); }} className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg font-bold text-[10px] hover:bg-black transition-all flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">add</span> สร้างโปร
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {marketing.promotions.map(p => (
                                <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${p.active ? 'bg-white border-emerald-100 shadow-sm' : 'bg-stone-50 opacity-60'}`}>
                                    <div className="flex items-center gap-4 w-1/4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.active ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-200'}`}>
                                            <span className="material-symbols-outlined text-xl">local_offer</span>
                                        </div>
                                        <p className="text-sm font-black text-stone-800">{p.name}</p>
                                    </div>
                                    <div className="flex-1 px-4 font-bold text-stone-500 text-[11px]">
                                        เงื่อนไข: <span className="text-stone-800">ซื้อขั้นต่ำ {p.minQty} ชิ้น → ลด {p.discountValue}{p.discountType === 'pct' ? '%' : '฿'}</span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <button onClick={() => togglePromo(p.id)} className={`w-10 h-5 rounded-full relative transition-colors ${p.active ? 'bg-emerald-500' : 'bg-stone-300'}`}>
                                            <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${p.active ? 'right-1' : 'left-1'}`}></div>
                                        </button>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setPromoDiscountType(p.discountType || 'pct'); setPromoModal({ isOpen: true, data: p }); }} className="w-8 h-8 rounded-full bg-white border text-stone-400 hover:text-emerald-500 flex items-center justify-center transition-all active:scale-90"><span className="material-symbols-outlined text-[16px] leading-none">edit</span></button>
                                            <button onClick={() => setConfirmDelete({ isOpen: true, type: 'promo', id: p.id, title: p.name })} className="w-8 h-8 rounded-full bg-white border text-stone-300 hover:text-red-500 flex items-center justify-center transition-all active:scale-90"><span className="material-symbols-outlined text-[16px] leading-none">delete</span></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 🔴 COUPONS TAB - ROWS */}
                {activeSubTab === 'coupons' && (
                    <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm min-h-[400px]">
                        <div className="flex justify-between items-center mb-6 px-2">
                            <h3 className="font-black text-amber-600 flex items-center gap-2 uppercase tracking-widest text-[11px]">
                                <span className="material-symbols-outlined text-[18px]">confirmation_number</span> Coupons
                            </h3>
                            <button onClick={() => { setCouponDiscountType('amt'); setCouponModal({ isOpen: true, data: null }); }} className="bg-amber-500 text-white px-4 py-1.5 rounded-lg font-bold text-[10px] hover:bg-black transition-all flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">add</span> ออกคูปอง
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {marketing.coupons.map(ct => (
                                <div key={ct.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-stone-200 hover:border-amber-400 transition-all group">
                                    <div className="flex items-center gap-4 w-1/4">
                                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex justify-center items-center shrink-0">
                                            <span className="material-symbols-outlined text-2xl leading-none">{ct.icon}</span>
                                        </div>
                                        <p className="text-sm font-black text-stone-800">{ct.name}</p>
                                    </div>
                                    <div className="flex-1 text-center py-2">
                                        <p className="text-[11px] font-black text-stone-800">
                                            {ct.type === 'free_drink' ? 'FREE DRINK' : <><span className="text-[9px] mr-1 text-amber-500 uppercase">SAVE</span>{ct.value}{ct.type === 'percent_discount' ? '%' : '฿'}</>}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setCouponDiscountType(ct.type === 'percent_discount' ? 'pct' : 'amt'); setCouponModal({ isOpen: true, data: ct }); }} className="w-8 h-8 rounded-full bg-stone-50 border text-stone-400 hover:text-emerald-500 flex items-center justify-center transition-all active:scale-90"><span className="material-symbols-outlined text-[16px] leading-none">edit</span></button>
                                        <button onClick={() => setConfirmDelete({ isOpen: true, type: 'coupon', id: ct.id, title: ct.name })} className="w-8 h-8 rounded-full bg-stone-50 border text-stone-300 hover:text-red-500 flex items-center justify-center transition-all active:scale-90"><span className="material-symbols-outlined text-[16px] leading-none">delete</span></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ================= MODALS (เหมือนเดิมเป๊ะเพื่อน!) ================= */}

            {/* 🟢 TIER MODAL */}
            {tierModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
                    <form onSubmit={saveTier} className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 relative">
                        <button type="button" onClick={() => setTierModal({ isOpen: false, data: null })} className="absolute top-6 right-6 text-stone-400 hover:text-stone-600 flex items-center justify-center w-8 h-8 rounded-full hover:bg-stone-100 transition-colors"><span className="material-symbols-outlined leading-none">close</span></button>
                        <h3 className="font-black text-2xl mb-6 text-stone-800 font-headline">แก้ไขระดับ</h3>
                        <div className="space-y-5 mb-8">
                            <div><label className="text-xs font-bold text-stone-500 block mb-2">ชื่อระดับ</label><input name="name" defaultValue={tierModal.data?.name} className="w-full p-3.5 border-2 border-stone-200 rounded-2xl font-bold text-stone-700 outline-none focus:border-stone-400 transition-all" required /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-stone-500 block mb-2">ยอดขั้นต่ำ (Min)</label><input name="minSpent" type="number" defaultValue={tierModal.data?.minSpent} className="w-full p-3.5 border-2 border-stone-200 rounded-2xl font-bold text-stone-700 outline-none focus:border-stone-400" required /></div>
                                <div><label className="text-xs font-bold text-stone-500 block mb-2">ยอดสูงสุด (Max)</label><input name="maxSpent" type="number" defaultValue={tierModal.data?.maxSpent} className="w-full p-3.5 border-2 border-stone-200 rounded-2xl font-bold text-stone-700 outline-none focus:border-stone-400" placeholder="999" /></div>
                            </div>
                            <div><label className="text-xs font-bold text-stone-500 block mb-2">ส่วนลด (%)</label><input name="discountPct" type="number" defaultValue={tierModal.data?.discountPct} className="w-full p-3.5 border-2 border-stone-200 rounded-2xl font-bold text-stone-700 outline-none focus:border-stone-400" required /></div>
                        </div>
                        <button type="submit" className="w-full py-4 bg-[#861b00] text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all text-lg">บันทึกระดับสมาชิก</button>
                    </form>
                </div>
            )}

            {/* 🟢 PROMO MODAL */}
            {promoModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
                    <form onSubmit={savePromo} className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 relative">
                        <button type="button" onClick={() => setPromoModal({ isOpen: false, data: null })} className="absolute top-6 right-6 text-stone-400 hover:text-stone-600 flex items-center justify-center w-8 h-8 rounded-full hover:bg-stone-100 transition-colors"><span className="material-symbols-outlined leading-none">close</span></button>
                        <h3 className="font-black text-2xl mb-6 text-emerald-600 font-headline">จัดการโปรโมชัน</h3>
                        <div className="space-y-4 mb-8">
                            <div><label className="text-xs font-bold text-stone-500 block mb-2">ชื่อโปร</label><input name="name" defaultValue={promoModal.data?.name} className="w-full p-3.5 border-2 border-stone-200 rounded-2xl font-bold outline-none focus:border-emerald-500" required /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-stone-500 block mb-2">ซื้อขั้นต่ำ</label><input name="minQty" type="number" defaultValue={promoModal.data?.minQty || 2} className="w-full p-3.5 border-2 border-stone-200 rounded-2xl font-bold outline-none focus:border-emerald-500" required /></div>
                                <div className="relative"><label className="text-xs font-bold text-stone-500 block mb-2 text-emerald-600">ลดราคา</label>
                                    <div className="relative flex">
                                        <input name="discountValue" type="number" defaultValue={promoModal.data?.discountValue || 50} className="w-full p-3.5 border-2 border-stone-200 rounded-2xl font-black text-emerald-600 outline-none focus:border-emerald-500 pr-24" required />
                                        <div className="absolute right-2 top-2 bottom-2 bg-stone-100 rounded-xl p-1 flex gap-1 shadow-inner">
                                            <button type="button" onClick={() => setPromoDiscountType('amt')} className={`px-2 rounded-lg text-[10px] font-black transition-all ${promoDiscountType === 'amt' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-400'}`}>฿</button>
                                            <button type="button" onClick={() => setPromoDiscountType('pct')} className={`px-2 rounded-lg text-[10px] font-black transition-all ${promoDiscountType === 'pct' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-400'}`}>%</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button type="submit" className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all text-lg">บันทึกโปรโมชัน</button>
                    </form>
                </div>
            )}

            {/* 🔴 DELETE CONFIRM MODAL */}
            {confirmDelete.isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 text-center relative">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-inner"><span className="material-symbols-outlined text-3xl leading-none">delete_forever</span></div>
                        <h3 className="font-black text-xl mb-2 text-stone-800 tracking-tight">ยืนยันการลบ?</h3>
                        <p className="text-sm text-stone-500 mb-8 font-medium">ข้อมูลของ "{confirmDelete.title}" จะหายไปถาวร</p>
                        <div className="flex gap-3"><button onClick={() => setConfirmDelete({ isOpen: false, type: '', id: '', title: '' })} className="flex-1 py-4 bg-stone-100 font-bold text-stone-500 rounded-2xl hover:bg-stone-200 transition-all">ยกเลิก</button><button onClick={executeDelete} className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all">ลบเลย</button></div>
                    </div>
                </div>
            )}

            {/* 🟢 SUCCESS MODAL */}
            {showSuccess && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-white/40 backdrop-blur-sm pointer-events-none">
                    <div className="bg-white rounded-[2.5rem] p-8 px-12 shadow-2xl border-4 border-emerald-500 animate-in zoom-in duration-300 text-center pointer-events-auto">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-inner"><span className="material-symbols-outlined text-5xl leading-none">check_circle</span></div>
                        <h3 className="text-2xl font-black text-stone-800 tracking-widest mb-1 uppercase">บันทึกสำเร็จ</h3>
                    </div>
                </div>
            )}

        </div>
    );
}