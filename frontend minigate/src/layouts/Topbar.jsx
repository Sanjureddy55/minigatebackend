import { useDispatch, useSelector } from 'react-redux'
import { selectTheme, toggleTheme } from '../store/slices/uiSlice.js'
import { selectUser, selectRole, logout } from '../store/slices/authSlice.js'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, Menu, Bell, ChevronDown, LogOut, User, Settings } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '../utils/cn.js'

export function Topbar({ onOpenMenu }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const theme = useSelector(selectTheme)
  const user = useSelector(selectUser)
  const role = useSelector(selectRole)
  const [userOpen, setUserOpen] = useState(false)
  const dropRef = useRef(null)

  const initials = (user?.full_name || user?.name || 'MG')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setUserOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleLogout() {
    dispatch(logout())
    navigate('/login')
  }

  const roleLabel = {
    'super-admin': 'Super Admin',
    'society-admin': 'Society Admin',
    accountant: 'Accountant',
    resident: 'Resident',
    'security-guard': 'Security Guard',
  }[role] || role

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-4 gap-4">
      {/* Left: hamburger (mobile) */}
      <button
        className="lg:hidden rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        onClick={onOpenMenu}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Center: Page breadcrumb / title slot (empty for now) */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* Notifications */}
        <button className="relative rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>

        {/* User dropdown */}
        <div className="relative ml-1" ref={dropRef}>
          <button
            onClick={() => setUserOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            <div
              className="grid h-7 w-7 place-items-center rounded-lg text-xs font-bold"
              style={{
                background: 'linear-gradient(135deg, #0D9488, #06B6D4)',
                color: '#fff',
              }}
            >
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-foreground leading-tight max-w-[100px] truncate">
                {user?.full_name || user?.name || 'User'}
              </div>
              <div className="text-[10px] text-muted-foreground capitalize">{roleLabel}</div>
            </div>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                userOpen && 'rotate-180'
              )}
            />
          </button>

          {userOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-border bg-popover shadow-xl z-50 overflow-hidden">
              <div className="border-b border-border px-3 py-2.5">
                <div className="text-xs font-semibold text-foreground truncate">
                  {user?.full_name || user?.name}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {user?.mobile || user?.email}
                </div>
              </div>
              <div className="p-1">
                <button
                  onClick={() => { setUserOpen(false); handleLogout() }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
