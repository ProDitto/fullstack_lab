import { create } from 'zustand';
import type { User } from '../types';
import * as api from '../lib/api';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  checkSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  quickLogin: (userId: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true to check session
  error: null,

  checkSession: async () => {
    set({ isLoading: true });
    try {
      const userId = sessionStorage.getItem('userId');
      if (userId) {
        const user = await api.getUserById(userId);
        if (user) {
          set({ currentUser: user, isAuthenticated: true, isLoading: false });
        } else {
          sessionStorage.removeItem('userId');
          set({ currentUser: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error("Session check failed:", error);
      set({ currentUser: null, isAuthenticated: false, isLoading: false, error: 'Failed to verify session.' });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.login(email, password);
      sessionStorage.setItem('userId', user.id);
      set({ currentUser: user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  quickLogin: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.quickLogin(userId);
      sessionStorage.setItem('userId', user.id);
      set({ currentUser: user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.register(name, email, password);
      sessionStorage.setItem('userId', user.id);
      set({ currentUser: user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  logout: async () => {
    const { currentUser } = get();
    if (currentUser) {
      await api.logout(currentUser.id);
    }
    sessionStorage.removeItem('userId');
    set({ currentUser: null, isAuthenticated: false });
  },

  clearError: () => {
    set({ error: null });
  },
}));
