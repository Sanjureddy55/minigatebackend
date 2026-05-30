import api from '../api/axios.js'

const BASE = '/security-guard'

export const guardService = {
  // ── Dashboard ───────────────────────────────────────────────
  getDashboard: () => api.get(`${BASE}/dashboard/`),

  // ── Visitor Entry / Gate Log ──────────────────────────────────
  registerVisitor: (data) => api.post(`${BASE}/visitor-entry/`, data),
  getGateLog:      (params) => api.get(`${BASE}/visitor-log/`, { params }),
  rejectVisitor:   (id)   => api.post(`${BASE}/visitor-log/${id}/reject/`),
  checkOutVisitor: (id)   => api.post(`${BASE}/visitor-log/${id}/check-out/`),
  approveVisitor:  (id)   => api.post(`${BASE}/visitor-log/${id}/approve/`),
  checkInVisitor:  (id)   => api.post(`${BASE}/visitor-log/${id}/check-in/`),

  // ── Entry / Exit Logs (gate-entry full log) ───────────────────
  getEntryExitLog:    (params) => api.get(`${BASE}/gate-entry/log/`,          { params }),
  exportEntryExitLog: (params) => api.get(`${BASE}/gate-entry/log/export/`,   { params, responseType: 'blob' }),

  // ── QR / Passcode ────────────────────────────────────────────
  verifyQR:         (code) => api.post(`${BASE}/qr-passcode/verify/`,   { code }),
  checkInQR:        (code) => api.post(`${BASE}/qr-passcode/checkin/`,  { code }),
  getRecentScans:   ()     => api.get(`${BASE}/qr-passcode/recent/`),
  getSampleCodes:   ()     => api.get(`${BASE}/qr-passcode/sample-codes/`),

  // ── Delivery Verify ──────────────────────────────────────────
  getDeliveries:    (params)        => api.get(`${BASE}/delivery-verify/`,                   { params }),
  createDelivery:   (data)          => api.post(`${BASE}/delivery-verify/`,                  data),
  approveDelivery:  (id)            => api.post(`${BASE}/delivery-verify/${id}/approve/`),
  rejectDelivery:   (id, reason)    => api.post(`${BASE}/delivery-verify/${id}/reject/`,     { reason }),
  generateOTP:      (id)            => api.post(`${BASE}/delivery-verify/${id}/generate-otp/`),
  verifyOTP:        (id, otp_code)  => api.post(`${BASE}/delivery-verify/${id}/verify-otp/`, { otp_code }),
  deliveryAtGate:   (id, notes)     => api.post(`${BASE}/delivery-verify/${id}/at-gate/`,    { notes }),
  deliverySummary:  ()              => api.get(`${BASE}/delivery-verify/summary/`),

  // ── Approved Visitors ────────────────────────────────────────
  getApprovedVisitors: (params)    => api.get(`${BASE}/approved-visitors/`,          { params }),
  getApprovedStats:    ()          => api.get(`${BASE}/approved-visitors/stats/`),
  checkInApproved:     (source, id) => api.post(`${BASE}/approved-visitors/checkin/`, { source, id }),
  exportApproved:      ()          => `${BASE}/approved-visitors/export/`,

  // ── Emergency Alerts ─────────────────────────────────────────
  getAlerts:        (params) => api.get(`${BASE}/emergency-alerts/`,                  { params }),
  getAlertStats:    ()       => api.get(`${BASE}/emergency-alerts/stats/`),
  createAlert:      (data)   => api.post(`${BASE}/emergency-alerts/`,                 data),
  acknowledgeAlert: (id)     => api.post(`${BASE}/emergency-alerts/${id}/acknowledge/`),
  resolveAlert:     (id, data) => api.post(`${BASE}/emergency-alerts/${id}/resolve/`, data),

  // ── Contact Resident ─────────────────────────────────────────
  getContacts:       (params)  => api.get(`${BASE}/contact-resident/`,           { params }),
  getContactStats:   ()        => api.get(`${BASE}/contact-resident/stats/`),
  getContactDetail:  (flatId)  => api.get(`${BASE}/contact-resident/${flatId}/`),

  // ── Emergency Alerts (bulk) ───────────────────────────────────
  acknowledgeAllAlerts: () => api.post(`${BASE}/emergency-alerts/acknowledge-all/`),
}
