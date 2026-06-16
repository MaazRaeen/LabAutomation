import { create } from 'zustand'

export type UserRole = 'student' | 'teacher' | 'admin'

interface AuthState {
  user: any | null
  role: UserRole | null
  session: any | null
  loading: boolean
  setUser: (user: any | null) => void
  setRole: (role: UserRole | null) => void
  setSession: (session: any | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  session: null,
  loading: true,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: null, role: null, session: null, loading: false }),
}))
