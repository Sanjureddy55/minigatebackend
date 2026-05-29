import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ArrowRight, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { authService } from '../../services/auth.service.js'
import { getErrorMessage } from '../../utils/formatters.js'

const STEPS = ['Verify Mobile', 'Your Details', 'Find Society', 'Complete']

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  // Step 0 state
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  // Step 1 state
  const [fullName, setFullName] = useState('')

  // Step 2 state
  const [countries, setCountries] = useState([])
  const [cities, setCities] = useState([])
  const [societies, setSocieties] = useState([])
  const [flats, setFlats] = useState([])
  const [countryId, setCountryId] = useState('')
  const [cityId, setCityId] = useState('')
  const [societyId, setSocietyId] = useState('')
  const [flatNumber, setFlatNumber] = useState('')

  useEffect(() => {
    authService.getCountries().then(({ data }) => {
      const list = data.results || data.data?.results || []
      setCountries(list)
      // Auto-select first country (India) and always load its cities
      if (list.length > 0) {
        const first = list[0]
        setCountryId(first.id)
        loadCities(first.id)
      }
    }).catch(() => {
      // If countries API fails, try loading cities for India (id=1) directly
      loadCities(1)
    })
  }, [])

  async function loadCities(cid) {
    try {
      const { data } = await authService.getCities(cid)
      setCities(data.results || data.data?.results || data || [])
    } catch { setCities([]) }
  }

  async function loadSocieties(cid) {
    try {
      const { data } = await authService.getSocieties(cid)
      setSocieties(data.results || data.data?.results || data || [])
    } catch { setSocieties([]) }
  }

  async function loadFlats(sid) {
    try {
      const { data } = await authService.getFlats(sid)
      setFlats(data.results || data.data?.results || data || [])
    } catch { setFlats([]) }
  }

  async function sendOtp() {
    if (phone.length < 10) { toast.error('Enter a valid 10-digit number'); return }
    setLoading(true)
    try {
      await authService.sendOtp(phone)
      setOtpSent(true)
      toast.success('OTP sent to +91 ' + phone)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp() {
    if (otp.length < 6) { toast.error('Enter 6-digit OTP'); return }
    setLoading(true)
    try {
      await authService.verifyOtp(phone, otp)
      toast.success('Mobile verified!')
      setStep(1)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function completeOnboarding() {
    if (!societyId || !flatNumber) { toast.error('Select a society and flat'); return }
    setLoading(true)
    try {
      await authService.completeOnboarding({
        mobile: phone,
        full_name: fullName,
        country_id: countryId,
        city_id: cityId,
        society_id: societyId,
        flat_number: flatNumber,
      })
      setStep(3)
    } catch (err) {
      const msg = getErrorMessage(err)
      if (msg.includes('already exists')) {
        toast.error('Mobile already registered. Please login.')
        navigate('/login')
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="grid h-9 w-9 place-items-center rounded-xl btn-teal">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-foreground">MiniGate</span>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-all
                ${i < step ? 'bg-primary text-white' : i === step ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-muted text-muted-foreground'}`}>
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 transition-all ${i < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="card-premium p-6">
          {/* Step 0: Verify Mobile */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Verify your mobile</h2>
              <p className="text-sm text-muted-foreground">We'll send an OTP to verify your number.</p>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Mobile Number</label>
                <div className="flex rounded-xl border border-input overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30">
                  <span className="flex items-center border-r border-input bg-muted px-3 text-sm text-muted-foreground">+91</span>
                  <input
                    type="tel" inputMode="numeric" maxLength={10}
                    placeholder="10-digit number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 bg-background px-3 py-2.5 text-sm outline-none"
                    disabled={otpSent}
                  />
                </div>
              </div>

              {!otpSent ? (
                <button onClick={sendOtp} disabled={loading} className="btn-teal w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP'}
                </button>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">OTP</label>
                    <input
                      type="text" inputMode="numeric" maxLength={6}
                      placeholder="6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Development OTP: 123456</p>
                  </div>
                  <button onClick={verifyOtp} disabled={loading} className="btn-teal w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify OTP'}
                  </button>
                </>
              )}

              <div className="text-center text-xs text-muted-foreground">
                Already registered?{' '}
                <button onClick={() => navigate('/login')} className="text-primary font-semibold hover:underline">Sign in</button>
              </div>
            </div>
          )}

          {/* Step 1: Personal Details */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Your Details</h2>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Full Name</label>
                <input
                  type="text" placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
              <button
                onClick={() => { if (!fullName.trim()) { toast.error('Enter your name'); return } setStep(2) }}
                className="btn-teal w-full rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 2: Find Society */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Find your society</h2>

              {/* Show country selector only if multiple countries exist */}
              {countries.length > 1 && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Country</label>
                  <select
                    value={countryId}
                    onChange={(e) => { setCountryId(e.target.value); setCityId(''); setSocietyId(''); setFlatNumber(''); loadCities(e.target.value) }}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="">Select country…</option>
                    {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">City</label>
                <select
                  value={cityId}
                  onChange={(e) => { setCityId(e.target.value); setSocietyId(''); setFlatNumber(''); loadSocieties(e.target.value) }}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                >
                  <option value="">{cities.length === 0 ? 'Loading cities…' : 'Select city…'}</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {societies.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Society</label>
                  <select
                    value={societyId}
                    onChange={(e) => { setSocietyId(e.target.value); loadFlats(e.target.value) }}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="">Select society…</option>
                    {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {flats.length > 0 ? (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Flat</label>
                  <select
                    value={flatNumber}
                    onChange={(e) => setFlatNumber(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="">Select flat…</option>
                    {flats.map((f) => <option key={f.id} value={f.flat_number}>{f.flat_number}</option>)}
                  </select>
                </div>
              ) : societyId ? (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Flat Number</label>
                  <input
                    type="text" placeholder="e.g. A-101"
                    value={flatNumber}
                    onChange={(e) => setFlatNumber(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              ) : null}

              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-muted transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={completeOnboarding}
                  disabled={loading}
                  className="flex-1 btn-teal rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div className="text-center space-y-4 py-6">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-success/15 mx-auto">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Registration submitted!</h2>
              <p className="text-sm text-muted-foreground">
                Your request has been sent to the Society Admin. You'll be notified once approved.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="btn-teal w-full rounded-xl py-2.5 text-sm font-semibold"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
