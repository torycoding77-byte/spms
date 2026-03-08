'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, CalendarDays, Upload, BedDouble,
  Receipt, Users, ChevronLeft, ChevronRight, Wrench,
  BarChart3, Settings, Menu, X, Calculator, ClipboardList, LogOut
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';

const NAV_ITEMS = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/reservations', label: '예약 관리', icon: ClipboardList },
  { href: '/timeline', label: '예약 타임라인', icon: CalendarDays },
  { href: '/upload', label: '엑셀 업로드', icon: Upload },
  { href: '/rooms', label: '객실 관리', icon: BedDouble },
  { href: '/maintenance', label: '유지보수', icon: Wrench },
  { href: '/expenses', label: '지출 관리', icon: Receipt },
  { href: '/crm', label: '고객 관리', icon: Users },
  { href: '/settlement', label: '정산 보고서', icon: Calculator },
  { href: '/reports', label: '월간 리포트', icon: BarChart3 },
  { href: '/settings', label: '설정', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useStore();
  const { logout, adminName } = useAuthStore();

  return (
    <>
      {/* Mobile top bar */}
      <div
        onClick={() => setSidebarOpen(true)}
        className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 bg-white/95 backdrop-blur border-b shadow-sm md:hidden cursor-pointer active:bg-gray-50"
      >
        <div className="p-1.5 bg-gray-900 text-white rounded-lg">
          <Menu size={18} />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-900">
            {NAV_ITEMS.find((item) => item.href === pathname)?.label || 'Flamingo'}
          </h1>
          <p className="text-[10px] text-gray-400">메뉴 열기</p>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-gray-900 text-white transition-all duration-300 z-50',
          'max-md:translate-x-[-100%] max-md:w-60',
          sidebarOpen && 'max-md:translate-x-0',
          sidebarOpen ? 'md:w-60' : 'md:w-16'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {sidebarOpen && (
            <div>
              <h1 className="text-lg font-bold text-pink-400">Flamingo</h1>
              <p className="text-xs text-gray-400">One Hotel PMS</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-gray-700 rounded"
          >
            {sidebarOpen ? <ChevronLeft size={18} className="hidden md:block" /> : <ChevronRight size={18} />}
            <X size={18} className="md:hidden" />
          </button>
        </div>

        <nav className="mt-4 flex flex-col gap-1 px-2 overflow-y-auto flex-1" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm',
                  isActive
                    ? 'bg-pink-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-2 pb-4 border-t border-gray-700 pt-3">
          {sidebarOpen && (
            <p className="px-3 text-xs text-gray-500 mb-2">{adminName}</p>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm text-gray-400 hover:bg-gray-800 hover:text-white w-full"
          >
            <LogOut size={20} />
            {sidebarOpen && <span>로그아웃</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
