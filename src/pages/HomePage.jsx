import { Link } from 'react-router-dom';

export default function HomePage() {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-background gap-6">
            <div className="text-center">
                <h1 className="text-4xl font-black text-primary font-headline mb-2">SRI BROWN</h1>
                <p className="text-stone-500 font-bold tracking-widest uppercase text-sm">System Portal</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/member" className="px-6 py-4 bg-white border-2 border-stone-100 shadow-sm rounded-2xl font-bold text-stone-700 hover:border-primary hover:text-primary transition-colors text-center">
                    เข้าสู่ระบบ Member
                </Link>
                <Link to="/staff" className="px-6 py-4 bg-white border-2 border-stone-100 shadow-sm rounded-2xl font-bold text-stone-700 hover:border-primary hover:text-primary transition-colors text-center">
                    เข้าสู่ระบบ Staff
                </Link>
                <Link to="/admin" className="px-6 py-4 bg-stone-800 border-2 border-stone-800 shadow-md rounded-2xl font-bold text-white hover:bg-black transition-colors text-center">
                    เข้าสู่ระบบ POS / Admin
                </Link>
            </div>
        </div>
    );
}