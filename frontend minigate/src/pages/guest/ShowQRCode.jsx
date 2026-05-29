import { useQuery } from '@tanstack/react-query'
import { QrCode } from 'lucide-react'
import { guestService } from '../../services/guest.service.js'

export default function GuestShowQRCode() {
  const { data, isLoading } = useQuery({
    queryKey: ['guest-qr'],
    queryFn: () => guestService.getQRCode().then((r) => r.data?.data || r.data),
  })

  const qr = data || {}
  const validUntilTime = qr.valid_until
    ? new Date(qr.valid_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8FAFC]">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8 space-y-6 text-center">
        <div>
          <h2 className="text-xl font-bold">{qr.society_name || 'Greenwood Heights'}</h2>
          <p className="text-sm text-muted-foreground mt-1">Scan this QR at the gate</p>
        </div>

        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* QR code visual */}
            <div className="mx-auto w-48 h-48 rounded-2xl bg-muted flex flex-col items-center justify-center border-2 border-dashed border-border gap-2 p-4">
              <QrCode className="h-24 w-24 text-foreground/50" />
              <p className="text-[9px] text-muted-foreground font-mono break-all">
                {qr.qr_code_value ? qr.qr_code_value.slice(0, 24) + '…' : '—'}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">PASSCODE</p>
              <p className="text-2xl font-mono font-bold tracking-widest">{qr.passcode || '—'}</p>
              {validUntilTime && <p className="text-sm text-teal-600 font-medium">Valid till {validUntilTime}</p>}
            </div>

            {(qr.visitor_name || qr.host_resident_name || qr.purpose) && (
              <div className="text-left space-y-1.5 bg-muted/30 rounded-xl p-4 text-sm">
                {qr.visitor_name && <p><span className="text-muted-foreground">Guest:</span> {qr.visitor_name}</p>}
                {qr.host_resident_name && <p><span className="text-muted-foreground">Host:</span> {qr.host_resident_name} · Flat {qr.host_flat_number}</p>}
                {qr.purpose && <p><span className="text-muted-foreground">Purpose:</span> {qr.purpose}</p>}
              </div>
            )}
          </>
        )}

        <a href="/guest-user/access-pass" className="block text-sm text-primary hover:underline">
          ← Back to Access Pass
        </a>
      </div>
    </div>
  )
}
