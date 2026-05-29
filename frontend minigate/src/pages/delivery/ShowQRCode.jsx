import { useQuery } from '@tanstack/react-query'
import { QrCode } from 'lucide-react'
import { deliveryService } from '../../services/delivery.service.js'

export default function DeliveryShowQRCode() {
  const { data, isLoading } = useQuery({
    queryKey: ['delivery-qr'],
    queryFn: () => deliveryService.getQRCode().then((r) => r.data?.data || r.data),
  })

  const qr = data || {}
  const validUntilTime = qr.valid_until
    ? new Date(qr.valid_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-[#F8FAFC]">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8 space-y-6 text-center">
        <h2 className="text-xl font-bold">Your QR Code</h2>
        <p className="text-sm text-muted-foreground">Show this to the security guard</p>

        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* QR code placeholder — replace with actual QR lib if needed */}
            <div className="mx-auto w-48 h-48 rounded-2xl bg-muted flex flex-col items-center justify-center border-2 border-dashed border-border gap-2">
              <QrCode className="h-24 w-24 text-foreground/40" />
              <p className="text-xs text-muted-foreground font-mono break-all px-2">
                {qr.qr_code_value ? qr.qr_code_value.slice(0, 20) + '…' : '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-mono font-bold tracking-widest">{qr.passcode || '—'}</p>
              {validUntilTime && <p className="text-sm text-teal-600">Valid till {validUntilTime}</p>}
            </div>
          </>
        )}

        <a href="/delivery-partner/access-pass" className="block text-sm text-primary hover:underline">
          ← Back to Access Pass
        </a>
      </div>
    </div>
  )
}
