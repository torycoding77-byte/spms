'use client';

import { create } from 'zustand';

interface AuthState {
  isLoggedIn: boolean;
  adminName: string;
  login: (id: string, password: string) => boolean;
  logout: () => void;
  checkSession: () => void;
}

const ADMIN_ID = 'admin';
const ADMIN_PW = 'flamingo2024';
const SESSION_KEY = 'flamingo_auth';

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  adminName: '',

  login: (id, password) => {
    if (id === ADMIN_ID && password === ADMIN_PW) {
      const session = { loggedIn: true, adminName: '관리자', ts: Date.now() };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      set({ isLoggedIn: true, adminName: '관리자' });
      return true;
    }
    return false;
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    set({ isLoggedIn: false, adminName: '' });
  },

  checkSession: () => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        if (session.loggedIn) {
          set({ isLoggedIn: true, adminName: session.adminName || '관리자' });
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  },
}));
