import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import CheckoutModal from './CheckoutModal';
import logo from '/sribrown logo (brown).jpg';

export default function PosTab() {
    const { categories, menuItems, optionGroups, cart, setCart, shift, setShift } = useContext(AppContext);

    const [activeCategory, setActiveCategory] = useState(categories[0]?.id || '');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null); // สำหรับเก็บเมนูที่กำลังเลือกออปชัน
    const [tempOptions, setTempOptions] = useState({}); // เก็บค่าออปชันที่เลือกชั่วคราวใน Modal
    const [heldBills, setHeldBills] = useState([]);
    const [isHeldBillsOpen, setIsHeldBillsOpen] = useState(false);

    // 1. ฟังก์ชันคำนวณเงินในตะกร้า
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    // 2. เมื่อคลิกที่เมนู (แทนที่จะเพิ่มเลย ให้เปิด Modal ก่อน)
    const handleItemClick = (item) => {
        const itemOptions = optionGroups.filter(og => og.applyTo.includes(item.cat));
        if (itemOptions.length > 0) {
            setSelectedItem(item);
            // ตั้งค่าเริ่มต้นให้ออปชัน (เลือกตัวแรกของแต่ละกลุ่ม)
            const initial = {};
            itemOptions.forEach(og => initial[og.id] = og.choices[0]);
            setTempOptions(initial);
        } else {
            addToCart(item, {});
        }
    };

    const addToCart = (item, options, qty = 1) => {
        // สร้างชื่อรายการที่มีออปชันต่อท้าย เพื่อแยกรายการในตะกร้า
        const optionText = Object.values(options).map(o => o.n).join(', ');
        const cartKey = `${item.id}-${optionText}`;

        const extraPrice = Object.values(options).reduce((s, o) => s + o.p, 0);
        const finalPrice = item.price + extraPrice;

        const existing = cart.find(c => c.cartKey === cartKey);
        if (existing) {
            setCart(cart.map(c => c.cartKey === cartKey ? { ...c, qty: c.qty + qty } : c));
        } else {
            setCart([...cart, { ...item, cartKey, options: optionText, price: finalPrice, qty }]);
        }
        setSelectedItem(null); // ปิด Modal
    };

    //โค้ดพักบิล/ดึงบิล
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

            {/* 🟢 Floating Cart Button (ปุ่มลอย) */}
            <button
                onClick={() => setIsCartOpen(true)}
                className="fixed bottom-8 right-8 z-40 bg-primary text-white px-6 py-4 rounded-[2rem] shadow-xl flex items-center gap-4 border-4 border-white hover:scale-105 transition-transform"
            >
                <div className="relative">
                    <span className="material-symbols-outlined text-2xl">shopping_basket</span>
                    <span className="absolute -top-2 -right-3 bg-emerald-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                        {cart.reduce((s, c) => s + c.qty, 0)}
                    </span>
                </div>
                <span className="font-black text-xl border-l border-white/30 pl-4">฿{subtotal.toLocaleString()}</span>
            </button>

            {/* 🔵 Cart Sidebar (แถบตะกร้าสินค้า) */}
            {isCartOpen && (
                <>
                    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 transition-opacity duration-300" onClick={() => setIsCartOpen(false)} />
                    <div className="fixed top-4 right-4 bottom-4 w-full max-w-[400px] bg-white z-50 rounded-[2.5rem] shadow-2xl p-6 flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Header ตะกร้า */}
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-stone-100">
                            <div>
                                <h3 className="font-black text-2xl text-[#861b00] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[28px]">shopping_basket</span> ตะกร้าสินค้า
                                </h3>
                                <p className="text-[10px] text-stone-400 font-bold mt-1 uppercase tracking-wider">
                                    {cart.reduce((s, c) => s + c.qty, 0)} รายการในตะกร้า
                                </p>
                            </div>
                            <button onClick={() => setIsCartOpen(false)} className="w-10 h-10 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center hover:bg-stone-200 hover:text-stone-600 transition-colors active:scale-95">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* รายการสินค้าในตะกร้า */}
                        <div className="flex-1 overflow-y-auto space-y-3 mb-4 no-scrollbar">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-stone-300 opacity-50">
                                    <span className="material-symbols-outlined text-6xl mb-2">shopping_bag</span>
                                    <p className="font-bold text-sm">ยังไม่มีสินค้าในตะกร้า</p>
                                </div>
                            ) : (
                                cart.map((item, idx) => (
                                    <div key={item.cartKey} className="group bg-stone-50 hover:bg-white p-4 rounded-3xl flex flex-col gap-3 border border-transparent hover:border-[#861b00]/20 hover:shadow-md transition-all duration-300">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <p className="font-bold text-sm text-stone-800">{item.name}</p>
                                                {item.options && (
                                                    <p className="text-[10px] text-stone-400 font-bold mt-0.5 leading-tight">{item.options}</p>
                                                )}
                                            </div>
                                            <p className="font-black text-[#861b00] text-right ml-2 shrink-0">฿{item.price}</p>
                                        </div>

                                        {/* ปุ่มเพิ่ม/ลด จำนวนแบบมินิมอล */}
                                        <div className="flex items-center justify-end gap-3">
                                            <button
                                                onClick={() => setCart(cart.map((c, i) => i === idx ? { ...c, qty: Math.max(0, c.qty - 1) } : c).filter(c => c.qty > 0))}
                                                className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">remove</span>
                                            </button>
                                            <span className="font-black text-sm w-6 text-center text-stone-700">{item.qty}</span>
                                            <button
                                                onClick={() => setCart(cart.map((c, i) => i === idx ? { ...c, qty: c.qty + 1 } : c))}
                                                className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-stone-400 hover:text-[#861b00] hover:bg-amber-50 transition-colors active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">add</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* ส่วนสรุปยอดและปุ่มชำระเงิน */}
                        <div className="pt-4 border-t border-stone-100 mt-auto bg-white z-10 pb-2">

                            {/* 🌟 แถบปุ่ม พักบิล / ดึงบิล */}
                            <div className="grid grid-cols-2 gap-3 mb-5 px-1">
                                <button
                                    onClick={() => { setIsCartOpen(false); setIsHeldBillsOpen(true); }}
                                    className="py-3 rounded-2xl border-2 border-stone-200 text-stone-600 font-bold text-xs flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors relative active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[18px]">list_alt</span> ดึงบิล
                                    {/* แจ้งเตือนสีเหลืองถ้ามีบิลพักอยู่ */}
                                    {heldBills.length > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                            {heldBills.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={handleHoldBill}
                                    disabled={cart.length === 0}
                                    className={`py-3 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-colors active:scale-95 ${cart.length === 0
                                        ? 'border-stone-100 text-stone-300 cursor-not-allowed'
                                        : 'border-amber-200 text-amber-600 hover:bg-amber-50 shadow-sm'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">pause_circle</span> พักบิล
                                </button>
                            </div>

                            <div className="flex justify-between items-end mb-5 px-2">
                                <span className="font-bold text-stone-400 text-[11px] uppercase tracking-widest">ยอดรวมสุทธิ</span>
                                <span className="font-black text-4xl text-[#861b00]">฿{subtotal.toLocaleString()}</span>
                            </div>
                            <button
                                onClick={() => {
                                    if (cart.length === 0) return alert('ตะกร้าว่างเปล่า กรุณาเลือกสินค้าก่อนครับ');
                                    setIsCheckoutOpen(true);
                                }}
                                className={`w-full py-5 font-black rounded-2xl shadow-[0_10px_20px_-5px_rgba(134,27,0,0.3)] transition-all flex items-center justify-center gap-2 text-lg active:scale-95 ${cart.length === 0
                                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                                    : 'bg-[#861b00] text-white hover:bg-black hover:shadow-xl'
                                    }`}
                                disabled={cart.length === 0}
                            >
                                <span className="material-symbols-outlined">payments</span>
                                {cart.length === 0 ? 'เลือกสินค้าก่อนชำระเงิน' : 'ไปหน้าชำระเงิน'}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* 🔴 Options Modal (หน้าต่างเลือกออปชัน) */}
            {selectedItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setSelectedItem(null)} />
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full relative z-10 animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-black text-primary mb-6">{selectedItem.name}</h3>

                        <div className="space-y-6 mb-8">
                            {optionGroups.filter(og => og.applyTo.includes(selectedItem.cat)).map(og => (
                                <div key={og.id}>
                                    <label className="text-[10px] font-bold text-stone-400 uppercase mb-3 block">{og.name}</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {og.choices.map(choice => (
                                            <button
                                                key={choice.n}
                                                onClick={() => setTempOptions({ ...tempOptions, [og.id]: choice })}
                                                className={`py-3 rounded-xl border-2 text-[10px] font-bold transition-all ${tempOptions[og.id]?.n === choice.n
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'border-stone-100 text-stone-500 hover:border-stone-200'
                                                    }`}
                                            >
                                                {choice.n}
                                                {choice.p !== 0 && <span className="block opacity-60">({choice.p > 0 ? '+' : ''}{choice.p}฿)</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => addToCart(selectedItem, tempOptions)}
                            className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">add_shopping_cart</span> เพิ่มลงตะกร้า
                        </button>
                    </div>
                </div>
            )}

            {/* 🟡 Main Menu Grid (ของเดิมที่ทำไว้) */}
            <div className="w-full bg-white p-5 rounded-[2.5rem] border border-stone-200 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-2 border-b border-stone-100 shrink-0">
                    {categories.map(c => (
                        <button key={c.id} onClick={() => setActiveCategory(c.id)} className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-bold transition-all ${activeCategory === c.id ? 'bg-stone-800 text-white shadow-md' : 'bg-white text-stone-500 border hover:bg-stone-50'}`}>{c.name}</button>
                    ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 content-start overflow-y-auto no-scrollbar flex-1 pb-24 px-2">
                    {menuItems.filter(m => m.cat === activeCategory).map(item => {
                        // ของเดิมของคุณ: คำนวณจำนวนในตะกร้า
                        const qty = cart.filter(c => c.id === item.id).reduce((s, c) => s + c.qty, 0);

                        return (
                            <button
                                key={item.id}
                                onClick={() => handleItemClick(item)}
                                className="bg-white p-4 rounded-[1.5rem] border border-stone-100 shadow-sm flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_15px_30px_-5px_rgba(134,27,0,0.15)] hover:border-[#861b00]/30 active:scale-95 group relative overflow-hidden min-h-[130px]"
                            >
                                {/* แจ้งเตือนจำนวนในตะกร้า (เก็บของเดิมของคุณไว้ ปรับให้สวยขึ้นนิดนึง) */}
                                {qty > 0 && (
                                    <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-md border-2 border-white z-10 animate-in zoom-in duration-200">
                                        {qty}
                                    </div>
                                )}

                                {/* แถบสีตกแต่งด้านบนของการ์ด */}
                                <div className={`absolute top-0 left-0 w-full h-1.5 ${item.color || 'bg-stone-200'} group-hover:h-2 transition-all`}></div>

                                {/* ไอคอนวงกลมตรงกลาง */}
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner transition-transform duration-300 group-hover:scale-110 mt-2 ${item.color || 'bg-stone-100'}`}>
                                    <span className="material-symbols-outlined text-stone-600 text-[20px]">
                                        {item.cat === 'c1' ? 'coffee' : item.cat === 'c2' ? 'emoji_food_beverage' : 'bakery_dining'}
                                    </span>
                                </div>

                                {/* ชื่อและราคา */}
                                <div className="text-center mt-1 w-full px-1">
                                    <h3 className="font-bold text-stone-700 text-[11px] leading-snug group-hover:text-[#861b00] transition-colors line-clamp-2">
                                        {item.name}
                                    </h3>
                                    <p className="font-black text-[#861b00] mt-1 text-sm group-hover:text-amber-600 transition-colors">
                                        ฿{item.price}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
            {/* 🟣 Checkout Modal (หน้าต่างชำระเงิน) */}
            {isCheckoutOpen && (
                <CheckoutModal
                    onClose={() => {
                        setIsCheckoutOpen(false); // ปิดหน้าจ่ายเงิน
                        setIsCartOpen(false); // ปิดตะกร้าด้วย
                    }}
                />
            )}
            {/* 🟠 Held Bills Modal (หน้าต่างรายการพักบิล) */}
            {isHeldBillsOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setIsHeldBillsOpen(false)} />
                    <div className="bg-white rounded-[2rem] p-6 max-w-md w-full relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-xl text-[#861b00] flex items-center gap-2">
                                <span className="material-symbols-outlined">receipt_long</span> รายการพักบิล ({heldBills.length})
                            </h3>
                            <button onClick={() => setIsHeldBillsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-400 hover:bg-stone-200"><span className="material-symbols-outlined text-sm">close</span></button>
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
                            {heldBills.length === 0 ? (
                                <div className="text-center py-10 flex flex-col items-center justify-center text-stone-300">
                                    <span className="material-symbols-outlined text-5xl mb-2">inbox</span>
                                    <p className="font-bold text-sm">ไม่มีรายการพักบิล</p>
                                </div>
                            ) : (
                                heldBills.map(bill => (
                                    <div key={bill.id} className="border-2 border-stone-100 bg-stone-50 rounded-2xl p-4 flex justify-between items-center hover:border-amber-300 transition-colors group">
                                        <div>
                                            <p className="font-bold text-sm text-stone-800 flex items-center gap-2">
                                                บิล {bill.id}
                                                <span className="text-[9px] bg-stone-200 text-stone-500 px-2 py-0.5 rounded-md">{bill.time} น.</span>
                                            </p>
                                            <p className="text-[10px] text-stone-400 font-bold mt-1">{bill.items.length} รายการ (฿{bill.total.toLocaleString()})</p>
                                        </div>
                                        <button
                                            onClick={() => handleRestoreBill(bill)}
                                            className="bg-white border border-stone-200 text-[#861b00] px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#861b00] hover:text-white transition-all shadow-sm group-hover:border-[#861b00]"
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