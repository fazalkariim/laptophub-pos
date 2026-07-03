import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Role = 'SUPER_ADMIN' | 'BRANCH_MANAGER' | 'ACCOUNTANT' | 'SALESMAN';

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  branchId: string | null;
}

interface AuthState {
  user: CurrentUser | null;
  hydrated: boolean;
  setUser: (u: CurrentUser | null) => void;
  logout: () => void;
  setHydrated: (v: boolean) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: 'laptophub-auth',
      storage: createJSONStorage(() => localStorage),
      // sirf user persist karo, hydrated ko nahi
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);