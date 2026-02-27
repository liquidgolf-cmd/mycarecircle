import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach auth token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cc_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401, clear local session and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cc_access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
