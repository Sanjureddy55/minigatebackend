import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Settings as SettingsIcon } from 'lucide-react'
import { platformService } from '../../services/platform.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { getErrorMessage } from '../../utils/formatters.js'

export default function PlatformSettings() {
  const { data, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => platformService.getSystemSettings().then((r) => r.data),
  })

  const [form, setForm] = useState({
    maintenance_mode: false,
    otp_validity_minutes: 10,
    max_login_attempts: 5,
    support_email: '',
  })

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const mutation = useMutation({
    mutationFn: (d) => platformService.updateSystemSettings(d),
    onSuccess: () => toast.success('Settings updated'),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  function submit(e) {
    e.preventDefault()
    mutation.mutate(form)
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="card-premium p-6 space-y-4 max-w-lg">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="shimmer h-3 w-24 rounded bg-muted" />
              <div className="shimmer h-9 w-full rounded-xl bg-muted" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="System Settings"
        description="Configure platform-wide system settings"
        actions={<SettingsIcon className="h-4 w-4 text-muted-foreground" />}
      />

      <div className="card-premium p-6 max-w-lg">
        <form onSubmit={submit} className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">Maintenance Mode</div>
              <div className="text-xs text-muted-foreground">Block all user logins during maintenance</div>
            </div>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, maintenance_mode: !p.maintenance_mode }))}
              className={`relative h-6 w-11 rounded-full transition-colors ${form.maintenance_mode ? 'bg-primary' : 'bg-muted'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.maintenance_mode ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>

          {[
            { label: 'OTP Validity (minutes)', key: 'otp_validity_minutes', type: 'number' },
            { label: 'Max Login Attempts', key: 'max_login_attempts', type: 'number' },
            { label: 'Support Email', key: 'support_email', type: 'email' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
              <input
                type={type}
                value={form[key] || ''}
                onChange={(e) => setForm((p) => ({ ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-teal w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {mutation.isPending ? 'Saving…' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  )
}
