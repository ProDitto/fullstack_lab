import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as authApi from '../api/authApi';
import type { AuthResponse, LoginCredentials, RegisterData, User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  loadUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      login: async (credentials) => {
        const response = await authApi.login(credentials);
        set({
          user: response.user,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        });
        return response;
      },

      register: async (data) => {
        return await authApi.register(data);
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null });
        // Also clear other stores if needed
      },

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
      },

      loadUser: () => {
        try {
          const storageValue = localStorage.getItem('chatterbox-auth-storage');
          if (storageValue) {
            const { state } = JSON.parse(storageValue);
            if (state.accessToken && state.user) {
              set({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken
              });
            }
          }
        } catch (e) {
          console.error("Failed to parse user from localStorage", e);
          get().logout();
        }
      },
    }),
    {
      name: 'chatterbox-auth-storage',
    }
  )
);
