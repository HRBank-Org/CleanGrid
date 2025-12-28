import { create } from 'zustand'
import api from '../services/api'

interface User {
  id: string
  email: string
  name: string
  phone: string
  role: string
  address?: string
  postalCode?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (data: any) => Promise<boolean>
  logout: () => void
  loadUser: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,
  error: null,
  
  loadUser: () => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        set({ user, token, isLoading: false })
      } catch {
        set({ isLoading: false })
      }
    } else {
      set({ isLoading: false })
    }
  },
  
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/auth/login', { email, password })
      const { access_token, user } = response.data
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(user))
      set({ user, token: access_token, isLoading: false })
      return true
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Login failed'
      set({ error: message, isLoading: false })
      return false
    }
  },
  
  signup: async (data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/auth/signup', data)
      const { access_token, user } = response.data
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(user))
      set({ user, token: access_token, isLoading: false })
      return true
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Signup failed'
      set({ error: message, isLoading: false })
      return false
    }
  },
  
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
  },
  
  clearError: () => set({ error: null }),
}))

// Initialize on load
useAuthStore.getState().loadUser()
