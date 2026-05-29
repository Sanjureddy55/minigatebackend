import api from '../api/axios.js'

const BASE = '/support-staff'

export const supportService = {
  // Dashboard
  getDashboard: () => api.get(`${BASE}/dashboard/`),

  // Assigned Tickets
  getTickets:     (params) => api.get(`${BASE}/assigned-tickets/`,      { params }),
  getTicket:      (id)     => api.get(`${BASE}/assigned-tickets/${id}/`),
  createTicket:   (data)   => api.post(`${BASE}/assigned-tickets/`,     data),
  pickupTicket:   (id)     => api.patch(`${BASE}/assigned-tickets/${id}/pickup/`),
  resolveTicket:  (id, data) => api.patch(`${BASE}/assigned-tickets/${id}/resolve/`, data),

  // Ticket Updates
  getTicketUpdates: (ticketId) => api.get(`${BASE}/ticket-updates/`, { params: { ticket: ticketId } }),
  addTicketUpdate:  (data)     => api.post(`${BASE}/ticket-updates/`, data),

  // Escalations
  getEscalations:  (params) => api.get(`${BASE}/escalations/`,    { params }),
  createEscalation: (data)  => api.post(`${BASE}/escalations/`,   data),

  // Service History
  getServiceHistory: (params) => api.get(`${BASE}/service-history/`, { params }),
}
