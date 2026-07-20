import api from './client'

export const reportsApi = {
  summary: () => api.get('/admin/reports/summary'),
  downloadMembers: () =>
    api.get('/admin/reports/members', { responseType: 'blob' }),
  downloadScheme: (id: string) =>
    api.get(`/admin/reports/schemes/${id}`, { responseType: 'blob' }),
  downloadAgm: () =>
    api.get('/admin/reports/agm', { responseType: 'blob' }),
  auditLog: (params?: Record<string, any>) =>
    api.get('/admin/reports/audit-log', { params }),
  // Admin picks ONE category per generation, scoped to that month only.
  downloadMonthly: (category: string, month: string) =>
    api.get('/admin/reports/monthly', { params: { category, month }, responseType: 'blob' }),
}
