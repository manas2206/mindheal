import { create } from 'zustand'

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  accessToken: localStorage.getItem('access_token') || null,
  refreshToken: localStorage.getItem('refresh_token') || null,

  setAuth: (data) => {
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    localStorage.setItem('user', JSON.stringify({
      user_id: data.user_id,
      full_name: data.full_name,
      role: data.role,
    }))
    set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      user: {
        user_id: data.user_id,
        full_name: data.full_name,
        role: data.role,
      },
    })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    set({ accessToken: null, refreshToken: null, user: null })
  },

  isAuthenticated: () => !!get().accessToken,
  hasRole: (role) => get().user?.role === role,
}))