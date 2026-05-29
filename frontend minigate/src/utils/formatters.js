export function formatCurrency(amount, currency = 'INR') {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

export function formatDate(dateStr, opts = {}) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date)) return '—'
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...opts,
  })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date)) return '—'
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatMonthLabel(monthStr) {
  if (!monthStr) return '—'
  const date = new Date(monthStr)
  if (isNaN(date)) return monthStr
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export function formatNumber(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-IN').format(Number(n))
}

export function truncate(str, len = 40) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '…' : str
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function getErrorMessage(error) {
  if (!error) return 'An unexpected error occurred.'
  const data = error.response?.data
  if (!data) return error.message || 'Network error.'
  if (typeof data === 'string') return data
  if (data.message) return data.message
  if (data.detail) return data.detail
  const firstField = Object.keys(data)[0]
  if (firstField) {
    const val = data[firstField]
    return `${firstField}: ${Array.isArray(val) ? val[0] : val}`
  }
  return 'An unexpected error occurred.'
}
