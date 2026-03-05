'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, CalendarDays, Upload, BedDouble,
  Receipt, Users, ChevronLeft, ChevronRight, Wrench,
  BarChart3, Settings, Menu, X, Calculator
} from 'lucide-react';
import { useStore } from '@/store/useStore';

const NAV_ITEMS = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
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

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-40 p-2 bg-gray-900 text-white rounded-lg md:hidden"
      >
        <Menu size={20} />
      </button>

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

        <nav className="mt-4 flex flex-col gap-1 px-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
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
      </aside>
    </>
  );
}
