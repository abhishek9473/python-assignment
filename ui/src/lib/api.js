import axios from 'axios'

const TOKEN_KEY = 'flowboard.tokens'

export const readTokens = () => {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY)) } catch { return null }
}

export const storeTokens = (tokens) => localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
export const clearTokens = () => localStorage.removeItem(TOKEN_KEY)

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const tokens = readTokens()
  if (tokens?.access) config.headers.Authorization = `Bearer ${tokens.access}`
  return config
})

let refreshRequest = null
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const tokens = readTokens()
    if (error.response?.status !== 401 || original?._retried || !tokens?.refresh || original?.url?.includes('/auth/token/')) {
      return Promise.reject(error)
    }
    original._retried = true
    try {
      refreshRequest ??= axios.post(`${api.defaults.baseURL}/auth/token/refresh/`, { refresh: tokens.refresh })
      const { data } = await refreshRequest
      storeTokens({ ...tokens, ...data })
      original.headers.Authorization = `Bearer ${data.access}`
      return api(original)
    } catch (refreshError) {
      clearTokens()
      return Promise.reject(refreshError)
    } finally {
      refreshRequest = null
    }
  },
)

export default api
