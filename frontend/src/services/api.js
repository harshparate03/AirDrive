import axios from 'axios'

const DEFAULT_API_URL = import.meta.env.PROD
  ? 'https://airdrive-backend-6k4c.onrender.com/api'
  : '/api'

const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('refreshToken')

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
          const { accessToken, refreshToken: newRefresh } = response.data
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', newRefresh)
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        } catch (_) {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          window.location.href = '/login'
        }
      } else {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api

// File-specific API with upload progress
export const uploadFiles = (formData, onProgress) => {
  return api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1))
      onProgress?.(progress)
    },
    timeout: 300000, // 5 min for large files
  })
}

export const downloadFile = (fileId, options = {}) => {
  return api.get(`/files/${fileId}/download`, { responseType: 'blob', timeout: 30000, ...options })
}

// Preview a shared file (inline) without full download
export const sharePreviewUrl = (token, password) => {
  const query = new URLSearchParams()
  if (password) query.set('password', password)
  const qs = query.toString()
  return `${API_URL}/share/${token}/preview${qs ? `?${qs}` : ''}`
}

export const sharePreview = (token, password) => api.get(`/share/${token}/preview`, {
  params: { password },
  responseType: 'blob',
})

// Download a shared file through the proxy (respects downloadDisabled)
export const shareDownload = (token, password) => {
  return api.get(`/share/${token}/download`, {
    params: { password },
    responseType: 'blob',
  })
}
