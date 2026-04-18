import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { fetchJSON } from '../api.js';

export default function LoginPage() {
    const [pin, setPin] = useState('');
    const { employees, setCurrentEmployee } = useContext(AppContext);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const data = await fetchJSON('/employees/login', {
                method: 'POST',
                body: JSON.stringify({ pin })
            });

            // 1. บันทึกกุญแจว่า "ล็อคอินแล้ว" พร้อมรับ role จากเซิร์ฟเวอร์
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', data.employee.role);
            
            // เซฟข้อมูลพนักงานปัจจุบันเข้าไปใน Context ด้วย
            setCurrentEmployee(data.employee);

            // 2. สั่งให้เด้งเข้าไปที่หน้า Admin
            navigate('/admin');
        } catch (error) {
            // ถ้ารหัสผิด ให้แจ้งเตือนและล้างช่องพิมพ์
            alert(error.message || 'รหัสผ่านไม่ถูกต้อง!');
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