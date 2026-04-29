import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { fetchJSON } from '../api.js';

// --- 🐈 Minimal Pixel Cat Component (คงเดิม) ---
const PixelCat = ({ progress, status }) => {
    const xPos = (progress / 6) * 100;
    return (
        <div className="relative w-full h-16 mb-2 pointer-events-none">
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-stone-200">
                <div className="flex justify-between w-full -top-1 absolute px-1">
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-sm ${i <= progress ? 'bg-[#861b00]' : 'bg-stone-200'} transition-colors duration-300`} />
                    ))}
                </div>
            </div>
            <div className="absolute bottom-1 transition-all duration-500 ease-out" style={{ left: `calc(${xPos}% - 24px)` }}>
                <div className={`relative ${status === 'SUCCESS' ? 'animate-bounce' : status === 'FAILURE' ? 'animate-shake' : 'animate-pixel-float'}`}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
                        <rect x="5" y="5" width="3" height="3" fill="#1a1a1a" />
                        <rect x="16" y="5" width="3" height="3" fill="#1a1a1a" />
                        <rect x="6" y="8" width="12" height="10" fill="#1a1a1a" />
                        <rect x="6" y="16" width="12" height="2" fill="#861b00" />
                        <rect x="11" y="17" width="2" height="2" fill="#ffd700" />
                        <rect x="8" y="11" width="2" height="2" fill={status === 'FAILURE' ? '#ff4444' : 'white'} />
                        <rect x="14" y="11" width="2" height="2" fill={status === 'FAILURE' ? '#ff4444' : 'white'} />
                        <rect x="2" y="13" width="4" height="2" fill="#1a1a1a" />
                    </svg>
                    {status === 'SUCCESS' && <span className="absolute -top-6 left-6 text-[10px] font-black text-emerald-500 font-mono tracking-tighter">MEOW!</span>}
                    {status === 'FAILURE' && <span className="absolute -top-6 left-6 text-[10px] font-black text-red-500 font-mono tracking-tighter">HUH?</span>}
                </div>
            </div>
        </div>
    );
};

export default function LoginPage() {
    const [pin, setPin] = useState('');
    const [status, setStatus] = useState('IDLE');
    const { setCurrentEmployee } = useContext(AppContext);
    const navigate = useNavigate();

    // 🌟 1. ดักจับการพิมพ์จากคีย์บอร์ดจริง (Macbook / Windows)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (status !== 'IDLE') return; // บล็อคการพิมพ์ตอนกำลังโหลด
            if (e.key >= '0' && e.key <= '9') {
                if (pin.length < 6) setPin(prev => prev + e.key);
            } else if (e.key === 'Backspace') {
                setPin(prev => prev.slice(0, -1));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pin, status]);

    // 🌟 2. ดักจับการกดจาก On-screen Numpad (iPad / Touch Screen)
    const handlePadClick = (val) => {
        if (status !== 'IDLE') return;
        if (val === 'C') setPin('');
        else if (val === 'DEL') setPin(prev => prev.slice(0, -1));
        else if (pin.length < 6) setPin(prev => prev + val);
    };

    // 🌟 3. Auto Login เมื่อครบ 6 หลัก
    useEffect(() => {
        const attemptLogin = async () => {
            try {
                const data = await fetchJSON('/employees/login', {
                    method: 'POST',
                    body: JSON.stringify({ pin })
                });

                setStatus('SUCCESS');
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userRole', data.employee.role);
                setCurrentEmployee(data.employee);

                setTimeout(() => navigate('/admin'), 1000);
            } catch (error) {
                setStatus('FAILURE');
                setTimeout(() => {
                    setPin('');
                    setStatus('IDLE');
                }, 1000);
            }
        };

        if (pin.length === 6 && status === 'IDLE') {
            attemptLogin();
        }
    }, [pin, status, setCurrentEmployee, navigate]);

    return (
        <div className="min-h-screen bg-[#fafaf5] flex items-center justify-center p-4 font-body relative overflow-hidden">
            {/* พื้นหลัง */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/pinstriped-suit.png")' }} />
            <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/coffee-beans.png")', backgroundSize: '100px' }} />

            <style>{`
                @keyframes pixel-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
                @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
                .animate-pixel-float { animation: pixel-float 1.5s infinite steps(2); }
                .animate-shake { animation: shake 0.2s infinite; }
            `}</style>

            <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl max-w-[340px] w-full text-center border border-stone-100 relative z-10">

                {/* 🐈 แมวและโลโก้ */}
                <PixelCat progress={pin.length} status={status} />
                <div className="mb-6 mt-4">
                    <div className="w-16 h-16 mx-auto mb-3 transform -rotate-3 transition-transform hover:rotate-0 duration-300">
                        <img
                            src="/sribrown-logo-(brown).jpg"
                            alt="Sri Brown Logo"
                            className="w-full h-full object-cover rounded-2xl shadow-lg border-2 border-white/50"
                        />
                    </div>
                    <h1 className="text-lg font-black text-stone-800 font-headline tracking-tighter leading-none">SRI BROWN</h1>
                    <p className="text-[8px] text-[#861b00] font-black uppercase tracking-[0.3em] opacity-40 mt-1">Coffee Roastery</p>
                </div>

                {/* 🌟 จุดแสดงสถานะ 6 หลัก (ดึงออกจากการเป็น Input) */}
                <div className="flex justify-center gap-3 mb-8 h-6 items-center">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${i < pin.length
                                ? 'bg-[#861b00] border-[#861b00] scale-125 shadow-md'
                                : 'bg-transparent border-stone-200'
                                } ${status === 'FAILURE' ? 'bg-red-500 border-red-500 scale-100' : ''}`}
                        />
                    ))}
                </div>

                {/* 🌟 On-Screen Numpad สำหรับ iPad/Tablet */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                        <button
                            key={num}
                            onClick={() => handlePadClick(num)}
                            className="bg-stone-50 hover:bg-stone-100 text-stone-700 font-black text-xl py-3.5 rounded-2xl border border-stone-100/50 active:scale-95 transition-all focus:outline-none"
                        >
                            {num === 'DEL' ? <span className="material-symbols-outlined text-[20px] mt-1">backspace</span> : num}
                        </button>
                    ))}
                </div>

                <div className="h-[1px] w-12 bg-stone-100 mx-auto mb-3" />
                <p className="text-[9px] text-stone-300 font-medium italic">Authorized Personnel Only</p>
            </div>
        </div>
    );
}