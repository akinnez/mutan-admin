import api from './client'

export const authApi = {
  login: (data: { phone_number: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.patch('/auth/change-password', data),
}
