import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Download, FileSpreadsheet, Plus, X,
  CheckCircle2, AlertCircle, Paperclip, Trash2,
  ChevronLeft, ChevronRight, RefreshCw, Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { societyService } from '../../services/society.service.js'
import { downloadBlob, getErrorMessage } from '../../utils/formatters.js'

// ── Helpers ───────────────────────────────────────────────────────────────────
function inr(amount) {
  if (amount == null) return '—'
  const n = Number(amount)
  if (isNaN(n)) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n)
}

function Bone({ className = '' }) {
  return <div className={`rounded bg-muted animate-pulse ${className}`} />
}

// ── Generate Statement Modal ──────────────────────────────────────────────────
function GenerateModal({ existing, onClose }) {
  const qc  = useQueryClient()
  const now = new Date()
  const [form, setForm] = useState({
    year:            existing?.month ? Number(existing.month.slice(0, 4)) : now.getFullYear(),
    month:           existing?.month ? Number(existing.month.slice(5, 7)) : now.getMonth() + 1,
    opening_balance: '',
    notes:           existing?.notes || '',
  })

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  const mut = useMutation({
    mutationFn: (data) => societyService.generateStatement(data),
    onSuccess: (res) => {
      const verb = res.data?.message?.includes('regenerated') ? 'regenerated' : 'generated'
      toast.success(`Statement ${verb} successfully`)
      qc.invalidateQueries({ queryKey: ['society-statements'] })
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.detail || getErrorMessage(err)),
  })

  function submit(e) {
    e.preventDefault()
    mut.mutate({
      year:  form.year,
      month: form.month,
      ...(form.opening_balance !== '' && { opening_balance: Number(form.opening_balance) }),
      notes: form.notes,
    })
  }

  const ic = 'w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30'
  const lc = 'text-xs font-medium text-muted-foreground block mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="font-bold text-foreground text-base">
              {existing ? 'Regenerate Statement' : 'Generate Statement'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Financials are computed automatically from dues & expenses.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full w-7 h-7 border border-border flex items-center justify-center hover:bg-muted">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Year + Month */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lc}>Year *</label>
              <select value={form.year} onChange={e => setForm(p => ({ ...p, year: Number(e.target.value) }))} className={ic}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className={lc}>Month *</label>
              <select value={form.month} onChange={e => setForm(p => ({ ...p, month: Number(e.target.value) }))} className={ic}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Opening balance (optional) */}
          <div>
            <label className={lc}>Opening Balance (₹) — optional</label>
            <input type="number" min="0" value={form.opening_balance}
              onChange={e => setForm(p => ({ ...p, opening_balance: e.target.value }))}
              placeholder="Leave blank to auto-carry from previous month"
              className={ic} />
            <p className="text-xs text-muted-foreground mt-1">
              If blank, the previous month's closing balance is used automatically.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className={lc}>Notes (optional)</label>
            <textarea value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2} placeholder="Any remarks for this statement…" className={ic} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mut.isPending}
              className="flex-1 btn-teal rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
              {mut.isPending ? 'Generating…' : existing ? 'Regenerate' : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Upload Proof Modal ────────────────────────────────────────────────────────
function UploadProofModal({ statement, onClose }) {
  const qc     = useQueryClient()
  const fileRef = useRef(null)
  const [files, setFiles] = useState([])

  function handleFiles(e) {
    const picked = Array.from(e.target.files || [])
    const valid  = picked.filter(f => f.size <= 20 * 1024 * 1024)
    if (valid.length < picked.length) toast.error('Some files exceed 20 MB and were skipped')
    setFiles(prev => [...prev, ...valid].slice(0, 10))
  }

  const mut = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      files.forEach(f => fd.append('files', f))
      return societyService.uploadStatementProof(statement.id, fd)
    },
    onSuccess: () => {
      toast.success(`${files.length} file(s) uploaded`)
      qc.invalidateQueries({ queryKey: ['society-statements'] })
      onClose()
    },
    onError: e => toast.error(getErrorMessage(e)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="font-bold text-foreground text-base">Upload Proof Documents</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{statement.title} — up to 10 files</p>
          </div>
          <button onClick={onClose} className="rounded-full w-7 h-7 border border-border flex items-center justify-center hover:bg-muted">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Drop zone */}
          <div onClick={() => fileRef.current?.click()}
            className="rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/30 hover:bg-teal-50/60 transition-colors cursor-pointer p-6 text-center">
            <Upload className="h-8 w-8 text-teal-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-teal-700">Click to select files</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG — max 20 MB each, up to 10 files</p>
          </div>
          <input ref={fileRef} type="file" multiple className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFiles} />

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/30 border border-border px-3 py-2">
                  <Paperclip className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                  <span className="text-xs text-foreground flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {(f.size / 1024).toFixed(0)} KB
                  </span>
                  <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-red-500 shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button onClick={() => mut.mutate()} disabled={files.length === 0 || mut.isPending}
              className="flex-1 btn-teal rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
              {mut.isPending ? 'Uploading…' : `Upload ${files.length > 0 ? `(${files.length})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Statement Card ────────────────────────────────────────────────────────────
function StatementCard({ stmt }) {
  const qc = useQueryClient()
  const [showUpload, setShowUpload] = useState(false)

  const publishMut = useMutation({
    mutationFn: () => stmt.is_published
      ? societyService.unpublishStatement(stmt.id)
      : societyService.publishStatement(stmt.id),
    onSuccess: () => {
      toast.success(stmt.is_published ? 'Statement unpublished' : 'Statement published — residents can now see it')
      qc.invalidateQueries({ queryKey: ['society-statements'] })
    },
    onError: e => toast.error(getErrorMessage(e)),
  })

  const pdfMut = useMutation({
    mutationFn: () => societyService.downloadStatementPdf(stmt.id),
    onSuccess: (res) => downloadBlob(res.data, `${stmt.title?.replace(/ /g, '_')}.pdf`),
    onError: e => toast.error(getErrorMessage(e)),
  })

  const xlsMut = useMutation({
    mutationFn: () => societyService.exportStatementExcel(stmt.id),
    onSuccess: (res) => downloadBlob(res.data, `${stmt.title?.replace(/ /g, '_')}.xlsx`),
    onError: e => toast.error(getErrorMessage(e)),
  })

  const deleteProofMut = useMutation({
    mutationFn: (docId) => societyService.deleteStatementProof(stmt.id, docId),
    onSuccess: () => {
      toast.success('Proof document removed')
      qc.invalidateQueries({ queryKey: ['society-statements'] })
    },
    onError: e => toast.error(getErrorMessage(e)),
  })

  // All proof documents: URLs from expenses + uploaded files
  const proofUrls   = (stmt.proof_documents || [])
  const uploadedDocs = stmt.uploaded_proofs || []

  const KPI_CARDS = [
    { label: 'Opening Balance',   value: inr(stmt.opening_balance) },
    { label: 'Collected',         value: inr(stmt.total_collected) },
    { label: 'Expenses',          value: inr(stmt.total_expenses)  },
    { label: 'Remaining Balance', value: inr(stmt.closing_balance) },
  ]

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* ── Card Header ── */}
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-foreground">{stmt.title}</h2>
          {stmt.is_published && stmt.published_date && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Published on {stmt.published_date}
            </p>
          )}
          {!stmt.is_published && (
            <span className="inline-flex items-center gap-1 mt-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
              <AlertCircle className="h-3 w-3" /> Draft
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Upload proof */}
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Upload className="h-4 w-4" /> Upload Proof
          </button>
          {/* Excel */}
          <button onClick={() => xlsMut.mutate()} disabled={xlsMut.isPending}
            className="flex items-center gap-1.5 rounded-xl border border-green-300 bg-green-50 text-green-700 px-3 py-2 text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50">
            <FileSpreadsheet className="h-4 w-4" />
            {xlsMut.isPending ? 'Exporting…' : 'Export Excel'}
          </button>
          {/* PDF */}
          <button onClick={() => pdfMut.mutate()} disabled={pdfMut.isPending}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">
            <Download className="h-4 w-4" />
            {pdfMut.isPending ? 'Downloading…' : 'Download PDF'}
          </button>
          {/* Publish / Unpublish */}
          <button onClick={() => publishMut.mutate()} disabled={publishMut.isPending}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50
              ${stmt.is_published
                ? 'border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'btn-teal'}`}>
            {stmt.is_published
              ? <><AlertCircle className="h-4 w-4" />{publishMut.isPending ? 'Unpublishing…' : 'Unpublish'}</>
              : <><CheckCircle2 className="h-4 w-4" />{publishMut.isPending ? 'Publishing…' : 'Publish Statement'}</>
            }
          </button>
        </div>
      </div>

      {/* ── 4 KPI mini cards ── */}
      <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
        {KPI_CARDS.map(({ label, value }) => (
          <div key={label} className="bg-card px-5 py-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-extrabold text-foreground tabular-nums mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Proof Documents ── */}
      {(proofUrls.length > 0 || uploadedDocs.length > 0) && (
        <div className="px-6 py-4 border-t border-border">
          <p className="text-sm font-semibold text-foreground mb-3">Proof Documents</p>
          <div className="flex flex-wrap gap-2">
            {/* Expense proof URLs */}
            {proofUrls.map((url, i) => {
              const name = url.split('/').pop()
              return (
                <a key={`url-${i}`} href={url.startsWith('http') ? url : undefined}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                  <Paperclip className="h-3 w-3 text-teal-600 shrink-0" />
                  <span className="truncate max-w-[160px]">{name}</span>
                </a>
              )
            })}
            {/* Uploaded proof files */}
            {uploadedDocs.map((doc) => (
              <div key={`doc-${doc.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700">
                <Paperclip className="h-3 w-3 shrink-0" />
                <a href={doc.file_url} target="_blank" rel="noreferrer"
                  className="hover:underline truncate max-w-[140px]">
                  {doc.original_name}
                </a>
                <button onClick={() => deleteProofMut.mutate(doc.id)}
                  disabled={deleteProofMut.isPending}
                  className="text-teal-400 hover:text-red-500 transition-colors ml-1 disabled:opacity-40">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Summary text ── */}
      {stmt.summary && (
        <div className="px-6 py-4 border-t border-border bg-muted/10">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Summary: </span>
            {stmt.summary}
          </p>
        </div>
      )}

      {/* ── Notes ── */}
      {stmt.notes && (
        <div className="px-6 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Notes: </span>{stmt.notes}
          </p>
        </div>
      )}

      {showUpload && (
        <UploadProofModal statement={stmt} onClose={() => setShowUpload(false)} />
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 6

export default function SocietyStatements() {
  const qc = useQueryClient()
  const [page, setPage]     = useState(1)
  const [showGenerate, setShowGenerate] = useState(false)

  const { data: raw, isLoading } = useQuery({
    queryKey: ['society-statements', page],
    queryFn:  () => societyService.getStatements({ page, page_size: PAGE_SIZE })
                     .then(r => r.data),
    staleTime: 30_000,
  })

  const statements = raw?.results ?? []
  const total      = raw?.count   ?? 0
  const pages      = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 space-y-6">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monthly Statements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate, publish and export monthly maintenance fund statements.
          </p>
        </div>
        <button
          onClick={() => setShowGenerate(true)}
          className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shrink-0"
        >
          <Plus className="h-4 w-4" /> Generate Statement
        </button>
      </div>

      {/* ── STATEMENT CARDS ── */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex justify-between">
                <Bone className="h-5 w-48" />
                <div className="flex gap-2">
                  <Bone className="h-9 w-28 rounded-xl" />
                  <Bone className="h-9 w-28 rounded-xl" />
                  <Bone className="h-9 w-32 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-px bg-border">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="bg-card px-5 py-4">
                    <Bone className="h-2.5 w-24 mb-2" />
                    <Bone className="h-7 w-28" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : statements.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <FileText className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">No statements yet</p>
          <p className="text-xs text-muted-foreground mb-4">
            Generate your first monthly statement to track financials.
          </p>
          <button onClick={() => setShowGenerate(true)}
            className="btn-teal rounded-xl px-5 py-2 text-sm font-semibold inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Generate Statement
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {statements.map(stmt => (
            <StatementCard key={stmt.id} stmt={stmt} />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing <strong>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</strong> of <strong>{total}</strong> statements
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-40 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                className={`rounded-lg min-w-[32px] h-8 text-xs font-medium transition-colors
                  ${page === n ? 'bg-teal-500 text-white' : 'border border-border hover:bg-muted'}`}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}
              className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-40 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {showGenerate && <GenerateModal onClose={() => setShowGenerate(false)} />}
    </div>
  )
}
