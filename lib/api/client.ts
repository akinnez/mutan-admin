import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

// No manual Authorization header, no js-cookie. The backend sets
// access_token/refresh_token as httpOnly cookies on login, so the browser
// attaches them to every request on its own — the token never passes
// through page JS, which is what actually protects it from XSS. This is
// the only reason `withCredentials` is here: without it, the browser
// won't send or accept cookies cross-origin.
export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 60_000 // 60 seconds
})

// Silent refresh on 401 — no token to read or attach, the refresh_token
// cookie (scoped to /api/v1/auth) rides along automatically.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true
      try {
        await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true })
        return api(original)
      } catch {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api
