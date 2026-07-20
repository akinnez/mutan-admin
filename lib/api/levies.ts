import api from './client'

export const leviesApi = {
  list: () => api.get('/admin/levies'),
  create: (data: Record<string, any>) => api.post('/admin/levies', data),
  update: (id: string, data: Record<string, any>) => api.patch(`/admin/levies/${id}`, data),
  toggle: (id: string) => api.patch(`/admin/levies/${id}/toggle`),
}
