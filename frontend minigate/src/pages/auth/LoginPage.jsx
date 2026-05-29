import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Phone, ShieldCheck, ArrowRight, Loader2, CheckCircle2, Activity, Users } from 'lucide-react'
import { toast } from 'sonner'
import { authService } from '../../services/auth.service.js'
import { setCredentials } from '../../store/slices/authSlice.js'
import { HOME_ROUTE_MAP, ROLE_HOME_MAP } from '../../constants/routes.js'
import { getErrorMessage } from '../../utils/formatters.js'

const STATS = [
  { icon: Building2, value: '1.2k+', label: 'Societies' },
  { icon: Users, value: '850k+', label: 'Residents' },
  { icon: Activity, value: '99.99%', label: 'Uptime' },
]

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendOtp(e) {
    e.preventDefault()
    if (phone.length < 10) {
      toast.error('Enter a valid 10-digit mobile number')
      return
    }
    setLoading(true)
    try {
      await authService.sendOtp(phone)
      setStep('otp')
      toast.success('OTP sent!', { description: 'Use 123456 in development' })
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function verify(e) {
    e.preventDefault()
    if (otp.length < 6) {
      toast.error('Enter the 6-digit OTP')
      return
    }
    setLoading(true)
    try {
      const { data } = await authService.loginMobile(phone, otp)
      const { tokens, data: userData, home_route } = data

      dispatch(
        setCredentials({
          user: userData,
          tokens,
          features: userData?.features || [],
        })
      )

      toast.success(`Welcome, ${userData?.full_name || 'User'}!`)

      const role = userData?.role?.slug
      const dest = HOME_ROUTE_MAP[home_route] || ROLE_HOME_MAP[role] || '/society/dashboard'

      // Resident pending check
      if (userData?.status === 'pending') {
        navigate('/pending-approval')
        return
      }

      navigate(dest)
    } catch (err) {
      const msg = getErrorMessage(err)
      if (err.response?.status === 403) {
        const detail = err.response?.data?.message || msg
        if (detail.toLowerCase().includes('pending')) {
          toast.error('Account pending approval by Society Admin.')
          navigate('/pending-approval')
        } else {
          toast.error(detail)
        }
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
      {/* Left panel */}
      <div
        className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-white"
        style={{ background: 'linear-gradient(145deg, #0F172A 0%, #1E3A5F 50%, #0F2D55 100%)' }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
        <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #0D9488, transparent 70%)' }} />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #06B6D4, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div
            className="grid h-10 w-10 place-items-center rounded-xl"
            style={{ background: 'linear-gradient(135deg, #0D9488, #06B6D4)' }}
          >
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight">MiniGate</div>
            <div className="text-xs text-white/50 -mt-0.5">Smart Society & Gate Management</div>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <h1 className="text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
              Smarter communities.{' '}
              <span style={{ color: '#38BDF8' }}>Seamless living.</span>
            </h1>
            <p className="mt-4 max-w-md text-base text-white/60 leading-relaxed">
              The all-in-one platform trusted by thousands of societies across India.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-3">
              {STATS.map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 p-4 backdrop-blur-sm"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <Icon className="h-5 w-5 mb-2 text-white/50" />
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-xs text-white/50 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="relative text-xs text-white/35">
          © 2026 MiniGate Technologies Pvt. Ltd.
        </div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center bg-white dark:bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-2 font-bold">
            <div
              className="grid h-9 w-9 place-items-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, #0D9488, #06B6D4)' }}
            >
              <Building2 className="h-5 w-5 text-white" />
            </div>
            MiniGate
          </div>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 dark:bg-teal-900/20 dark:border-teal-800 px-3 py-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
            <span className="text-xs font-medium text-teal-700 dark:text-teal-400">
              Trusted by 1.2k+ societies
            </span>
          </div>

          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22 }}
              >
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-foreground">
                  Sign in to your workspace
                </h2>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-muted-foreground">
                  Enter your registered mobile number and we'll send a one-time password.
                </p>

                <form onSubmit={sendOtp} className="mt-7 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-foreground">
                      Mobile number
                    </label>
                    <div className="flex rounded-xl border border-gray-200 dark:border-border overflow-hidden focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
                      <span className="inline-flex items-center gap-1.5 border-r border-gray-200 dark:border-border bg-gray-50 dark:bg-muted px-3 text-sm text-gray-500 font-medium min-w-[56px]">
                        +91
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="Enter your mobile number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        className="flex-1 bg-white dark:bg-background px-3 py-3 text-sm text-gray-900 dark:text-foreground placeholder:text-gray-400 outline-none"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-60 btn-teal"
                  >
                    {loading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <><span>Send OTP</span><ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>

                <div className="mt-4 text-center text-xs text-gray-500">
                  New resident?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/onboarding')}
                    className="font-semibold text-teal-600 hover:underline"
                  >
                    Register here
                  </button>
                </div>

                <div className="mt-6 flex items-start gap-3 rounded-xl border border-gray-100 dark:border-border bg-gray-50 dark:bg-muted/30 p-4">
                  <ShieldCheck className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-gray-700 dark:text-foreground">
                      Protected by JWT + RBAC
                    </div>
                    <div className="text-xs text-gray-400 dark:text-muted-foreground mt-0.5">
                      Your data is encrypted and access is role-based.
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22 }}
              >
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-foreground">
                  Verify your number
                </h2>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-muted-foreground">
                  We sent a 6-digit OTP to{' '}
                  <span className="font-semibold text-gray-800 dark:text-foreground">+91 {phone}</span>
                </p>

                <form onSubmit={verify} className="mt-7 space-y-5">
                  {/* OTP input boxes */}
                  <div className="flex gap-2 justify-center">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={otp[i] || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '')
                          const next = otp.split('')
                          next[i] = val
                          const joined = next.join('').slice(0, 6)
                          setOtp(joined)
                          if (val && i < 5) {
                            document.getElementById(`otp-${i + 1}`)?.focus()
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !otp[i] && i > 0) {
                            document.getElementById(`otp-${i - 1}`)?.focus()
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault()
                          const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
                          setOtp(pasted)
                        }}
                        className="h-12 w-10 rounded-xl border border-gray-200 dark:border-border text-center text-lg font-bold text-gray-900 dark:text-foreground bg-white dark:bg-background focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
                      />
                    ))}
                  </div>

                  <p className="text-xs text-gray-400 dark:text-muted-foreground text-center">
                    Development: use <span className="font-bold text-gray-600 dark:text-foreground">1 2 3 4 5 6</span>
                  </p>

                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-50 btn-teal"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Sign in'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStep('phone'); setOtp('') }}
                    className="flex w-full items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-muted-foreground hover:text-gray-600 dark:hover:text-foreground transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Use a different number
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-center gap-4 text-[11px] text-gray-400 dark:text-muted-foreground">
            <span>© 2026 MiniGate Technologies Pvt. Ltd.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
