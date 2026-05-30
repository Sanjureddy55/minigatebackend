import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { QrCode, CheckCircle2, XCircle, ScanLine, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { guardService } from '@/services/guard.service.js'

function PassDetailCard({ detail, onCheckIn, loading }) {
  const initial = detail.full_name?.charAt(0)?.toUpperCase() ?? '?'
  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-base font-bold flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-foreground">{detail.full_name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{detail.mobile}</div>
        </div>
        {detail.is_valid ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-green-300/30 bg-green-100/30 px-2.5 py-0.5 text-xs font-bold text-green-700">
            <CheckCircle2 className="h-3 w-3" /> Valid
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-300/30 bg-red-100/30 px-2.5 py-0.5 text-xs font-bold text-red-700">
            <XCircle className="h-3 w-3" /> Invalid
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {[
          ['Flat',     detail.flat_number    || '—'],
          ['Building', detail.building_name  || '—'],
          ['Host',     detail.host_name      || '—'],
          ['Type',     detail.visit_type_display],
          ['Status',   detail.status_display],
        ].map(([k, v]) => (
          <div key={k} className="space-y-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k}</div>
            <div className="font-semibold text-foreground">{v}</div>
          </div>
        ))}
        {detail.notes_for_guard && (
          <div className="col-span-2 space-y-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notes for Guard</div>
            <div className="font-medium text-foreground italic">{detail.notes_for_guard}</div>
          </div>
        )}
      </div>

      {detail.error_reason && (
        <div className="rounded-lg bg-red-100/30 border border-red-300/30 px-3 py-2 text-sm font-medium text-red-700">
          {detail.error_reason}
        </div>
      )}

      {detail.is_valid && (
        <Button className="w-full gap-1.5" onClick={onCheckIn} disabled={loading}>
          <CheckCircle2 className="h-4 w-4" />
          {loading ? 'Checking in…' : 'Check In Visitor'}
        </Button>
      )}
    </div>
  )
}

export default function QrVerify() {
  const qc = useQueryClient()
  const [code, setCode] = useState('')
  const [passDetail, setPassDetail] = useState(null)

  const { data: recentData } = useQuery({
    queryKey: ['qr-recent'],
    queryFn: () => guardService.getRecentScans().then((r) => r.data.data ?? []),
    refetchInterval: 30_000,
  })

  const { data: sampleData } = useQuery({
    queryKey: ['qr-samples'],
    queryFn: () => guardService.getSampleCodes().then((r) => r.data.data ?? []),
  })

  const verify = useMutation({
    mutationFn: (c) => guardService.verifyQR(c),
    onSuccess: (res) => setPassDetail(res.data.data),
    onError: (err) => {
      toast.error(err.response?.data?.message ?? 'Pass not found')
      setPassDetail(null)
      qc.invalidateQueries({ queryKey: ['qr-recent'] })
    },
  })

  const checkIn = useMutation({
    mutationFn: (c) => guardService.checkInQR(c),
    onSuccess: (res) => {
      toast.success(res.data.message ?? 'Visitor checked in')
      setPassDetail(null)
      setCode('')
      qc.invalidateQueries({ queryKey: ['qr-recent'] })
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Check-in failed'),
  })

  const recent = recentData ?? []
  const samples = sampleData ?? []

  return (
    <>
      <PageHeader
        title="QR / Passcode Verify"
        description="Scan or type a passcode to verify a pre-approved visitor pass"
      />

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Verify form */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">Enter Pass Code</h2>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (!code.trim()) return; setPassDetail(null); verify.mutate(code.trim()) }} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="code">QR Code / Passcode</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. MINIGATE-PASS-abc123…"
                    autoComplete="off"
                    className="flex-1 font-mono text-sm"
                  />
                  <Button type="submit" disabled={verify.isPending || !code.trim()} className="shrink-0">
                    {verify.isPending ? '…' : 'Verify'}
                  </Button>
                </div>
              </div>
            </form>

            {passDetail && (
              <PassDetailCard
                detail={passDetail}
                onCheckIn={() => checkIn.mutate(code.trim())}
                loading={checkIn.isPending}
              />
            )}
          </div>

          {/* Sample Valid Codes */}
          {samples.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-bold text-foreground">Sample Valid Codes</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {samples.map((sc) => (
                  <div key={sc.pass_id} className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="font-semibold text-sm text-foreground">{sc.full_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{sc.flat_display}</div>
                    {sc.valid_until && (
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Until {new Date(sc.valid_until).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                    <button onClick={() => { setCode(sc.qr_code); setPassDetail(null) }}
                      className="mt-2 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors">
                      Use This Code
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Verifications */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3.5">
            <span className="font-semibold text-sm text-foreground">Recent Verifications</span>
          </div>
          {recent.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No verifications yet.</p>
          )}
          <div className="max-h-[580px] overflow-y-auto divide-y divide-border">
            {recent.map((log) => (
              <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  log.is_valid ? 'bg-green-100/30 text-green-700' : 'bg-red-100/30 text-red-700'
                }`}>
                  {log.is_valid ? '✓' : '✗'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{log.full_name || 'Unknown'}</div>
                  <div className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
                    {log.pass_code && log.pass_code.length > 28 ? log.pass_code.slice(0, 28) + '…' : log.pass_code}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="text-xs font-semibold text-foreground">{log.time}</span>
                  {log.is_valid ? (
                    <span className="rounded-full bg-green-100/30 border border-green-300/30 px-1.5 py-0.5 text-[10px] font-bold text-green-700">Valid</span>
                  ) : (
                    <span className="rounded-full bg-red-100/30 border border-red-300/30 px-1.5 py-0.5 text-[10px] font-bold text-red-700">Invalid</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
