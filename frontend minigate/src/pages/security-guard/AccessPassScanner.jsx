import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { QrCode, CheckCircle, XCircle } from 'lucide-react'
import api from '../../api/axios.js'

function scanAccessPass(data) {
  return api.post('/security-guard/scan-access-pass/', data)
}

export default function AccessPassScanner() {
  const [input, setInput] = useState('')
  const [gate, setGate] = useState('Gate 1')
  const [result, setResult] = useState(null)

  const scanMut = useMutation({
    mutationFn: ({ qr_code_value, gate }) => scanAccessPass({ qr_code_value, gate }),
    onSuccess: (res) => setResult(res.data),
    onError: (err) => setResult(err.response?.data || { status: 'error', message: 'Network error.' }),
  })

  const handleScan = () => {
    if (!input.trim()) return
    setResult(null)
    scanMut.mutate({ qr_code_value: input.trim(), gate })
  }

  const handleReset = () => {
    setInput('')
    setResult(null)
  }

  const isSuccess = result?.status === 'success'
  const ap = result?.access_pass || {}

  return (
    <div className="p-6 space-y-6 max-w-lg mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Access Pass Scanner</h1>
        <p className="text-sm text-muted-foreground">Scan QR code or enter passcode manually</p>
      </div>

      {!result ? (
        <div className="rounded-xl border bg-card p-6 space-y-5">
          {/* QR placeholder */}
          <div className="h-48 rounded-xl bg-muted flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border">
            <QrCode className="h-16 w-16 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Camera QR scanner (coming soon)</p>
            <p className="text-xs text-muted-foreground">Enter code manually below</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">Gate</label>
              <select
                value={gate}
                onChange={e => setGate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
              >
                {['Gate 1', 'Gate 2', 'Main Gate', 'Side Gate'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">QR Value / Passcode</label>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
                placeholder="Paste QR value or enter passcode (e.g. GW-1234-5678)"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background font-mono"
              />
            </div>

            <button
              onClick={handleScan}
              disabled={scanMut.isPending || !input.trim()}
              className="w-full py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50"
            >
              {scanMut.isPending ? 'Validating…' : 'Validate Pass'}
            </button>
          </div>
        </div>
      ) : (
        <div className={`rounded-xl border-2 p-6 space-y-5 ${isSuccess ? 'border-success bg-success/5' : 'border-destructive bg-destructive/5'}`}>
          <div className="flex flex-col items-center gap-3">
            {isSuccess
              ? <CheckCircle className="h-16 w-16 text-success" />
              : <XCircle    className="h-16 w-16 text-destructive" />
            }
            <div className="text-center">
              <h2 className="text-xl font-bold">{isSuccess ? 'Entry confirmed' : 'Access denied'}</h2>
              <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
            </div>
          </div>

          {isSuccess && (
            <div className="bg-white rounded-xl p-4 space-y-2 text-sm border">
              {[
                ['Visitor',       ap.visitor_name],
                ['Role',          ap.role],
                ['Society',       ap.society],
                ['Passcode',      ap.passcode],
                ['Checked in',    ap.entry_confirmed_at],
                ['Gate',          ap.gate],
                ['Valid until',   ap.valid_until],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={handleReset} className="w-full py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700">
            Scan Next Pass
          </button>
        </div>
      )}
    </div>
  )
}
