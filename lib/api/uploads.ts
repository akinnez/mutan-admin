import api from './client'

export const uploadsApi = {
  upload: (formData: FormData) =>
    api.post('/admin/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  list: () => api.get('/admin/uploads'),
  getBatch: (id: string) => api.get(`/admin/uploads/${id}`),
  correctRow: (batchId: string, rowId: string, data: Record<string, any>) =>
    api.patch(`/admin/uploads/${batchId}/rows/${rowId}`, data),
  publish: (batchId: string) => api.post(`/admin/uploads/${batchId}/publish`),
  discard: (batchId: string) => api.delete(`/admin/uploads/${batchId}`),
}
