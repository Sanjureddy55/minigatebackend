import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Clock, CheckCircle2, Building2, RefreshCw } from 'lucide-react'
import { authService } from '../services/auth.service.js'
import { selectUser, logout } from '../store/slices/authSlice.js'

export default function PendingApproval() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector(selectUser)
  const [status, setStatus] = useState(null)
  const [polling, setPolling] = useState(false)

  const mobile = user?.mobile

  async function checkStatus() {
    if (!mobile) return
    setPolling(true)
    try {
      const { data } = await authService.getApprovalStatus(mobile)
      setStatus(data.data)
      if (data.data?.is_approved) {
        navigate('/resident/dashboard')
      }
    } catch {}
    finally { setPolling(false) }
  }

  useEffect(() => {
    checkStatus()
    const timer = setInterval(checkStatus, 30000)
    return () => clearInterval(timer)
  }, [mobile]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="grid h-20 w-20 place-items-center rounded-2xl bg-warning/10 mx-auto mb-6">
          <Clock className="h-10 w-10 text-warning" />
        </div>

        <h1 className="text-2xl font-bold text-foreground">Pending Approval</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Your registration is awaiting Society Admin approval.
        </p>

        {status && (
          <div className="mt-6 card-premium p-4 text-left space-y-2">
            <div className="text-xs font-semibold text-foreground">
              {status.society_name} — Flat {status.flat_number}
            </div>
            {status.steps?.map((s) => (
              <div key={s.key} className="flex items-start gap-3">
                <div className={`grid h-5 w-5 shrink-0 mt-0.5 place-items-center rounded-full ${s.done ? 'bg-success/15' : 'bg-muted'}`}>
                  {s.done
                    ? <CheckCircle2 className="h-3 w-3 text-success" />
                    : <Clock className="h-3 w-3 text-muted-foreground" />}
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">{s.label}</div>
                  <div className="text-[11px] text-muted-foreground">{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={checkStatus}
            disabled={polling}
            className="btn-teal w-full rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${polling ? 'animate-spin' : ''}`} />
            Check Status
          </button>
          <button
            onClick={() => { dispatch(logout()); navigate('/login') }}
            className="w-full rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
