import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { selectMobileMenu, setMobileMenu } from '../store/slices/uiSlice.js'
import { useDispatch } from 'react-redux'
import { Sidebar } from './Sidebar.jsx'
import { Topbar } from './Topbar.jsx'
import { AnimatePresence, motion } from 'framer-motion'

export function AppLayout() {
  const dispatch = useDispatch()
  const location = useLocation()
  const mobileOpen = useSelector(selectMobileMenu)

  // Close mobile drawer on navigation
  useEffect(() => {
    dispatch(setMobileMenu(false))
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute -top-64 -left-64 h-[700px] w-[700px] rounded-full opacity-[0.05] blur-[140px]"
          style={{ background: 'radial-gradient(circle, #0D9488 0%, transparent 65%)' }}
        />
        <div
          className="absolute -bottom-64 -right-48 h-[600px] w-[600px] rounded-full opacity-[0.03] blur-[130px]"
          style={{ background: 'radial-gradient(circle, #06B6D4 0%, transparent 65%)' }}
        />
      </div>

      {/* Desktop Sidebar */}
      <div className="relative z-10 hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => dispatch(setMobileMenu(false))}
            />
            <motion.div
              key="drawer"
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="fixed left-0 top-0 z-50 h-full w-72 lg:hidden"
            >
              <Sidebar mobile onClose={() => dispatch(setMobileMenu(false))} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar onOpenMenu={() => dispatch(setMobileMenu(true))} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
