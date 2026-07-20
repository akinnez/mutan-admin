import api from './client'

export const assetsApi = {
  list: () => api.get('/admin/assets'),
  getOne: (id: string) => api.get(`/admin/assets/${id}`),
  create: (data: Record<string, any>) => api.post('/admin/assets', data),
  update: (id: string, data: Record<string, any>) => api.patch(`/admin/assets/${id}`, data),
  applyDepreciation: () => api.post('/admin/assets/apply-depreciation'),
  distributeIncome: (data: Record<string, any>) => api.post('/admin/assets/distribute-income', data),
}
