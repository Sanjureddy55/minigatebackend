import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { selectSociety } from '../../store/slices/authSlice.js'
import { societyService } from '../../services/society.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { getErrorMessage } from '../../utils/formatters.js'

export default function SocietySettings() {
  const society = useSelector(selectSociety)

  const { data, isLoading } = useQuery({
    queryKey: ['society-settings', society?.id],
    queryFn: () => societyService.getSettings(society?.id).then((r) => r.data?.data || r.data),
  })

  const [form, setForm] = useState({
    society_name: '',
    address: '',
    city: '',
    contact_email: '',
    contact_phone: '',
    maintenance_due_day: 5,
    late_fee_percentage: 0,
    allow_visitor_self_checkin: false,
    enable_notifications: true,
    enable_complaint_auto_assign: false,
  })

  useEffect(() => {
    if (data) {
      setForm((prev) => ({ ...prev, ...data }))
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: (payload) => societyService.updateSettings(society?.id, payload),
    onSuccess: () => toast.success('Settings saved'),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const Field = ({ label, children }) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )

  const Toggle = ({ label, description, value, onChange }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-primary' : 'bg-muted'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Settings" description="Configure your society settings" />
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-premium p-4 space-y-2">
              <div className="shimmer h-3 w-32 rounded bg-muted" />
              <div className="shimmer h-8 w-full rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Settings" description="Configure your society settings" />

      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-6 max-w-2xl">
        <div className="card-premium p-6 space-y-4">
          <h3 className="font-semibold text-foreground">General Information</h3>
          <Field label="Society Name">
            <input
              value={form.society_name}
              onChange={(e) => setForm((p) => ({ ...p, society_name: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </Field>
          <Field label="Address">
            <input
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City">
              <input
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </Field>
            <Field label="Contact Phone">
              <input
                value={form.contact_phone}
                onChange={(e) => setForm((p) => ({ ...p, contact_phone: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </Field>
          </div>
          <Field label="Contact Email">
            <input
              type="email" value={form.contact_email}
              onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </Field>
        </div>

        <div className="card-premium p-6 space-y-4">
          <h3 className="font-semibold text-foreground">Financial Settings</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Maintenance Due Day (of month)">
              <input
                type="number" min="1" max="28" value={form.maintenance_due_day}
                onChange={(e) => setForm((p) => ({ ...p, maintenance_due_day: Number(e.target.value) }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </Field>
            <Field label="Late Fee (%)">
              <input
                type="number" min="0" max="100" step="0.5" value={form.late_fee_percentage}
                onChange={(e) => setForm((p) => ({ ...p, late_fee_percentage: Number(e.target.value) }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </Field>
          </div>
        </div>

        <div className="card-premium p-6">
          <h3 className="font-semibold text-foreground mb-4">Features</h3>
          <Toggle
            label="Visitor Self Check-in"
            description="Allow visitors to self check-in via QR code"
            value={form.allow_visitor_self_checkin}
            onChange={(v) => setForm((p) => ({ ...p, allow_visitor_self_checkin: v }))}
          />
          <Toggle
            label="Push Notifications"
            description="Send notifications to residents for important updates"
            value={form.enable_notifications}
            onChange={(v) => setForm((p) => ({ ...p, enable_notifications: v }))}
          />
          <Toggle
            label="Auto-Assign Complaints"
            description="Automatically assign complaints to available staff"
            value={form.enable_complaint_auto_assign}
            onChange={(v) => setForm((p) => ({ ...p, enable_complaint_auto_assign: v }))}
          />
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-teal rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {mutation.isPending ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
