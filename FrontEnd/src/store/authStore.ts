import { create } from 'zustand'

export type UserRole = 'student' | 'teacher' | 'admin'

interface AuthState {
  user: any | null
  role: UserRole | null
  session: any | null
  setUser: (user: any | null) => void
  setRole: (role: UserRole | null) => void
  setSession: (session: any | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  session: null,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setSession: (session) => set({ session }),
  logout: () => set({ user: null, role: null, session: null }),
}))
