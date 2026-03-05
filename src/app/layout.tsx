import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import SupabaseProvider from '@/components/SupabaseProvider';
import ToastContainer from '@/components/Toast';

export const metadata: Metadata = {
  title: 'Flamingo PMS - One Hotel System',
  description: '원호텔 통합 객실관리 시스템',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen">
        <SupabaseProvider>
          <Sidebar />
          <main className="md:ml-60 transition-all duration-300 p-4 md:p-6 pt-16 md:pt-6">
            {children}
          </main>
          <ToastContainer />
        </SupabaseProvider>
      </body>
    </html>
  );
}
