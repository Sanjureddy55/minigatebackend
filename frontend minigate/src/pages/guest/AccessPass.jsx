import { useQuery } from '@tanstack/react-query'
import { QrCode } from 'lucide-react'
import { guestService } from '../../services/guest.service.js'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'

export default function GuestAccessPass() {
  const { data, isLoading } = useQuery({
    queryKey: ['guest-access-pass'],
    queryFn: () => guestService.getAccessPass().then((r) => r.data?.data || r.data),
  })

  const ap = data || {}

  const validUntilTime = ap.valid_until
    ? new Date(ap.valid_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8FAFC]">
      {isLoading ? (
        <CardsSkeleton count={1} />
      ) : (
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-16 w-16 rounded-2xl bg-teal-600 flex items-center justify-center">
              <QrCode className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-center">{ap.society_name || 'Greenwood Heights'}</h2>
            <p className="text-sm text-muted-foreground">Temporary entry pass</p>
          </div>

          {/* Passcode card */}
          <div className="border-2 border-dashed border-border rounded-xl p-5 text-center space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">PASSCODE</p>
            <p className="text-4xl font-mono font-bold tracking-[0.15em] text-foreground break-all">
              {ap.passcode || '—'}
            </p>
            {validUntilTime && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                <span className="text-xs text-teal-700 font-medium">Valid till {validUntilTime}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-3">
            <a href="/guest-user/show-qr-code" className="flex flex-col items-center gap-1.5 p-3 rounded-xl border hover:bg-muted text-center">
              <QrCode className="h-5 w-5" />
              <span className="text-xs font-medium">Show QR</span>
            </a>
            <a href="/guest-user/entry-status" className="flex flex-col items-center gap-1.5 p-3 rounded-xl border hover:bg-muted text-center">
              <span className="text-lg">🕐</span>
              <span className="text-xs font-medium">Status</span>
            </a>
            <button className="flex flex-col items-center gap-1.5 p-3 rounded-xl border hover:bg-muted text-center">
              <span className="text-lg">⊗</span>
              <span className="text-xs font-medium">Expired</span>
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Show this pass to the security guard at the gate.
          </p>
        </div>
      )}
    </div>
  )
}
