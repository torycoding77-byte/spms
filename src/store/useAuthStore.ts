'use client';

import { create } from 'zustand';

export type UserRole = 'admin' | 'housekeeper' | 'frontdesk';

export interface UserAccount {
  id: string;
  pw: string;
  name: string;
  role: UserRole;
}

// 메뉴 경로 키
export type MenuKey =
  | 'dashboard' | 'reservations' | 'timeline' | 'upload'
  | 'rooms' | 'housekeeping' | 'maintenance' | 'expenses'
  | 'crm' | 'settlement' | 'reports' | 'settings';

export const MENU_KEY_TO_HREF: Record<MenuKey, string> = {
  dashboard: '/',
  reservations: '/reservations',
  timeline: '/timeline',
  upload: '/upload',
  rooms: '/rooms',
  housekeeping: '/housekeeping',
  maintenance: '/maintenance',
  expenses: '/expenses',
  crm: '/crm',
  settlement: '/settlement',
  reports: '/reports',
  settings: '/settings',
};

export const MENU_LABELS: Record<MenuKey, string> = {
  dashboard: '대시보드',
  reservations: '예약 관리',
  timeline: '예약 타임라인',
  upload: '엑셀 업로드',
  rooms: '객실 관리',
  housekeeping: '하우스키핑',
  maintenance: '유지보수',
  expenses: '지출 관리',
  crm: '고객 관리',
  settlement: '정산 보고서',
  reports: '월간 리포트',
  settings: '설정',
};

export const ALL_MENU_KEYS: MenuKey[] = Object.keys(MENU_KEY_TO_HREF) as MenuKey[];

export type RolePermissions = Record<UserRole, MenuKey[]>;

// 기본 권한 설정
const DEFAULT_PERMISSIONS: RolePermissions = {
  admin: [...ALL_MENU_KEYS],
  housekeeper: ['housekeeping'],
  frontdesk: ['dashboard', 'reservations', 'timeline', 'rooms', 'housekeeping', 'crm'],
};

const DEFAULT_ACCOUNTS: UserAccount[] = [
  { id: 'admin', pw: 'flamingo2024', name: '관리자', role: 'admin' },
  { id: 'cleaning', pw: 'cleaning2024', name: '청소팀', role: 'housekeeper' },
  { id: 'front', pw: 'front2024', name: '프론트', role: 'frontdesk' },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  housekeeper: '청소담당자',
  frontdesk: '프론트데스크',
};

const SESSION_KEY = 'flamingo_auth';
const PERMISSIONS_KEY = 'flamingo_permissions';
const ACCOUNTS_KEY = 'flamingo_accounts';

function loadPermissions(): RolePermissions {
  try {
    const raw = localStorage.getItem(PERMISSIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* use defaults */ }
  return { ...DEFAULT_PERMISSIONS };
}

function savePermissions(p: RolePermissions) {
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(p));
}

function loadAccounts(): UserAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* use defaults */ }
  return [...DEFAULT_ACCOUNTS];
}

function saveAccountsToStorage(accounts: UserAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

interface AuthState {
  isLoggedIn: boolean;
  adminName: string;
  role: UserRole;
  permissions: RolePermissions;
  accounts: UserAccount[];

  login: (id: string, password: string) => boolean;
  logout: () => void;
  checkSession: () => void;

  // 권한 관리 (admin 전용)
  updatePermissions: (role: UserRole, menus: MenuKey[]) => void;
  hasAccess: (menuKey: MenuKey) => boolean;
  getAccessibleMenus: () => MenuKey[];
  getDefaultRoute: () => string;

  // 계정 관리
  updateAccount: (idx: number, account: UserAccount) => void;
  addAccount: (account: UserAccount) => void;
  removeAccount: (idx: number) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  adminName: '',
  role: 'admin',
  permissions: DEFAULT_PERMISSIONS,
  accounts: DEFAULT_ACCOUNTS,

  login: (id, password) => {
    const accounts = loadAccounts();
    const account = accounts.find((a) => a.id === id && a.pw === password);
    if (account) {
      const perms = loadPermissions();
      const session = { loggedIn: true, adminName: account.name, role: account.role, ts: Date.now() };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      set({
        isLoggedIn: true,
        adminName: account.name,
        role: account.role,
        permissions: perms,
        accounts,
      });
      return true;
    }
    return false;
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    set({ isLoggedIn: false, adminName: '', role: 'admin' });
  },

  checkSession: () => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        if (session.loggedIn) {
          const perms = loadPermissions();
          const accounts = loadAccounts();
          set({
            isLoggedIn: true,
            adminName: session.adminName || '관리자',
            role: session.role || 'admin',
            permissions: perms,
            accounts,
          });
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  },

  updatePermissions: (role, menus) => {
    // admin의 settings 권한은 제거 불가 (잠금 방지)
    const finalMenus = role === 'admin'
      ? Array.from(new Set([...menus, 'settings' as MenuKey]))
      : menus;

    set((state) => {
      const updated = { ...state.permissions, [role]: finalMenus };
      savePermissions(updated);
      return { permissions: updated };
    });
  },

  hasAccess: (menuKey) => {
    const { role, permissions } = get();
    return permissions[role]?.includes(menuKey) ?? false;
  },

  getAccessibleMenus: () => {
    const { role, permissions } = get();
    return permissions[role] || [];
  },

  getDefaultRoute: () => {
    const menus = get().getAccessibleMenus();
    if (menus.length === 0) return '/';
    return MENU_KEY_TO_HREF[menus[0]];
  },

  updateAccount: (idx, account) => {
    set((state) => {
      const updated = [...state.accounts];
      updated[idx] = account;
      saveAccountsToStorage(updated);
      return { accounts: updated };
    });
  },

  addAccount: (account) => {
    set((state) => {
      const updated = [...state.accounts, account];
      saveAccountsToStorage(updated);
      return { accounts: updated };
    });
  },

  removeAccount: (idx) => {
    set((state) => {
      const updated = state.accounts.filter((_, i) => i !== idx);
      saveAccountsToStorage(updated);
      return { accounts: updated };
    });
  },
}));
