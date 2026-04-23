import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';

export default function MarketingTab() {
    const { marketing, setMarketing, categories, menuItems } = useContext(AppContext);

    const [activeSubTab, setActiveSubTab] = useState('tiers');

    const [tierModal, setTierModal] = useState({ isOpen: false, data: null });

    const [couponModal, setCouponModal] = useState({ isOpen: false, data: null });
    const [couponDiscountType, setCouponDiscountType] = useState('amt');

    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, type: '', id: '', title: '' });
    const [showSuccess, setShowSuccess] = useState(false);

    // ==========================================
    // 🌟 PROMO MODAL STATE
    // ==========================================
    const [promoModal, setPromoModal] = useState({ isOpen: false, data: null });

    const [promoForm, setPromoForm] = useState({
        name: '',
        targetCategories: [],
        targetItems: [],
        minQty: 1,
        discountValue: '',
        discountType: 'pct',
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        eligibleFor: 'all'
    });

    const fMoney = (n) => parseFloat(n || 0).toLocaleString('en-US');

    const daysList = [
        { id: 'Mon', label: 'จ.' }, { id: 'Tue', label: 'อ.' }, { id: 'Wed', label: 'พ.' },
        { id: 'Thu', label: 'พฤ.' }, { id: 'Fri', label: 'ศ.' }, { id: 'Sat', label: 'ส.' }, { id: 'Sun', label: 'อา.' }
    ];

    // ================== CORE FUNCTIONS ================== //
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
        const newData = {
            id: promoModal.data?.id || `p_${Date.now()}`,
            name: promoForm.name,
            targetCategories: promoForm.targetCategories,
            targetItems: promoForm.targetItems,
            minQty: parseInt(promoForm.minQty) || 1,
            discountValue: parseFloat(promoForm.discountValue) || 0,
            discountType: promoForm.discountType,
            active: promoModal.data?.active ?? true,
            eligibleFor: promoForm.eligibleFor,
            startDate: promoForm.startDate,
            endDate: promoForm.endDate,
            startTime: promoForm.startTime,
            endTime: promoForm.endTime,
            daysOfWeek: promoForm.daysOfWeek
        };

        if (promoModal.data) {
            setMarketing({ ...marketing, promotions: marketing.promotions.map(p => p.id === newData.id ? newData : p) });
        } else {
            setMarketing({ ...marketing, promotions: [...marketing.promotions, newData] });
        }
        setPromoModal({ isOpen: false, data: null });
    };

    const togglePromoCategory = (categoryId) => {
        setPromoForm(prev => {
            const isSelected = prev.targetCategories.includes(categoryId);
            return {
                ...prev,
                targetCategories: isSelected
                    ? prev.targetCategories.filter(c => c !== categoryId)
                    : [...prev.targetCategories, categoryId]
            };
        });
    };

    const togglePromoItem = (itemId) => {
        setPromoForm(prev => {
            const isSelected = prev.targetItems.includes(itemId);
            return {
                ...prev,
                targetItems: isSelected
                    ? prev.targetItems.filter(i => i !== itemId)
                    : [...prev.targetItems, itemId]
            };
        });
    };

    const togglePromoDay = (dayId) => {
        setPromoForm(prev => {
            const isSelected = prev.daysOfWeek.includes(dayId);
            return {
                ...prev,
                daysOfWeek: isSelected
                    ? prev.daysOfWeek.filter(d => d !== dayId)
                    : [...prev.daysOfWeek, dayId]
            };
        });
    };

    const openPromoModal = (promo = null) => {
        if (promo) {
            setPromoForm({
                ...promo,
                targetCategories: promo.targetCategories || [],
                targetItems: promo.targetItems || [],
                daysOfWeek: promo.daysOfWeek || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                discountType: promo.discountType || 'pct',
                eligibleFor: promo.eligibleFor || 'all',
                minQty: promo.minQty || 1,
                discountValue: promo.discountValue || '',
                startDate: promo.startDate || '',
                endDate: promo.endDate || '',
                startTime: promo.startTime || '',
                endTime: promo.endTime || ''
            });
        } else {
            setPromoForm({
                name: '', targetCategories: [], targetItems: [], minQty: 1, discountValue: '',
                discountType: 'pct', startDate: '', endDate: '', startTime: '', endTime: '',
                daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], eligibleFor: 'all'
            });
        }
        setPromoModal({ isOpen: true, data: promo });
    };

    const saveCoupon = (e) => {
        e.preventDefault();
        const form = e.target;
        let cType = 'fixed_discount';
        if (couponDiscountType === 'pct') cType = 'percent_discount';
        if (couponDiscountType === 'free') cType = 'free_drink';

        const newData = {
            id: couponModal.data?.id || `c_${Date.now()}`,
            name: form.name.value,
            type: cType,
            value: cType === 'free_drink' ? 0 : parseInt(form.value.value),
            eligibleFor: form.eligibleFor?.value || 'all',
            icon: cType === 'free_drink' ? 'local_cafe' : 'confirmation_number'
        };

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

    const togglePromoActive = (id) => {
        setMarketing({
            ...marketing,
            promotions: marketing.promotions.map(p => p.id === id ? { ...p, active: !p.active } : p)
        });
    };

    // 🌟 ฟังก์ชันจัดการสีและไอคอนของ Tier แบบพรีเมียม (จับคำในชื่อ)
    const getTierStyle = (tierName) => {
        const name = tierName?.toLowerCase() || '';

        // 💎 ดักจับ Diamond ให้เป็นธีมเพชรสีน้ำเงินพาสเทล พร้อมเปลี่ยนไอคอนเป็นรูปเพชร
        if (name.includes('diamond') || name.includes('platinum')) return {
            bg: 'from-blue-100 to-blue-200',
            text: 'text-blue-700',
            border: 'border-blue-300',
            nameColor: 'text-blue-700',
            icon: 'diamond' // ใช้ไอคอนรูปเพชร
        };
        if (name.includes('gold')) return {
            bg: 'from-yellow-100 via-yellow-200 to-amber-300',
            text: 'text-amber-700',
            border: 'border-yellow-300',
            nameColor: 'text-amber-600',
            icon: 'workspace_premium'
        };
        if (name.includes('silver')) return {
            bg: 'from-slate-100 to-slate-200',
            text: 'text-slate-600',
            border: 'border-slate-300',
            nameColor: 'text-slate-500',
            icon: 'workspace_premium'
        };
        if (name.includes('bronze')) return {
            bg: 'from-orange-50 to-orange-100',
            text: 'text-orange-700',
            border: 'border-orange-200',
            nameColor: 'text-[#b5580e]',
            icon: 'workspace_premium'
        };

        // สี Default (สีร้าน)
        return {
            bg: 'from-[#fdf8f5] to-orange-50',
            text: 'text-[#861b00]',
            border: 'border-[#861b00]/20',
            nameColor: 'text-[#861b00]',
            icon: 'stars'
        };
    };

    const safeCategories = Array.isArray(categories) ? categories : [];
    const safeMenuItems = Array.isArray(menuItems) ? menuItems : [];

    return (
        <div className="flex flex-col h-full gap-4 animate-in fade-in duration-500 w-full relative font-body pb-2">

            {/* Header Compact Area */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <h2 className="text-xl font-black font-headline text-stone-800 shrink-0 tracking-tight">การตลาด (CRM)</h2>

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

            {/* Content Area */}
            <div className="animate-in slide-in-from-bottom-2 duration-500 flex flex-col flex-1 min-h-0">

                {/* 🔴 TIERS TAB */}
                {activeSubTab === 'tiers' && (
                    <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm flex flex-col flex-1 min-h-0">
                        <div className="flex justify-between items-center mb-6 px-2 shrink-0">
                            <h3 className="font-black text-[#861b00] flex items-center gap-2 uppercase tracking-widest text-[11px]">
                                <span className="material-symbols-outlined text-[18px]">workspace_premium</span> Membership Tiers
                            </h3>
                            <button onClick={() => setTierModal({ isOpen: true, data: null })} className="text-[#861b00] border border-[#861b00]/20 px-4 py-1.5 rounded-lg font-bold text-[10px] hover:bg-stone-50 flex items-center gap-1 transition-all">
                                <span className="material-symbols-outlined text-sm">add</span> เพิ่มระดับ
                            </button>
                        </div>
                        <div className="flex flex-col gap-3 flex-1 overflow-y-auto no-scrollbar pr-2 pb-4">
                            {marketing.tiers.map((t, index) => {
                                // 🌟 ดึงสีและไอคอนจากฟังก์ชันมาใช้งาน
                                const tierStyle = getTierStyle(t.name);

                                return (
                                    <div key={t.id} className="flex items-center justify-between p-4 bg-white rounded-[1.5rem] border border-stone-200 shadow-sm hover:shadow-md hover:border-stone-300 transition-all group shrink-0">
                                        <div className="flex items-center gap-5 w-[30%]">
                                            <div className="flex flex-col gap-0.5">
                                                <button onClick={() => moveTier(index, -1)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-stone-100 text-stone-300 hover:text-[#861b00]"><span className="material-symbols-outlined leading-none text-[18px]">keyboard_arrow_up</span></button>
                                                <button onClick={() => moveTier(index, 1)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-stone-100 text-stone-300 hover:text-[#861b00]"><span className="material-symbols-outlined leading-none text-[18px]">keyboard_arrow_down</span></button>
                                            </div>

                                            {/* 🌟 ไอคอน Premium ประจำระดับ (ดึง icon มาแสดงแบบ Dynamic) */}
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tierStyle.bg} flex items-center justify-center shadow-sm border ${tierStyle.border} shrink-0`}>
                                                <span className={`material-symbols-outlined text-[26px] ${tierStyle.text}`}>
                                                    {tierStyle.icon}
                                                </span>
                                            </div>

                                            <div>
                                                {/* 🌟 สีชื่อระดับสอดคล้องกับธีม */}
                                                <p className={`text-base font-black uppercase tracking-tight ${tierStyle.nameColor}`}>{t.name}</p>
                                                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-0.5">Level {index + 1}</p>
                                            </div>
                                        </div>

                                        <div className="flex-1 px-4">
                                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-stone-50 rounded-full border border-stone-100">
                                                <span className="material-symbols-outlined text-[15px] text-stone-400">payments</span>
                                                <p className="text-[11px] font-bold text-stone-500">ยอดสะสม: <span className="text-stone-800 font-black">฿{fMoney(t.minSpent)} {t.maxSpent ? `- ฿${fMoney(t.maxSpent)}` : 'ขึ้นไป'}</span></p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8">
                                            <div className="text-right">
                                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">ส่วนลดบิล</p>
                                                <p className={`text-2xl font-black ${tierStyle.nameColor}`}>{t.discountPct}%</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setTierModal({ isOpen: true, data: t })} className="w-9 h-9 rounded-full bg-stone-50 border border-stone-200 text-stone-400 hover:text-emerald-500 hover:bg-white flex items-center justify-center transition-all shadow-sm active:scale-90"><span className="material-symbols-outlined text-[18px] leading-none">edit</span></button>
                                                <button onClick={() => setConfirmDelete({ isOpen: true, type: 'tier', id: t.id, title: t.name })} className="w-9 h-9 rounded-full bg-stone-50 border border-stone-200 text-stone-300 hover:text-red-500 hover:bg-white flex items-center justify-center transition-all shadow-sm active:scale-90"><span className="material-symbols-outlined text-[18px] leading-none">delete</span></button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 🔴 PROMOS TAB */}
                {activeSubTab === 'promos' && (
                    <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm flex flex-col flex-1 min-h-0">
                        <div className="flex justify-between items-center mb-6 px-2 shrink-0">
                            <h3 className="font-black text-emerald-600 flex items-center gap-2 uppercase tracking-widest text-[11px]">
                                <span className="material-symbols-outlined text-[18px]">celebration</span> Promotions
                            </h3>
                            <button onClick={() => openPromoModal()} className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg font-bold text-[10px] hover:bg-black transition-all flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">add</span> สร้างโปร
                            </button>
                        </div>
                        <div className="flex flex-col gap-2 flex-1 overflow-y-auto no-scrollbar pr-2 pb-4">
                            {marketing.promotions.map(p => (
                                <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all shrink-0 ${p.active ? 'bg-white border-emerald-100 shadow-sm' : 'bg-stone-50 opacity-60'}`}>
                                    <div className="flex items-center gap-4 w-1/4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.active ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-200'}`}>
                                            <span className="material-symbols-outlined text-xl">local_offer</span>
                                        </div>
                                        <p className="text-sm font-black text-stone-800">{p.name}</p>
                                    </div>
                                    <div className="flex-1 px-4 flex flex-col gap-0.5">
                                        <p className="font-bold text-stone-500 text-[11px]">เงื่อนไข: <span className="text-stone-800">ซื้อขั้นต่ำ {p.minQty} ชิ้น → ลด {p.discountValue}{p.discountType === 'pct' ? '%' : '฿'}</span></p>
                                        <p className="text-[9px] text-stone-400 font-bold">
                                            {p.targetCategories?.length > 0 ? `บางหมวดหมู่` : 'ทุกหมวดหมู่'} • {p.eligibleFor === 'member' ? 'เฉพาะสมาชิก' : 'ทุกคน'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <button onClick={() => togglePromoActive(p.id)} className={`w-10 h-5 rounded-full relative transition-colors ${p.active ? 'bg-emerald-500' : 'bg-stone-300'}`}>
                                            <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${p.active ? 'right-1' : 'left-1'}`}></div>
                                        </button>
                                        <div className="flex gap-2">
                                            <button onClick={() => openPromoModal(p)} className="w-8 h-8 rounded-full bg-white border text-stone-400 hover:text-emerald-500 flex items-center justify-center transition-all active:scale-90"><span className="material-symbols-outlined text-[16px] leading-none">edit</span></button>
                                            <button onClick={() => setConfirmDelete({ isOpen: true, type: 'promo', id: p.id, title: p.name })} className="w-8 h-8 rounded-full bg-white border text-stone-300 hover:text-red-500 flex items-center justify-center transition-all active:scale-90"><span className="material-symbols-outlined text-[16px] leading-none">delete</span></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 🔴 COUPONS TAB */}
                {activeSubTab === 'coupons' && (
                    <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm flex flex-col flex-1 min-h-0">
                        <div className="flex justify-between items-center mb-6 px-2 shrink-0">
                            <h3 className="font-black text-amber-600 flex items-center gap-2 uppercase tracking-widest text-[11px]">
                                <span className="material-symbols-outlined text-[18px]">confirmation_number</span> Coupons
                            </h3>
                            <button onClick={() => { setCouponDiscountType('amt'); setCouponModal({ isOpen: true, data: null }); }} className="bg-amber-500 text-white px-4 py-1.5 rounded-lg font-bold text-[10px] hover:bg-black transition-all flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">add</span> ออกคูปอง
                            </button>
                        </div>
                        <div className="flex flex-col gap-2 flex-1 overflow-y-auto no-scrollbar pr-2 pb-4">
                            {marketing.coupons.map(ct => (
                                <div key={ct.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-stone-200 hover:border-amber-400 transition-all group shrink-0">
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
                                        <button onClick={() => { setCouponDiscountType(ct.type === 'percent_discount' ? 'pct' : ct.type === 'free_drink' ? 'free' : 'amt'); setCouponModal({ isOpen: true, data: ct }); }} className="w-8 h-8 rounded-full bg-stone-50 border text-stone-400 hover:text-emerald-500 flex items-center justify-center transition-all active:scale-90"><span className="material-symbols-outlined text-[16px] leading-none">edit</span></button>
                                        <button onClick={() => setConfirmDelete({ isOpen: true, type: 'coupon', id: ct.id, title: ct.name })} className="w-8 h-8 rounded-full bg-stone-50 border text-stone-300 hover:text-red-500 flex items-center justify-center transition-all active:scale-90"><span className="material-symbols-outlined text-[16px] leading-none">delete</span></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ================= MODALS ================= */}

            {/* 1. Modal: จัดการ Tiers */}
            {tierModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setTierModal({ isOpen: false, data: null })} />
                    <form onSubmit={saveTier} className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 relative z-10">
                        <button type="button" onClick={() => setTierModal({ isOpen: false, data: null })} className="absolute top-6 right-6 text-stone-400 hover:text-stone-600 flex items-center justify-center w-8 h-8 rounded-full hover:bg-stone-100 transition-colors"><span className="material-symbols-outlined leading-none">close</span></button>
                        <h3 className="font-black text-2xl mb-6 text-[#861b00] font-headline">{tierModal.data ? 'แก้ไขระดับ' : 'เพิ่มระดับใหม่'}</h3>
                        <div className="space-y-5 mb-8">
                            <div><label className="text-xs font-bold text-stone-500 block mb-2">ชื่อระดับ</label><input name="name" defaultValue={tierModal.data?.name} className="w-full p-3.5 border-2 border-stone-200 rounded-2xl font-bold text-stone-700 outline-none focus:border-[#861b00] transition-all" required placeholder="เช่น Gold, Diamond" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-stone-500 block mb-2">ยอดสะสมขั้นต่ำ (฿)</label><input name="minSpent" type="number" defaultValue={tierModal.data?.minSpent} className="w-full p-3.5 border-2 border-stone-200 rounded-2xl font-bold text-stone-700 outline-none focus:border-[#861b00]" required placeholder="0" /></div>
                                <div><label className="text-xs font-bold text-stone-500 block mb-2">สูงสุด (ปล่อยว่างได้)</label><input name="maxSpent" type="number" defaultValue={tierModal.data?.maxSpent} className="w-full p-3.5 border-2 border-stone-200 rounded-2xl font-bold text-stone-700 outline-none focus:border-[#861b00]" placeholder="99999" /></div>
                            </div>
                            <div><label className="text-xs font-bold text-stone-500 block mb-2">สิทธิพิเศษ: ลดทั้งบิล (%)</label><input name="discountPct" type="number" defaultValue={tierModal.data?.discountPct} className="w-full p-3.5 border-2 border-[#861b00] rounded-2xl font-black text-[#861b00] text-lg text-center outline-none focus:ring-4 focus:ring-[#861b00]/20" required placeholder="10" /></div>
                        </div>
                        <button type="submit" className="w-full py-4 bg-[#861b00] hover:bg-black text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all text-lg">บันทึกระดับสมาชิก</button>
                    </form>
                </div>
            )}

            {/* 🌟 2. Modal: จัดการ โปรโมชัน */}
            {promoModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setPromoModal({ isOpen: false, data: null })} />
                    <form onSubmit={savePromo} className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl animate-in zoom-in-95 relative z-10">
                        <button type="button" onClick={() => setPromoModal({ isOpen: false, data: null })} className="absolute top-6 right-6 text-stone-400 hover:text-stone-600 flex items-center justify-center w-8 h-8 rounded-full hover:bg-stone-100 transition-colors"><span className="material-symbols-outlined leading-none">close</span></button>

                        {/* Step 1: เพิ่ม Icon ที่ Header */}
                        <h3 className="font-black text-2xl mb-6 text-emerald-600 font-headline flex items-center gap-2">
                            <span className="material-symbols-outlined text-3xl">celebration</span>
                            {promoModal.data ? 'แก้ไขโปรโมชัน' : 'สร้างโปรโมชัน'}
                        </h3>

                        <div className="space-y-6 mb-8">
                            {/* Step 2: เพิ่มมิติให้ช่อง Input */}
                            <div>
                                <label className="text-xs font-bold text-stone-500 block mb-2">ชื่อโปร</label>
                                <input
                                    value={promoForm.name}
                                    onChange={e => setPromoForm({ ...promoForm, name: e.target.value })}
                                    className="w-full p-3.5 bg-stone-50 border-2 border-stone-200 rounded-2xl font-bold outline-none focus:bg-white focus:border-emerald-500 text-stone-800 transition-colors"
                                    required placeholder="เช่น แก้วที่ 2 ลด 50%"
                                />
                            </div>

                            {/* หมวดหมู่ & สินค้าที่ร่วมรายการ */}
                            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                                <label className="text-xs font-bold text-stone-500 block mb-3">หมวดหมู่ที่ร่วมรายการ</label>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setPromoForm({ ...promoForm, targetCategories: [], targetItems: [] })}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${promoForm.targetCategories.length === 0 ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-100'}`}
                                    >
                                        ทุกหมวดหมู่ (All)
                                    </button>

                                    {safeCategories.map(cat => (
                                        <button
                                            type="button" key={cat.id}
                                            onClick={() => togglePromoCategory(cat.id)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 ${promoForm.targetCategories.includes(cat.id) ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-100'}`}
                                        >
                                            {promoForm.targetCategories.includes(cat.id) && <span className="material-symbols-outlined text-[14px]">check</span>}
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>

                                {/* 🌟 แก้บัคที่ 2: ดักจับการเลือกเมนูย่อยให้หาเจอแน่นอน */}
                                {promoForm.targetCategories.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-stone-200 border-dashed">
                                        <label className="text-[10px] font-bold text-stone-400 block mb-2 uppercase">เลือกเฉพาะบางเมนู (ไม่บังคับ)</label>
                                        <div className="flex flex-wrap gap-2">
                                            {safeMenuItems
                                                .filter(p => {
                                                    const itemCat = p.category || p.category_id;
                                                    return promoForm.targetCategories.includes(itemCat) ||
                                                        promoForm.targetCategories.includes(Number(itemCat)) ||
                                                        promoForm.targetCategories.includes(String(itemCat));
                                                })
                                                .map(item => (
                                                    <button
                                                        type="button" key={item.id}
                                                        onClick={() => togglePromoItem(item.id)}
                                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors flex items-center gap-1 ${promoForm.targetItems.includes(item.id) ? 'bg-stone-800 border-stone-800 text-white' : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'}`}
                                                    >
                                                        {promoForm.targetItems.includes(item.id) && <span className="material-symbols-outlined text-[12px]">check</span>}
                                                        {item.name_th || item.name}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* ช่องซื้อขั้นต่ำ */}
                                <div>
                                    <label className="text-xs font-bold text-stone-500 block mb-2">ซื้อขั้นต่ำ (ชิ้น)</label>
                                    <input
                                        type="number" min="1"
                                        value={promoForm.minQty}
                                        onChange={e => setPromoForm({ ...promoForm, minQty: e.target.value })}
                                        className="w-full p-3.5 bg-stone-50 border-2 border-stone-200 rounded-2xl font-bold outline-none focus:bg-white focus:border-emerald-500 text-stone-800 transition-colors" required
                                    />
                                </div>
                                {/* Step 3: ตะโกนบอกส่วนลด (Focal Point) */}
                                <div className="relative">
                                    <label className="text-xs font-bold text-emerald-600 block mb-2">ลดราคา <span className="text-red-500">*</span></label>
                                    <div className="relative flex">
                                        <input
                                            type="number" required
                                            value={promoForm.discountValue}
                                            onChange={e => setPromoForm({ ...promoForm, discountValue: e.target.value })}
                                            className="w-full p-3.5 bg-emerald-50 border-2 border-emerald-400 rounded-2xl font-black text-xl text-emerald-600 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 pr-20 transition-colors"
                                        />
                                        <div className="absolute right-2 top-2 bottom-2 bg-white rounded-xl p-1 flex gap-1 shadow-sm border border-emerald-100">
                                            <button type="button" onClick={() => setPromoForm({ ...promoForm, discountType: 'amt' })} className={`px-2.5 rounded-lg text-[11px] font-black transition-all ${promoForm.discountType === 'amt' ? 'bg-emerald-500 text-white' : 'text-stone-400 hover:bg-stone-50'}`}>฿</button>
                                            <button type="button" onClick={() => setPromoForm({ ...promoForm, discountType: 'pct' })} className={`px-2.5 rounded-lg text-[11px] font-black transition-all ${promoForm.discountType === 'pct' ? 'bg-emerald-500 text-white' : 'text-stone-400 hover:bg-stone-50'}`}>%</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 4: Card-in-Card แบ่งโซนวันที่และเวลา */}
                            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-bold text-stone-400 block mb-1">เริ่มวันที่</label><input type="date" value={promoForm.startDate} onChange={e => setPromoForm({ ...promoForm, startDate: e.target.value })} className="w-full p-3 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-700 outline-none focus:border-emerald-500 transition-colors" /></div>
                                    <div><label className="text-[10px] font-bold text-stone-400 block mb-1">ถึงวันที่</label><input type="date" value={promoForm.endDate} onChange={e => setPromoForm({ ...promoForm, endDate: e.target.value })} className="w-full p-3 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-700 outline-none focus:border-emerald-500 transition-colors" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-bold text-stone-400 block mb-1">เริ่มเวลา</label><input type="time" value={promoForm.startTime} onChange={e => setPromoForm({ ...promoForm, startTime: e.target.value })} className="w-full p-3 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-700 outline-none focus:border-emerald-500 transition-colors" /></div>
                                    <div><label className="text-[10px] font-bold text-stone-400 block mb-1">ถึงเวลา</label><input type="time" value={promoForm.endTime} onChange={e => setPromoForm({ ...promoForm, endTime: e.target.value })} className="w-full p-3 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-700 outline-none focus:border-emerald-500 transition-colors" /></div>
                                </div>
                                <p className="text-[9px] text-stone-400 font-bold">* หากต้องการทำเป็น Happy Hour ให้ตั้งเวลาเริ่มและสิ้นสุด</p>

                                <div className="pt-2">
                                    <label className="text-[10px] font-bold text-stone-400 block mb-2">วันในสัปดาห์ที่ร่วมรายการ</label>
                                    <div className="flex justify-between gap-1">
                                        {daysList.map(day => (
                                            <button
                                                type="button" key={day.id}
                                                onClick={() => togglePromoDay(day.id)}
                                                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${promoForm.daysOfWeek.includes(day.id) ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white border-stone-200 text-stone-400 hover:bg-stone-100'}`}
                                            >
                                                {day.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex items-center justify-between">
                                <label className="text-xs font-bold text-stone-800">สิทธิ์ใช้งาน</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-stone-700">
                                        <input type="radio" name="eligibleFor" value="all" checked={promoForm.eligibleFor === 'all'} onChange={() => setPromoForm({ ...promoForm, eligibleFor: 'all' })} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                                        ทุกคน
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-stone-700">
                                        <input type="radio" name="eligibleFor" value="member" checked={promoForm.eligibleFor === 'member'} onChange={() => setPromoForm({ ...promoForm, eligibleFor: 'member' })} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                                        เฉพาะสมาชิก
                                    </label>
                                </div>
                            </div>

                        </div>
                        {/* Step 5: ปุ่มบันทึกแบบลอยตัว */}
                        <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/30 active:scale-95 transition-all text-lg">
                            บันทึกโปรโมชัน
                        </button>
                    </form>
                </div>
            )}

            {/* 3. Modal: จัดการ คูปอง */}
            {couponModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setCouponModal({ isOpen: false, data: null })} />
                    <form onSubmit={saveCoupon} className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 relative z-10">
                        <button type="button" onClick={() => setCouponModal({ isOpen: false, data: null })} className="absolute top-6 right-6 text-stone-400 hover:text-stone-600 flex items-center justify-center w-8 h-8 rounded-full hover:bg-stone-100 transition-colors"><span className="material-symbols-outlined leading-none">close</span></button>
                        <h3 className="font-black text-2xl mb-6 text-amber-500 font-headline flex items-center gap-2">
                            <span className="material-symbols-outlined text-3xl">confirmation_number</span>
                            {couponModal.data ? 'แก้ไขคูปอง' : 'ออกคูปองใหม่'}
                        </h3>

                        <div className="space-y-5 mb-8">
                            <div>
                                <label className="text-xs font-bold text-stone-500 block mb-2">ชื่อคูปอง <span className="text-red-500">*</span></label>
                                <input name="name" defaultValue={couponModal.data?.name} className="w-full p-3.5 border-2 border-stone-200 rounded-2xl font-bold outline-none focus:border-amber-500 text-stone-700 transition-colors" required placeholder="เช่น ลด 50 บาท บิลแรก" />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-stone-500 block mb-2">ประเภทส่วนลด</label>
                                <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200">
                                    <button type="button" onClick={() => setCouponDiscountType('amt')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${couponDiscountType === 'amt' ? 'bg-white text-amber-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>ลดเป็นบาท</button>
                                    <button type="button" onClick={() => setCouponDiscountType('pct')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${couponDiscountType === 'pct' ? 'bg-white text-amber-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>ลดเป็น %</button>
                                    <button type="button" onClick={() => setCouponDiscountType('free')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${couponDiscountType === 'free' ? 'bg-white text-amber-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>ฟรี 1 แก้ว</button>
                                </div>
                            </div>

                            {couponDiscountType !== 'free' && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="text-xs font-bold text-amber-600 block mb-2">ระบุมูลค่าส่วนลด {couponDiscountType === 'pct' ? '(%)' : '(บาท)'} <span className="text-red-500">*</span></label>
                                    <input
                                        name="value"
                                        type="number"
                                        defaultValue={couponModal.data?.value}
                                        className="w-full p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl font-black text-amber-600 text-2xl text-center outline-none focus:ring-4 focus:ring-amber-500/20"
                                        required
                                        placeholder={couponDiscountType === 'pct' ? '15' : '50'}
                                    />
                                </div>
                            )}
                        </div>

                        <button type="submit" className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all text-lg">
                            {couponModal.data ? 'อัปเดตข้อมูลคูปอง' : 'สร้างคูปอง'}
                        </button>
                    </form>
                </div>
            )}

            {/* 4. Modal: ยืนยันการลบ */}
            {confirmDelete.isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setConfirmDelete({ isOpen: false, type: '', id: '', title: '' })} />
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 text-center relative z-10">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-inner"><span className="material-symbols-outlined text-3xl leading-none">delete_forever</span></div>
                        <h3 className="font-black text-xl mb-2 text-stone-800 tracking-tight">ยืนยันการลบ?</h3>
                        <p className="text-sm text-stone-500 mb-8 font-medium">ข้อมูลของ "{confirmDelete.title}" จะหายไปถาวร</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete({ isOpen: false, type: '', id: '', title: '' })} className="flex-1 py-4 bg-stone-100 font-bold text-stone-500 rounded-2xl hover:bg-stone-200 transition-all">ยกเลิก</button>
                            <button onClick={executeDelete} className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all">ลบเลย</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. Modal: บันทึกข้อมูลทั้งหมดสำเร็จ */}
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