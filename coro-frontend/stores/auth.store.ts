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
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user, token, refreshToken?: string) => {
    localStorage.setItem('coro_token', token);
    localStorage.setItem('coro_user', JSON.stringify(user));
    if (refreshToken) localStorage.setItem('coro_refresh_token', refreshToken);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    const refreshToken = localStorage.getItem('coro_refresh_token');
    if (refreshToken) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }).catch(() => {});
    }
    localStorage.removeItem('coro_token');
    localStorage.removeItem('coro_refresh_token');
    localStorage.removeItem('coro_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  initAuth: () => {
    const token = localStorage.getItem('coro_token');
    const userStr = localStorage.getItem('coro_user');
    if (token && userStr) {
      const user = JSON.parse(userStr);
      set({ user, token, isAuthenticated: true });
    }
  },
}));