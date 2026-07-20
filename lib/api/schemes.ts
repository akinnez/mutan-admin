import api from './client'

export const schemesApi = {
  list: () => api.get('/admin/schemes'),
  getOne: (id: string) => api.get(`/admin/schemes/${id}`),
  create: (data: Record<string, any>) => api.post('/admin/schemes', data),
  update: (id: string, data: Record<string, any>) => api.patch(`/admin/schemes/${id}`, data),
  toggle: (id: string) => api.patch(`/admin/schemes/${id}/toggle`),
}
