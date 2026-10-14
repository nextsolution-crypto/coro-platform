import { create } from "zustand";
import api from "@/lib/api";

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
  isInitialized: boolean;
  setAuth: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

let authEpoch = 0;
let initializationPromise: Promise<void> | null = null;

const clearStoredAuth = () => {
  for (const storage of [sessionStorage, localStorage]) {
    storage.removeItem("coro_token");
    storage.removeItem("coro_refresh_token");
    storage.removeItem("coro_user");
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,

  setAuth: (user, token, refreshToken?: string) => {
    authEpoch += 1;
    sessionStorage.setItem("coro_token", token);
    sessionStorage.setItem("coro_user", JSON.stringify(user));
    if (refreshToken)
      sessionStorage.setItem("coro_refresh_token", refreshToken);
    // Garder localStorage pour la compatibilité avec les onglets existants
    localStorage.setItem("coro_token", token);
    localStorage.setItem("coro_user", JSON.stringify(user));
    if (refreshToken) localStorage.setItem("coro_refresh_token", refreshToken);
    set({ user, token, isAuthenticated: true, isInitialized: true });
  },
  logout: () => {
    authEpoch += 1;
    const refreshToken =
      sessionStorage.getItem("coro_refresh_token") ||
      localStorage.getItem("coro_refresh_token");
    if (refreshToken) {
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api"}/auth/logout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        },
      ).catch(() => {});
    }
    clearStoredAuth();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: true,
    });
  },
  initAuth: async () => {
    if (get().isInitialized) return;
    if (initializationPromise) return initializationPromise;

    const epoch = authEpoch;
    initializationPromise = (async () => {
      // sessionStorage en priorité (onglet courant), sinon localStorage (compatibilité)
      const token =
        sessionStorage.getItem("coro_token") ||
        localStorage.getItem("coro_token");
      const userStr =
        sessionStorage.getItem("coro_user") ||
        localStorage.getItem("coro_user");
      if (!token || !userStr) {
        if (epoch === authEpoch) {
          clearStoredAuth();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isInitialized: true,
          });
        }
        return;
      }

      try {
        const response = await api.get<User>("/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (epoch !== authEpoch) return;
        const currentToken =
          sessionStorage.getItem("coro_token") ||
          localStorage.getItem("coro_token");
        if (!currentToken)
          throw new Error("Session token unavailable after validation.");
        const user = response.data;
        // Migrer vers sessionStorage si on vient de localStorage
        sessionStorage.setItem("coro_token", currentToken);
        sessionStorage.setItem("coro_user", JSON.stringify(user));
        localStorage.setItem("coro_token", currentToken);
        localStorage.setItem("coro_user", JSON.stringify(user));
        set({
          user,
          token: currentToken,
          isAuthenticated: true,
          isInitialized: true,
        });
      } catch {
        if (epoch !== authEpoch) return;
        clearStoredAuth();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isInitialized: true,
        });
      }
    })().finally(() => {
      initializationPromise = null;
    });

    return initializationPromise;
  },
  refreshUser: async () => {
    const token =
      sessionStorage.getItem("coro_token") ||
      localStorage.getItem("coro_token");
    if (!token) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api"}/users/me`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const user = await res.json();
        sessionStorage.setItem("coro_user", JSON.stringify(user));
        localStorage.setItem("coro_user", JSON.stringify(user));
        set({ user });
      }
    } catch (err) {
      console.error("Erreur refreshUser:", err);
    }
  },
}));
