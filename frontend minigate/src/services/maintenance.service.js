import api from '../api/axios.js'

const BASE = '/maintenance-staff'

export const maintenanceService = {
  // Dashboard
  getDashboard: () => api.get(`${BASE}/dashboard/`),

  // Assigned Tasks
  getTasks:      (params) => api.get(`${BASE}/assigned-tasks/`,      { params }),
  getTask:       (id)     => api.get(`${BASE}/assigned-tasks/${id}/`),
  createTask:    (data)   => api.post(`${BASE}/assigned-tasks/`,     data),
  startTask:     (id)     => api.patch(`${BASE}/assigned-tasks/${id}/start/`),
  completeTask:  (id, data) => api.patch(`${BASE}/assigned-tasks/${id}/complete/`, data),

  // Task Updates
  getTaskUpdates:  (taskId)  => api.get(`${BASE}/task-updates/`,  { params: { task: taskId } }),
  addTaskUpdate:   (data)    => api.post(`${BASE}/task-updates/`,  data),

  // Materials Request
  getMaterials:    (params) => api.get(`${BASE}/materials-request/`,      { params }),
  createMaterial:  (data)   => api.post(`${BASE}/materials-request/`,     data),
  updateMaterial:  (id, data) => api.patch(`${BASE}/materials-request/${id}/`, data),

  // Schedule
  getSchedule: (params) => api.get(`${BASE}/schedule/`, { params }),

  // Work History
  getWorkHistory: (params) => api.get(`${BASE}/work-history/`, { params }),
}
