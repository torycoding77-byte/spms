'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, MENU_KEY_TO_HREF } from '@/store/useAuthStore';
import LoginPage from './LoginPage';
import Sidebar from './Sidebar';
import SupabaseProvider from './SupabaseProvider';
import ToastContainer from './Toast';

// pathname → menuKey 역변환
const HREF_TO_MENU = Object.fromEntries(
  Object.entries(MENU_KEY_TO_HREF).map(([k, v]) => [v, k])
);

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, checkSession, getAccessibleMenus, getDefaultRoute } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkSession();
    setHydrated(true);
  }, [checkSession]);

  // 접근 불가 페이지 → 기본 라우트로 리다이렉트
  useEffect(() => {
    if (!hydrated || !isLoggedIn) return;
    const menuKey = HREF_TO_MENU[pathname];
    if (menuKey) {
      const accessible = getAccessibleMenus();
      if (!accessible.includes(menuKey as any)) {
        router.replace(getDefaultRoute());
      }
    }
  }, [hydrated, isLoggedIn, pathname, router, getAccessibleMenus, getDefaultRoute]);

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
