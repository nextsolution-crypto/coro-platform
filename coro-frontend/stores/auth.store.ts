import { create } from "zustand";
import api from "@/lib/api";
import { API_URL, CSRF_HEADER, CSRF_VALUE, clearSession, hasSession, markSession } from "@/lib/session";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId?: string;
  displayPermissions?: string[];
  displayBuildingIds?: string[];
  /** Droit « Coordination planification ». */
  planningCoordinator?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAuth: (user: User, token?: string, refreshToken?: string) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

let authEpoch = 0;
let initializationPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,

  // Les jetons restent dans des cookies httpOnly posés par l'API (M3-05) ;
  // les paramètres token/refreshToken sont ignorés (compatibilité d'appel).
  setAuth: (user) => {
    authEpoch += 1;
    markSession();
    localStorage.setItem("coro_user", JSON.stringify(user));
    sessionStorage.setItem("coro_user", JSON.stringify(user));
    set({ user, token: "cookie", isAuthenticated: true, isInitialized: true });
  },
  logout: () => {
    authEpoch += 1;
    fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", [CSRF_HEADER]: CSRF_VALUE },
      body: "{}",
    }).catch(() => {});
    clearSession();
    set({ user: null, token: null, isAuthenticated: false, isInitialized: true });
  },
  initAuth: async () => {
    if (get().isInitialized) return;
    if (initializationPromise) return initializationPromise;
    const epoch = authEpoch;
    initializationPromise = (async () => {
      if (!hasSession()) {
        if (epoch === authEpoch) {
          clearSession();
          set({ user: null, token: null, isAuthenticated: false, isInitialized: true });
        }
        return;
      }
      try {
        const response = await api.get<User>("/users/me");
        if (epoch !== authEpoch) return;
        const user = response.data;
        markSession();
        localStorage.setItem("coro_user", JSON.stringify(user));
        sessionStorage.setItem("coro_user", JSON.stringify(user));
        set({ user, token: "cookie", isAuthenticated: true, isInitialized: true });
      } catch {
        if (epoch !== authEpoch) return;
        clearSession();
        set({ user: null, token: null, isAuthenticated: false, isInitialized: true });
      }
    })().finally(() => {
      initializationPromise = null;
    });
    return initializationPromise;
  },
  refreshUser: async () => {
    if (!hasSession()) return;
    try {
      const response = await api.get<User>("/users/me");
      const user = response.data;
      localStorage.setItem("coro_user", JSON.stringify(user));
      sessionStorage.setItem("coro_user", JSON.stringify(user));
      set({ user });
    } catch (err) {
      console.error("Erreur refreshUser:", err);
    }
  },
}));
