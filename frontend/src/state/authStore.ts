import { create } from "zustand";
import * as api from "../api/endpoints";
import { ApiError } from "../api/client";

interface AuthState {
  authenticated: boolean;
  loading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  authenticated: false,
  loading: true,
  error: null,

  checkAuth: async () => {
    try {
      await api.checkAuth();
      set({ authenticated: true, loading: false, error: null });
    } catch {
      set({ authenticated: false, loading: false, error: null });
    }
  },

  login: async (password: string) => {
    set({ loading: true, error: null });
    try {
      await api.login(password);
      set({ authenticated: true, loading: false });
    } catch (e) {
      const message =
        e instanceof ApiError && e.status === 401
          ? "Invalid password"
          : "Connection error";
      set({ loading: false, error: message });
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } finally {
      set({ authenticated: false });
    }
  },
}));
