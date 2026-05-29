import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, PanelLeftClose, PanelLeftOpen, LogOut, User,
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { selectSidebarCollapsed, toggleSidebar } from '../store/slices/uiSlice.js'
import { selectUser, selectRole, logout } from '../store/slices/authSlice.js'
import { NAV_CONFIG } from '../constants/nav.js'
import { cn } from '../utils/cn.js'
import { useNavigate } from 'react-router-dom'

export function Sidebar({ mobile = false, onClose }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const collapsedState = useSelector(selectSidebarCollapsed)
  const collapsed = mobile ? false : collapsedState
  const user = useSelector(selectUser)
  const role = useSelector(selectRole)
  const groups = NAV_CONFIG[role] || NAV_CONFIG['society-admin'] || []
  const [openGroups, setOpenGroups] = useState({})

  useEffect(() => {
    const next = {}
    groups.forEach((group) => {
      next[group.label] = group.items.some(
        (item) => location.pathname === item.to || location.pathname.startsWith(item.to + '/')
      )
    })
    setOpenGroups((prev) => ({ ...next, ...prev }))
  }, [role]) // eslint-disable-line react-hooks/exhaustive-deps

  const initials = (user?.full_name || user?.name || 'MG')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const societyName = user?.society?.name || 'MiniGate'
  const societyCity = user?.society?.city || ''

  function handleLogout() {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <motion.aside
      animate={{ width: mobile ? 288 : collapsed ? 64 : 260 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex h-full flex-col border-r border-sidebar-border bg-sidebar overflow-hidden"
      style={{ minWidth: mobile ? 288 : collapsed ? 64 : 260 }}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border/60">
        <div
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl font-bold text-white text-sm"
          style={{
            background: 'linear-gradient(135deg, #0D9488 0%, #06B6D4 100%)',
            boxShadow: '0 4px 20px rgba(13,148,136,0.40)',
          }}
        >
          M
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-teal-400 border-2 border-sidebar" />
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="brand-text"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="min-w-0"
            >
              <div className="truncate text-sm font-semibold text-sidebar-foreground leading-tight">
                {societyName}
              </div>
              {societyCity && (
                <div className="truncate text-[11px] text-muted-foreground mt-0.5">
                  {societyCity}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User Info */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="user-info"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-b border-sidebar-border/60 px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <div
                className="grid h-8 w-8 place-items-center rounded-lg text-xs font-bold text-white shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(13,148,136,0.30), rgba(6,182,212,0.30))',
                  border: '1px solid rgba(13,148,136,0.35)',
                  color: '#0D9488',
                }}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-sidebar-foreground">
                  {user?.full_name || user?.name || 'User'}
                </div>
                <div className="truncate text-[10px] text-muted-foreground capitalize">
                  {role?.replace(/-/g, ' ') || 'Member'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {groups.map((group, gi) => {
          const isOpen = openGroups[group.label] ?? true

          return (
            <div key={group.label} className={cn(gi > 0 && 'mt-4')}>
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.button
                    key={`label-${group.label}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() =>
                      setOpenGroups((p) => ({ ...p, [group.label]: !isOpen }))
                    }
                    className="flex w-full items-center justify-between px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      className={cn(
                        'h-3 w-3 transition-transform duration-200',
                        !isOpen && '-rotate-90'
                      )}
                    />
                  </motion.button>
                )}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {(collapsed || isOpen) && (
                  <motion.div
                    key={`items-${group.label}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden space-y-0.5"
                  >
                    {group.items.map(({ to, label, icon: Icon, badge }) => (
                      <NavLink
                        key={to}
                        to={to}
                        title={collapsed ? label : undefined}
                        onClick={mobile && onClose ? onClose : undefined}
                        className={({ isActive }) =>
                          cn(
                            'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
                            isActive
                              ? 'nav-active nav-active-bar text-primary font-semibold'
                              : 'text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/40'
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div
                              className={cn(
                                'grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-all duration-200',
                                isActive
                                  ? 'bg-primary/10'
                                  : 'bg-transparent group-hover:bg-sidebar-accent/60'
                              )}
                            >
                              <Icon
                                className={cn(
                                  'h-4 w-4 transition-colors duration-200',
                                  isActive
                                    ? 'text-primary'
                                    : 'text-muted-foreground group-hover:text-sidebar-foreground'
                                )}
                              />
                            </div>

                            <AnimatePresence initial={false}>
                              {!collapsed && (
                                <motion.span
                                  key={`label-${to}`}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="flex-1 truncate"
                                >
                                  {label}
                                </motion.span>
                              )}
                            </AnimatePresence>

                            {!collapsed && badge && (
                              <span
                                className={cn(
                                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                                  isActive
                                    ? 'bg-primary/15 text-primary'
                                    : 'bg-muted text-muted-foreground'
                                )}
                              >
                                {badge}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-sidebar-border/60 p-2 space-y-1">
        <button
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200',
            collapsed && 'justify-center'
          )}
          title="Logout"
        >
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg">
            <LogOut className="h-4 w-4" />
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Collapse toggle */}
        {!mobile && (
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="flex w-full items-center justify-center rounded-xl py-2 text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </motion.aside>
  )
}
