import api from './client'

export const notificationsApi = {
  summary: () => api.get('/admin/notifications/summary'),
  list: (params?: { page?: number; limit?: number; unread_only?: boolean; type?: string }) =>
    api.get('/admin/notifications', { params }),
  markRead: (id: string) => api.patch(`/admin/notifications/${id}/read`),
  markAllRead: () => api.patch('/admin/notifications/read-all'),
}
