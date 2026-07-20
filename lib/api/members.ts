import api from './client'

export const membersApi = {
  list: (params?: Record<string, any>) => api.get('/admin/members', { params }),
  getOne: (id: string) => api.get(`/admin/members/${id}`),
  add: (data: Record<string, any>) => api.post('/admin/members', data),
  update: (id: string, data: Record<string, any>) => api.patch(`/admin/members/${id}`, data),
  resetAccess: (id: string) => api.post(`/admin/members/${id}/reset-access`),
  getTransactions: (id: string, params?: Record<string, any>) =>
    api.get(`/admin/members/${id}/transactions`, { params }),
  import: (formData: FormData) =>
    api.post('/admin/members/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
}
