import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
  initAuth: () => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

    setAuth: (user, token, refreshToken?: string) => {
    sessionStorage.setItem('coro_token', token);
    sessionStorage.setItem('coro_user', JSON.stringify(user));
    if (refreshToken) sessionStorage.setItem('coro_refresh_token', refreshToken);
    // Garder localStorage pour la compatibilité avec les onglets existants
    localStorage.setItem('coro_token', token);
    localStorage.setItem('coro_user', JSON.stringify(user));
    if (refreshToken) localStorage.setItem('coro_refresh_token', refreshToken);
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    const refreshToken = sessionStorage.getItem('coro_refresh_token') || localStorage.getItem('coro_refresh_token');
    if (refreshToken) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }).catch(() => {});
    }
    sessionStorage.removeItem('coro_token');
    sessionStorage.removeItem('coro_refresh_token');
    sessionStorage.removeItem('coro_user');
    localStorage.removeItem('coro_token');
    localStorage.removeItem('coro_refresh_token');
    localStorage.removeItem('coro_user');
    set({ user: null, token: null, isAuthenticated: false });
  },
  initAuth: () => {
    // sessionStorage en priorité (onglet courant), sinon localStorage (compatibilité)
    const token = sessionStorage.getItem('coro_token') || localStorage.getItem('coro_token');
    const userStr = sessionStorage.getItem('coro_user') || localStorage.getItem('coro_user');
    if (token && userStr) {
      const user = JSON.parse(userStr);
      // Migrer vers sessionStorage si on vient de localStorage
      if (!sessionStorage.getItem('coro_token')) {
        sessionStorage.setItem('coro_token', token);
        sessionStorage.setItem('coro_user', userStr);
      }
      set({ user, token, isAuthenticated: true });
    }
  },
  refreshUser: async () => {
    const token = sessionStorage.getItem('coro_token') || localStorage.getItem('coro_token');
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const user = await res.json();
        sessionStorage.setItem('coro_user', JSON.stringify(user));
        localStorage.setItem('coro_user', JSON.stringify(user));
        set({ user });
      }
    } catch (err) {
      console.error('Erreur refreshUser:', err);
    }
  },
}));