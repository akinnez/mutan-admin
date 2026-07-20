import api from './client'

export const settingsApi = {
  getLock: () => api.get('/admin/settings/lock'),
  updateLock: (data: Record<string, any>) => api.patch('/admin/settings/lock', data),
}
