import axios from 'axios'

// Load VITE_API_URL or fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Attach bearer access token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response Interceptor: Handle 401 Token Expirations & Refresh Flow
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Check if error is 401 and request has not been retried yet
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('refresh_token')

      if (refreshToken) {
        try {
          // Attempt token refresh from endpoint
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          })

          const { success, data } = response.data
          if (success && data) {
            const { access_token, refresh_token: newRefreshToken } = data

            // Save new tokens
            localStorage.setItem('access_token', access_token)
            localStorage.setItem('refresh_token', newRefreshToken)

            // Re-apply auth header to original request and retry it
            originalRequest.headers['Authorization'] = `Bearer ${access_token}`
            return apiClient(originalRequest)
          }
        } catch (refreshError) {
          // Refresh token is invalid/expired - clear storage and redirect
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          window.location.href = '/login?session_expired=true'
          return Promise.reject(refreshError)
        }
      }
    }

    // Return standardized error response body if available
    if (error.response && error.response.data) {
      return Promise.reject(error.response.data)
    }

    return Promise.reject({
      success: false,
      message: error.message || 'An unexpected network error occurred.',
      errors: [error.message],
    })
  }
)

export default apiClient
