import api from '../api/axios.js'

const BASE = '/guest-user/access-pass'

export const guestService = {
  getAccessPass:  () => api.get(`${BASE}/`),
  getQRCode:      () => api.get(`${BASE}/qr/`),
  getEntryStatus: () => api.get(`${BASE}/entry-status/`),
}
