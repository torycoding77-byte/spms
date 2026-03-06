'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import LoginPage from './LoginPage';
import Sidebar from './Sidebar';
import SupabaseProvider from './SupabaseProvider';
import ToastContainer from './Toast';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, checkSession } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    checkSession();
    setHydrated(true);
  }, [checkSession]);

  // SSR 하이드레이션 불일치 방지
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  return (
    <SupabaseProvider>
      <Sidebar />
      <main className="md:ml-60 transition-all duration-300 p-4 md:p-6 pt-16 md:pt-6">
        {children}
      </main>
      <ToastContainer />
    </SupabaseProvider>
  );
}
