import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  user: null,
  tokens: null,
  features: [],
  isAuthenticated: false,
  isLoading: true,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, { payload }) {
      const { user, tokens, features } = payload
      state.user = user
      state.tokens = tokens
      state.features = features || []
      state.isAuthenticated = true
      state.isLoading = false
      localStorage.setItem('access_token', tokens.access)
      localStorage.setItem('refresh_token', tokens.refresh)
      localStorage.setItem('auth_user', JSON.stringify(user))
      localStorage.setItem('auth_features', JSON.stringify(features || []))
    },
    updateUser(state, { payload }) {
      state.user = { ...state.user, ...payload }
      localStorage.setItem('auth_user', JSON.stringify(state.user))
    },
    logout(state) {
      state.user = null
      state.tokens = null
      state.features = []
      state.isAuthenticated = false
      state.isLoading = false
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('auth_user')
      localStorage.removeItem('auth_features')
    },
    hydrateFromStorage(state) {
      try {
        const user = JSON.parse(localStorage.getItem('auth_user') || 'null')
        const access = localStorage.getItem('access_token')
        const refresh = localStorage.getItem('refresh_token')
        const features = JSON.parse(localStorage.getItem('auth_features') || '[]')
        if (user && access) {
          state.user = user
          state.tokens = { access, refresh }
          state.features = features
          state.isAuthenticated = true
        }
      } catch {
        // ignore
      }
      state.isLoading = false
    },
    setLoading(state, { payload }) {
      state.isLoading = payload
    },
  },
})

export const { setCredentials, updateUser, logout, hydrateFromStorage, setLoading } =
  authSlice.actions

// ── Selectors ────────────────────────────────────────────────
export const selectUser = (state) => state.auth.user
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export const selectIsLoading = (state) => state.auth.isLoading
export const selectFeatures = (state) => state.auth.features
export const selectRole = (state) => state.auth.user?.role?.slug
export const selectSociety = (state) => state.auth.user?.society

export function selectCan(module, action = 'can_view') {
  return (state) => {
    const feat = state.auth.features?.find((f) => f.module === module)
    if (!feat) return false
    return feat[action] === true
  }
}

export default authSlice.reducer
