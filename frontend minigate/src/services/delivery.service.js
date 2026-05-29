import api from '../api/axios.js'

const BASE = '/delivery-partner'

export const deliveryService = {
  getDashboard:      () => api.get(`${BASE}/dashboard/`),

  getDeliveries:     (params) => api.get(`${BASE}/active-deliveries/`, { params }),
  pickupDelivery:    (id) => api.patch(`${BASE}/active-deliveries/${id}/pickup/`),
  markDelivered:     (id, data) => api.patch(`${BASE}/active-deliveries/${id}/delivered/`, data),
  markFailed:        (id, data) => api.patch(`${BASE}/active-deliveries/${id}/failed/`, data),

  getHistory:        (params) => api.get(`${BASE}/delivery-history/`, { params }),

  getAccessPass:     () => api.get(`${BASE}/access-pass/`),
  getQRCode:         () => api.get(`${BASE}/access-pass/qr/`),
  getEntryStatus:    () => api.get(`${BASE}/access-pass/entry-status/`),
}
