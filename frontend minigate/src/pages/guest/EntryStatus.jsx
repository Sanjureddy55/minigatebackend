import { useQuery } from '@tanstack/react-query'
import { CheckCircle, LogIn, LogOut } from 'lucide-react'
import { guestService } from '../../services/guest.service.js'

export default function GuestEntryStatus() {
  const { data, isLoading } = useQuery({
    queryKey: ['guest-entry-status'],
    queryFn: () => guestService.getEntryStatus().then((r) => r.data?.data || r.data),
  })

  const s = data || {}

  const checkedInTime = s.entry_confirmed_at
    ? new Date(s.entry_confirmed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null
  const exitTime = s.expected_exit
    ? new Date(s.expected_exit).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8FAFC]">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8 space-y-6">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : s.entry_confirmed ? (
          <>
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-teal-50 border-2 border-teal-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-teal-600" />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold">Entry confirmed</h2>
              <p className="text-sm text-muted-foreground mt-1">Welcome to Greenwood Heights</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-xl border text-left">
                <div className="h-8 w-8 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                  <LogIn className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Checked in</p>
                  <p className="font-semibold text-sm">
                    {checkedInTime || '—'}{s.gate ? ` · ${s.gate}` : ''}
                  </p>
                </div>
              </div>

              {exitTime && (
                <div className="flex items-center gap-3 p-4 rounded-xl border text-left">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <LogOut className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expected exit</p>
                    <p className="font-semibold text-sm">By {exitTime}</p>
                  </div>
                </div>
              )}
            </div>

            <a href="/guest-user/access-pass" className="block text-center text-sm text-primary hover:underline">
              View pass
            </a>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <LogIn className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold">Not yet entered</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Show your QR code to the security guard to confirm entry.
              </p>
            </div>
            <a href="/guest-user/show-qr-code" className="block text-center text-sm text-primary hover:underline">
              Show QR Code →
            </a>
          </>
        )}
      </div>
    </div>
  )
}
