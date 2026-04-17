import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 1. นำเข้า AppProvider (ตัวกระจายข้อมูล)
import { AppProvider } from './context/AppContext';

// 2. นำเข้าหน้าจอต่างๆ
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* หน้าแรกสุดคือหน้า Login */}
          <Route path="/" element={<LoginPage />} />

          {/* หน้า Admin ที่มีการเช็คสิทธิ์ (Auth Guard) */}
          <Route
            path="/admin"
            element={
              localStorage.getItem('isLoggedIn') === 'true'
                ? <AdminPage />
                : <Navigate to="/" replace />
            }
          />

          {/* เผื่อคนพิมพ์ URL มั่วๆ ให้เด้งกลับไปหน้า Login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}