import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ user, token: accessToken });
      },
      logout: async () => {
        try { await api.post('/auth/logout'); } catch { /* ignore */ }
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        set({ user: null, token: null });
      },
    }),
    { name: 'auth-storage', partialize: (state) => ({ user: state.user, token: state.token }) }
  )
);
