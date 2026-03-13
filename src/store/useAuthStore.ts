'use client';

import { create } from 'zustand';
import {
  fetchStaffAccounts,
  insertStaffAccount,
  updateStaffAccount,
  deleteStaffAccount,
  type StaffAccountRow,
} from '@/lib/supabase-db-v2';

export type UserRole = 'admin' | 'housekeeper' | 'frontdesk';

export interface UserAccount {
  dbId?: string; // Supabase row id
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

function loadAccountsFromStorage(): UserAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* use defaults */ }
  return [...DEFAULT_ACCOUNTS];
}

function saveAccountsToStorage(accounts: UserAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function dbRowToAccount(row: StaffAccountRow): UserAccount {
  return {
    dbId: row.id,
    id: row.login_id,
    pw: row.password,
    name: row.name,
    role: row.role as UserRole,
  };
}

interface AuthState {
  isLoggedIn: boolean;
  adminName: string;
  role: UserRole;
  permissions: RolePermissions;
  accounts: UserAccount[];
  accountsLoaded: boolean;

  login: (id: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkSession: () => void;

  // 권한 관리 (admin 전용)
  updatePermissions: (role: UserRole, menus: MenuKey[]) => void;
  hasAccess: (menuKey: MenuKey) => boolean;
  getAccessibleMenus: () => MenuKey[];
  getDefaultRoute: () => string;

  // 계정 관리 (DB 연동)
  loadAccountsFromDb: () => Promise<void>;
  addAccountToDb: (account: UserAccount) => Promise<boolean>;
  updateAccountInDb: (account: UserAccount) => Promise<boolean>;
  removeAccountFromDb: (account: UserAccount) => Promise<boolean>;

  // localStorage 폴백 (기존 호환)
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
  accountsLoaded: false,

  login: async (id, password) => {
    // DB에서 최신 계정 목록 로드 시도
    let accounts: UserAccount[];
    try {
      const rows = await fetchStaffAccounts();
      if (rows.length > 0) {
        accounts = rows.map(dbRowToAccount);
        saveAccountsToStorage(accounts);
        set({ accounts, accountsLoaded: true });
      } else {
        accounts = loadAccountsFromStorage();
      }
    } catch {
      // DB 연결 실패 시 localStorage 폴백
      accounts = loadAccountsFromStorage();
    }

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
          const accounts = loadAccountsFromStorage();
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

  // DB에서 계정 로드
  loadAccountsFromDb: async () => {
    try {
      const rows = await fetchStaffAccounts();
      if (rows.length > 0) {
        const accounts = rows.map(dbRowToAccount);
        saveAccountsToStorage(accounts);
        set({ accounts, accountsLoaded: true });
        return;
      }
    } catch {
      // DB 연결 실패 → localStorage 폴백
    }
    const accounts = loadAccountsFromStorage();
    set({ accounts, accountsLoaded: true });
  },

  // DB에 계정 추가
  addAccountToDb: async (account) => {
    try {
      const row = await insertStaffAccount({
        login_id: account.id,
        password: account.pw,
        name: account.name,
        role: account.role,
      });
      const newAccount = dbRowToAccount(row);
      set((state) => {
        const updated = [...state.accounts, newAccount];
        saveAccountsToStorage(updated);
        return { accounts: updated };
      });
      return true;
    } catch {
      // DB 실패 시 localStorage 폴백
      get().addAccount(account);
      return false;
    }
  },

  // DB에서 계정 수정
  updateAccountInDb: async (account) => {
    if (!account.dbId) {
      // dbId가 없으면 localStorage에서 찾아서 업데이트
      const idx = get().accounts.findIndex((a) => a.id === account.id);
      if (idx >= 0) get().updateAccount(idx, account);
      return false;
    }
    try {
      const row = await updateStaffAccount(account.dbId, {
        login_id: account.id,
        password: account.pw,
        name: account.name,
        role: account.role,
      });
      const updated = dbRowToAccount(row);
      set((state) => {
        const list = state.accounts.map((a) => a.dbId === account.dbId ? updated : a);
        saveAccountsToStorage(list);
        return { accounts: list };
      });
      return true;
    } catch {
      const idx = get().accounts.findIndex((a) => a.dbId === account.dbId);
      if (idx >= 0) get().updateAccount(idx, account);
      return false;
    }
  },

  // DB에서 계정 삭제
  removeAccountFromDb: async (account) => {
    if (!account.dbId) {
      const idx = get().accounts.findIndex((a) => a.id === account.id);
      if (idx >= 0) get().removeAccount(idx);
      return false;
    }
    try {
      await deleteStaffAccount(account.dbId);
      set((state) => {
        const list = state.accounts.filter((a) => a.dbId !== account.dbId);
        saveAccountsToStorage(list);
        return { accounts: list };
      });
      return true;
    } catch {
      const idx = get().accounts.findIndex((a) => a.dbId === account.dbId);
      if (idx >= 0) get().removeAccount(idx);
      return false;
    }
  },

  updatePermissions: (role, menus) => {
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

  // localStorage 폴백 (기존 호환)
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
