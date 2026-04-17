import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

export default function LoginPage() {
    const [pin, setPin] = useState('');
    const { employees, setCurrentEmployee } = useContext(AppContext);
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();

        // เช็คว่ารหัสที่พิมพ์เข้ามาคือ 1234 ใช่หรือไม่?
        if (pin === '1234') {
            // 1. บันทึกกุญแจว่า "ล็อคอินแล้ว"
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', 'admin');

            // 2. สั่งให้เด้งเข้าไปที่หน้า Admin
            navigate('/admin');
        } else {
            // ถ้ารหัสผิด ให้แจ้งเตือนและล้างช่องพิมพ์
            alert('รหัสผ่านไม่ถูกต้อง! (รหัสสำหรับทดสอบคือ 1234 ครับ)');
            setPin('');
        }
    };
    return (
        <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-body">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full text-center border-4 border-white">
                <div className="w-20 h-20 bg-[#861b00] rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg transform -rotate-6">
                    <span className="text-white font-black text-4xl">S</span>
                </div>
                <h1 className="text-2xl font-black text-stone-800 font-headline mb-2">SRI BROWN</h1>
                <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-8">POS Engine v1.0</p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="relative">
                        <input
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder="กรอกรหัสพนักงาน"
                            className="w-full p-4 bg-stone-50 border-2 border-stone-100 rounded-2xl text-center text-2xl font-black tracking-[1em] outline-none focus:border-[#861b00] transition-colors"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-4 bg-[#861b00] text-white font-black rounded-2xl shadow-lg hover:bg-black transition-all active:scale-95"
                    >
                        เข้าสู่ระบบ
                    </button>
                </form>

                <p className="mt-8 text-[10px] text-stone-300 font-bold uppercase">Authorized Personnel Only</p>
            </div>
        </div>
    );
}