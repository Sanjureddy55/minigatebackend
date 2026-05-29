import { useQuery } from '@tanstack/react-query'
import { CheckCircle, LogIn, LogOut } from 'lucide-react'
import { deliveryService } from '../../services/delivery.service.js'

export default function DeliveryEntryStatus() {
  const { data, isLoading } = useQuery({
    queryKey: ['delivery-entry-status'],
    queryFn: () => deliveryService.getEntryStatus().then((r) => r.data?.data || r.data),
  })

  const s = data || {}

  const checkedInTime = s.entry_confirmed_at
    ? new Date(s.entry_confirmed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null
  const exitTime = s.expected_exit
    ? new Date(s.expected_exit).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-[#F8FAFC]">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8 space-y-6 text-center">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : s.entry_confirmed ? (
          <>
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-teal-50 border-2 border-teal-200 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-teal-600" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold">Entry confirmed</h2>
              <p className="text-sm text-muted-foreground mt-1">Welcome to {s.society_name || 'the society'}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30 text-left">
                <LogIn className="h-5 w-5 text-teal-600 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Checked in</p>
                  <p className="font-semibold text-sm">
                    {checkedInTime || '—'}{s.gate ? ` · ${s.gate}` : ''}
                  </p>
                </div>
              </div>

              {exitTime && (
                <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30 text-left">
                  <LogOut className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Expected exit</p>
                    <p className="font-semibold text-sm">By {exitTime}</p>
                  </div>
                </div>
              )}
            </div>

            <a href="/delivery-partner/access-pass" className="block text-sm text-primary hover:underline">
              View pass
            </a>
          </>
        ) : (
          <>
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <LogIn className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold">No entry yet</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {s.status === 'active' ? 'Your pass is active. Show your QR code at the gate.' : 'Entry not confirmed yet.'}
              </p>
            </div>
            <a href="/delivery-partner/show-qr-code" className="block text-sm text-primary hover:underline">
              Show QR Code →
            </a>
          </>
        )}
      </div>
    </div>
  )
}
