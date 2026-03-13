'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, CalendarDays, Upload, BedDouble,
  Receipt, Users, ChevronLeft, ChevronRight, Wrench,
  BarChart3, Settings, Menu, X, Calculator, ClipboardList, LogOut, SprayCan
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuthStore, MENU_KEY_TO_HREF, MENU_LABELS } from '@/store/useAuthStore';
import type { MenuKey } from '@/store/useAuthStore';

const MENU_ICONS: Record<MenuKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  reservations: ClipboardList,
  timeline: CalendarDays,
  upload: Upload,
  rooms: BedDouble,
  housekeeping: SprayCan,
  maintenance: Wrench,
  expenses: Receipt,
  crm: Users,
  settlement: Calculator,
  reports: BarChart3,
  settings: Settings,
};

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useStore();
  const { logout, adminName, getAccessibleMenus } = useAuthStore();

  const accessibleMenus = getAccessibleMenus();
  const navItems = accessibleMenus.map((key) => ({
    href: MENU_KEY_TO_HREF[key],
    label: MENU_LABELS[key],
    icon: MENU_ICONS[key],
  }));

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
            {navItems.find((item) => item.href === pathname)?.label || 'Flamingo'}
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
          'fixed left-0 top-0 h-full bg-gray-900 text-white z-50 w-60',
          'transition-transform duration-300 md:transition-[width] md:duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
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
          {navItems.map((item) => {
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
