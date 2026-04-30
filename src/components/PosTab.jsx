import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import CheckoutModal from './CheckoutModal';

export default function PosTab({ viewMode }) {
    const { categories, menuItems, optionGroups, cart, setCart } = useContext(AppContext);

    // 🌟 1. ตั้งค่าเริ่มต้นให้หน้า POS โหลดสินค้าทั้งหมดขึ้นมาก่อน
    const [activeCategory, setActiveCategory] = useState('all');

    const [searchQuery, setSearchQuery] = useState('');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [tempOptions, setTempOptions] = useState({});
    const [tempQty, setTempQty] = useState(1);
    const [tempNote, setTempNote] = useState('');

    const [heldBills, setHeldBills] = useState([]);
    const [isHeldBillsOpen, setIsHeldBillsOpen] = useState(false);

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const handleItemClick = (item) => {
        const itemOptions = optionGroups.filter(og => og.applyTo.includes(item.cat));
        setSelectedItem(item); setTempQty(1); setTempNote('');
        if (itemOptions.length > 0) {
            const initial = {};
            itemOptions.forEach(og => {
                let def = og.choices.find(c => c.n === 'เย็น') || og.choices.find(c => c.p === 0) || og.choices[0];
                initial[og.id] = def;
            });
            setTempOptions(initial);
        } else { setTempOptions({}); }
    };

    const addToCart = (item, options, qty, note) => {
        const optionValues = Object.values(options).map(o => o.n);
        if (note) optionValues.push(`หมายเหตุ: ${note}`);
        const optionText = optionValues.join(', ');
        const cartKey = `${item.id}-${optionText}`;
        const finalPrice = item.price + Object.values(options).reduce((s, o) => s + (o.p || 0), 0);
        const categoryName = categories.find(c => String(c.id) === String(item.cat))?.name || 'อื่นๆ';
        const existing = cart.find(c => c.cartKey === cartKey);
        if (existing) {
            setCart(cart.map(c => c.cartKey === cartKey ? { ...c, qty: c.qty + qty } : c));
        } else {
            setCart([...cart, {
                ...item,
                cartKey,
                options: optionText,
                price: finalPrice,
                qty,
                category: categoryName
            }]);
        }

        setSelectedItem(null);
    };

    const handleHoldBill = () => {
        if (cart.length === 0) return;
        const newBill = {
            id: `BILL-${Math.floor(1000 + Math.random() * 9000)}`,
            time: new Date().toLocaleTimeString('th-TH').slice(0, 5),
            items: cart,
            total: subtotal
        };
        setHeldBills([newBill, ...heldBills]);
        setCart([]);
        setIsCartOpen(false);
    };

    const handleRestoreBill = (bill) => {
        setCart(bill.items);
        setHeldBills(heldBills.filter(b => b.id !== bill.id));
        setIsHeldBillsOpen(false);
        setIsCartOpen(true);
    };

    return (
        <div className="flex flex-col h-full relative w-full font-body">

            {/* 🛒 Floating Cart Button */}
            <button
                onClick={() => setIsCartOpen(true)}
                className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 z-40 bg-[#861b00] text-white px-5 lg:px-6 py-3.5 lg:py-4 rounded-[2rem] shadow-xl flex items-center gap-3 lg:gap-4 border-4 border-white hover:scale-105 transition-transform"
            >
                <div className="relative">
                    <span className="material-symbols-outlined text-xl lg:text-2xl">shopping_basket</span>
                    <span className="absolute -top-2 -right-3 bg-emerald-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                        {cart.reduce((s, c) => s + c.qty, 0)}
                    </span>
                </div>
                <span className="font-black text-lg lg:text-xl border-l border-white/30 pl-3 lg:pl-4">฿{subtotal.toLocaleString()}</span>
            </button>

            {/* 🗂️ Menu Grid Area */}
            <div className="w-full bg-white p-4 lg:p-6 rounded-[2.5rem] border border-stone-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden mt-2">
                {/* 🗂️ Categories & Search Bar */}
                <div className="flex justify-between items-start sm:items-center gap-4 mb-5 pb-2 border-b border-stone-100 shrink-0">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">

                        {/* 🌟 2. เพิ่มปุ่ม "ทั้งหมด" นำหน้าแท็บหมวดหมู่ */}
                        <button
                            onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
                            className={`shrink-0 px-5 lg:px-6 py-2.5 lg:py-3 rounded-full text-xs font-bold transition-all ${activeCategory === 'all' && !searchQuery ? 'bg-[#861b00] text-white shadow-md' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'}`}
                        >
                            ทั้งหมด
                        </button>

                        {categories.map(c => (
                            <button
                                key={c.id}
                                onClick={() => { setActiveCategory(c.id); setSearchQuery(''); }}
                                className={`shrink-0 px-5 lg:px-6 py-2.5 lg:py-3 rounded-full text-xs font-bold transition-all ${String(activeCategory) === String(c.id) && !searchQuery ? 'bg-[#861b00] text-white shadow-md' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'}`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>

                    <div className="relative shrink-0 w-full sm:w-[220px] md:w-[260px]">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[20px]">search</span>
                        <input
                            type="text"
                            placeholder="ค้นหาเมนู (TH/EN)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-stone-50 border border-stone-200 rounded-[1rem] py-3 pl-10 pr-8 text-xs font-bold text-stone-700 outline-none focus:border-[#861b00] focus:bg-white transition-all shadow-sm placeholder:text-stone-300"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-600 flex items-center">
                                <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3 lg:gap-4 content-start overflow-y-auto no-scrollbar flex-1 pb-32 px-1 pt-1 min-h-0">
                    {/* 🌟 3. ปรับ Logic การกรองสินค้าให้รองรับเงื่อนไข 'all' */}
                    {menuItems.filter(m => {
                        // 1. เช็คหมวดหมู่ (ถ้าเป็น 'all' ให้ผ่าน, ถ้าไม่ใช่ ให้รหัสตรงกัน)
                        const categoryMatch = activeCategory === 'all' || String(m.cat) === String(activeCategory);

                        // 2. เช็คการค้นหาด้วยคำ (ถ้ามี)
                        let searchMatch = true;
                        if (searchQuery) {
                            const query = searchQuery.toLowerCase();
                            const matchTH = (m.name_th || m.name || '').toLowerCase().includes(query);
                            const matchEN = (m.name_en || '').toLowerCase().includes(query);
                            searchMatch = matchTH || matchEN;
                        }

                        // แสดงเมื่อผ่านทั้ง 2 เงื่อนไข
                        return categoryMatch && searchMatch;

                    }).map(item => {
                        const qty = cart.filter(c => c.id === item.id).reduce((s, c) => s + c.qty, 0);
                        return (
                            <button key={item.id} onClick={() => handleItemClick(item)} className="bg-white rounded-[1.5rem] p-3 border border-stone-100 shadow-sm hover:shadow-[0_12px_24px_-8px_rgba(134,27,0,0.15)] hover:border-amber-300 transition-all flex flex-col active:scale-95 group text-left relative h-full w-full">

                                {qty > 0 && <div className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-md border-2 border-white z-10 animate-in zoom-in">{qty}</div>}

                                <div className={`w-full shrink-0 aspect-square rounded-[1rem] mb-3 flex items-center justify-center overflow-hidden relative transition-colors ${(!item.image || viewMode === 'color') ? (item.color || 'bg-stone-200') : 'bg-stone-50'}`}>
                                    {(viewMode === 'image' && item.image) ? (
                                        <img src={item.image} alt={item.name_th} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                    ) : (
                                        <span className="font-black text-sm lg:text-base text-black/20 uppercase tracking-tight group-hover:scale-110 transition-transform duration-300 text-center px-3 leading-snug line-clamp-3">
                                            {item.name_th || item.name || '?'}
                                        </span>
                                    )}
                                </div>

                                <div className="w-full flex items-center justify-between mt-auto">
                                    <div className="w-3/4 flex flex-col pr-2 overflow-hidden">
                                        <h4 className="font-bold text-stone-800 text-[13px] truncate group-hover:text-[#861b00] transition-colors" title={item.name_th || item.name}>
                                            {item.name_th || item.name}
                                        </h4>
                                        {item.name_en && (
                                            <p className="text-[10px] font-medium text-stone-400 truncate uppercase tracking-tight mt-0.5" title={item.name_en}>
                                                {item.name_en}
                                            </p>
                                        )}
                                    </div>
                                    <div className="w-1/4 text-right shrink-0 flex justify-end items-center">
                                        <span className="font-black text-[#861b00] text-[14px] group-hover:text-amber-600 transition-colors">
                                            ฿{item.price.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* หน้าต่างตะกร้า (Cart Drawer) */}
            {isCartOpen && (
                <>
                    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 transition-opacity duration-300" onClick={() => setIsCartOpen(false)} />
                    <div className="fixed top-4 right-4 bottom-4 w-full max-w-[380px] lg:max-w-[420px] bg-white z-50 rounded-[2.5rem] shadow-2xl p-5 lg:p-6 flex flex-col animate-in slide-in-from-right duration-300">

                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-stone-100 shrink-0">
                            <div>
                                <h3 className="font-black text-2xl text-[#861b00] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[28px]">shopping_basket</span> ตะกร้าสินค้า
                                </h3>
                                <p className="text-[10px] text-stone-400 font-bold mt-1 uppercase tracking-wider">
                                    {cart.reduce((s, c) => s + c.qty, 0)} รายการในตะกร้า
                                </p>
                            </div>
                            <button onClick={() => setIsCartOpen(false)} className="w-10 h-10 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center hover:bg-stone-200 hover:text-stone-700 transition-colors active:scale-95">
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 mb-4 no-scrollbar min-h-0">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-stone-300 opacity-50">
                                    <span className="material-symbols-outlined text-6xl mb-2">shopping_bag</span>
                                    <p className="font-bold text-sm">ยังไม่มีสินค้าในตะกร้า</p>
                                </div>
                            ) : (
                                cart.map((item, idx) => (
                                    <div key={item.cartKey} className="group bg-stone-50 hover:bg-white p-4 rounded-3xl flex flex-col gap-3 border border-transparent hover:border-[#861b00]/20 hover:shadow-md transition-all duration-300">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 pr-2">
                                                <p className="font-bold text-[13px] text-stone-800 leading-tight">{item.name}</p>
                                                {item.options && (
                                                    <p className="text-[10px] text-stone-400 font-bold mt-1 leading-tight">{item.options}</p>
                                                )}
                                            </div>
                                            <p className="font-black text-[#861b00] text-right shrink-0 text-base">฿{item.price}</p>
                                        </div>

                                        <div className="flex items-center justify-end gap-3">
                                            <button
                                                onClick={() => setCart(cart.map((c, i) => i === idx ? { ...c, qty: Math.max(0, c.qty - 1) } : c).filter(c => c.qty > 0))}
                                                className="w-9 h-9 flex items-center justify-center bg-white rounded-xl shadow-sm border border-stone-100 text-stone-500 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-90 shrink-0"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">remove</span>
                                            </button>
                                            <span className="font-black text-sm w-6 text-center text-stone-700">{item.qty}</span>
                                            <button
                                                onClick={() => setCart(cart.map((c, i) => i === idx ? { ...c, qty: c.qty + 1 } : c))}
                                                className="w-9 h-9 flex items-center justify-center bg-white rounded-xl shadow-sm border border-stone-100 text-stone-500 hover:text-[#861b00] hover:bg-amber-50 transition-colors active:scale-90 shrink-0"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">add</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="pt-4 border-t border-stone-100 mt-auto bg-white shrink-0">
                            <div className="grid grid-cols-2 gap-3 mb-4 px-1">
                                <button
                                    onClick={() => { setIsCartOpen(false); setIsHeldBillsOpen(true); }}
                                    className="py-3 rounded-2xl border-2 border-stone-200 text-stone-600 font-bold text-[11px] flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors relative active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[16px]">list_alt</span> ดึงบิล
                                    {heldBills.length > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm font-black">
                                            {heldBills.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={handleHoldBill}
                                    disabled={cart.length === 0}
                                    className={`py-3 rounded-2xl border-2 font-bold text-[11px] flex items-center justify-center gap-2 transition-colors active:scale-95 ${cart.length === 0
                                        ? 'border-stone-100 text-stone-300 cursor-not-allowed'
                                        : 'border-amber-200 text-amber-600 hover:bg-amber-50 shadow-sm'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">pause_circle</span> พักบิล
                                </button>
                            </div>

                            <div className="flex justify-between items-end mb-4 px-2">
                                <span className="font-bold text-stone-400 text-[10px] uppercase tracking-widest">ยอดรวมสุทธิ</span>
                                <span className="font-black text-3xl text-[#861b00]">฿{subtotal.toLocaleString()}</span>
                            </div>
                            <button
                                onClick={() => {
                                    if (cart.length === 0) return alert('ตะกร้าว่างเปล่า กรุณาเลือกสินค้าก่อนครับ');
                                    setIsCheckoutOpen(true);
                                }}
                                className={`w-full py-4 font-black rounded-[1.5rem] shadow-[0_10px_20px_-5px_rgba(134,27,0,0.3)] transition-all flex items-center justify-center gap-2 text-lg active:scale-95 ${cart.length === 0
                                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                                    : 'bg-[#861b00] text-white hover:bg-black hover:shadow-xl'
                                    }`}
                                disabled={cart.length === 0}
                            >
                                <span className="material-symbols-outlined text-[20px]">payments</span>
                                {cart.length === 0 ? 'เลือกสินค้า' : 'ไปหน้าชำระเงิน'}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* 🔴🌟 Options Modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-stone-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] p-4 sm:p-6 max-w-[320px] sm:max-w-md w-full relative z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                        <div className="flex justify-between items-start mb-4 shrink-0 border-b border-stone-50 pb-2">
                            <div>
                                <h3 className="font-black text-2xl text-[#861b00] leading-tight font-headline">
                                    {selectedItem.name_th || selectedItem.name}
                                </h3>
                                <p className="text-xs font-bold text-stone-400 mt-1">Base Price: ฿{selectedItem.price}</p>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="w-7 h-7 flex justify-center items-center bg-stone-100 text-stone-400 rounded-full hover:bg-stone-200 transition-colors shrink-0">
                                <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                        </div>

                        <div className="flex flex-col space-y-4 pb-2 overflow-y-auto no-scrollbar">
                            {optionGroups?.filter(og => og.applyTo.includes(selectedItem.cat)).map(group => (
                                <div key={group.id}>
                                    <label className="text-[10px] font-bold text-stone-400 mb-2 block tracking-widest">{group.name}</label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {group.choices.map((choice, idx) => {
                                            const isSelected = tempOptions[group.id]?.n === choice.n;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => setTempOptions({ ...tempOptions, [group.id]: choice })}
                                                    className={`py-2 px-1 text-[10px] sm:text-[11px] font-bold rounded-lg border-2 transition-all flex flex-col items-center justify-center active:scale-95 ${isSelected
                                                        ? 'bg-[#861b00]/10 text-[#861b00] border-[#861b00]'
                                                        : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                                                        }`}
                                                >
                                                    <span className="text-center line-clamp-1">{choice.n}</span>
                                                    {choice.p !== 0 && (
                                                        <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-[#861b00]' : 'text-stone-400'}`}>
                                                            ({choice.p > 0 ? '+' : ''}{choice.p}฿)
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            <div className="flex flex-col sm:flex-row gap-3 mt-2">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-stone-400 mb-1 block tracking-widest">หมายเหตุ</label>
                                    <input
                                        type="text"
                                        value={tempNote}
                                        onChange={(e) => setTempNote(e.target.value)}
                                        placeholder="เช่น ไม่หวาน"
                                        className="w-full p-2.5 border-2 border-stone-200 rounded-lg text-xs font-bold outline-none focus:border-[#861b00] text-stone-700 transition-colors"
                                    />
                                </div>
                                <div className="shrink-0 w-full sm:w-[120px]">
                                    <label className="text-[10px] font-bold text-stone-400 mb-1 block tracking-widest invisible sm:visible">จำนวน</label>
                                    <div className="flex items-center justify-between border-2 border-stone-100 p-1 rounded-lg bg-stone-50/50">
                                        <button onClick={() => setTempQty(Math.max(1, tempQty - 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border border-stone-200 text-stone-600 hover:text-[#861b00] font-black text-xl active:scale-95 shrink-0 transition-colors">-</button>
                                        <span className="text-xl font-black text-stone-800 flex-1 text-center">{tempQty}</span>
                                        <button onClick={() => setTempQty(tempQty + 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border border-stone-200 text-stone-600 hover:text-[#861b00] font-black text-xl active:scale-95 shrink-0 transition-colors">+</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-stone-200 border-dashed shrink-0 flex flex-col gap-3 mt-1">
                            <div className="flex justify-between items-end px-1">
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Total Price</span>
                                <span className="text-3xl font-black text-[#861b00] leading-none tracking-tighter">
                                    ฿{((selectedItem.price + Object.values(tempOptions).reduce((s, o) => s + (o.p || 0), 0)) * tempQty).toLocaleString()}
                                </span>
                            </div>

                            <button
                                onClick={() => addToCart(selectedItem, tempOptions, tempQty, tempNote)}
                                className="w-full py-3 bg-[#861b00] hover:bg-[#6a1500] text-white text-[14px] font-black rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                                ADD TO CART
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🟣 Checkout Modal */}
            {isCheckoutOpen && (
                <CheckoutModal
                    onClose={() => {
                        setIsCheckoutOpen(false);
                        setIsCartOpen(false);
                    }}
                />
            )}

            {/* 🟠 Held Bills Modal */}
            {isHeldBillsOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setIsHeldBillsOpen(false)} />
                    <div className="bg-white rounded-[2rem] p-6 max-w-md w-full relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-2xl text-[#861b00] flex items-center gap-2">
                                <span className="material-symbols-outlined text-[28px]">receipt_long</span> รายการพักบิล ({heldBills.length})
                            </h3>
                            <button onClick={() => setIsHeldBillsOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700 transition-colors"><span className="material-symbols-outlined text-lg">close</span></button>
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
                            {heldBills.length === 0 ? (
                                <div className="text-center py-10 flex flex-col items-center justify-center text-stone-300">
                                    <span className="material-symbols-outlined text-6xl mb-3">inbox</span>
                                    <p className="font-bold text-base">ไม่มีรายการพักบิล</p>
                                </div>
                            ) : (
                                heldBills.map(bill => (
                                    <div key={bill.id} className="border-2 border-stone-100 bg-stone-50 rounded-2xl p-4 flex justify-between items-center hover:border-amber-300 transition-colors group">
                                        <div>
                                            <p className="font-bold text-[15px] text-stone-800 flex items-center gap-2">
                                                บิล {bill.id}
                                                <span className="text-[10px] bg-stone-200 text-stone-600 px-2.5 py-0.5 rounded-md font-black">{bill.time} น.</span>
                                            </p>
                                            <p className="text-xs text-stone-500 font-bold mt-1.5">{bill.items.length} รายการ (฿{bill.total.toLocaleString()})</p>
                                        </div>
                                        <button
                                            onClick={() => handleRestoreBill(bill)}
                                            className="bg-white border-2 border-stone-200 text-[#861b00] px-5 py-3 rounded-xl text-[13px] font-black hover:bg-[#861b00] hover:text-white transition-all shadow-sm group-hover:border-[#861b00] active:scale-95"
                                        >
                                            ดึงบิลนี้
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}