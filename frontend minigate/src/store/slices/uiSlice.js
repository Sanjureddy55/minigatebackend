import { createSlice } from '@reduxjs/toolkit'

const getInitialTheme = () => {
  try {
    return localStorage.getItem('theme') || 'light'
  } catch {
    return 'light'
  }
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: getInitialTheme(),
    sidebarCollapsed: false,
    mobileMenuOpen: false,
  },
  reducers: {
    toggleTheme(state) {
      state.theme = state.theme === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', state.theme)
      document.documentElement.classList.toggle('dark', state.theme === 'dark')
    },
    setTheme(state, { payload }) {
      state.theme = payload
      localStorage.setItem('theme', payload)
      document.documentElement.classList.toggle('dark', payload === 'dark')
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    setMobileMenu(state, { payload }) {
      state.mobileMenuOpen = payload
    },
  },
})

export const { toggleTheme, setTheme, toggleSidebar, setMobileMenu } = uiSlice.actions
export const selectTheme = (state) => state.ui.theme
export const selectSidebarCollapsed = (state) => state.ui.sidebarCollapsed
export const selectMobileMenu = (state) => state.ui.mobileMenuOpen
export default uiSlice.reducer
