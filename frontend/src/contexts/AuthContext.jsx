import React, { createContext, useContext, useState, useEffect } from 'react'
import apiClient from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Initialize Auth state from localStorage
  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('access_token')
      const storedUser = localStorage.getItem('user')

      if (token && storedUser) {
        try {
          setUser(JSON.parse(storedUser))
          // Refresh user data in background to ensure up-to-date role/status
          const response = await apiClient.get('/api/auth/me')
          if (response.data.success) {
            const freshUser = response.data.data
            setUser(freshUser)
            localStorage.setItem('user', JSON.stringify(freshUser))
          }
        } catch (error) {
          console.error('Failed to load user session:', error)
          // If token refresh fails in interceptor, it will automatically log out
        }
      }
      setLoading(false)
    }
    loadUser()
  }, [])

  // Login handler
  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/api/auth/login', { email, password })
      const { success, data, message } = response.data

      if (success && data) {
        const { access_token, refresh_token, user: userData } = data
        
        localStorage.setItem('access_token', access_token)
        localStorage.setItem('refresh_token', refresh_token)
        localStorage.setItem('user', JSON.stringify(userData))
        
        setUser(userData)
        return { success: true, message }
      }
      return { success: false, message: message || 'Login failed.' }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Invalid email or password.',
        errors: error.errors || []
      }
    }
  }

  // Logout handler
  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      try {
        // Notify backend about logout to revoke refresh token
        await apiClient.post('/api/auth/logout', { refresh_token: refreshToken })
      } catch (error) {
        console.error('Error logging out from server:', error)
      }
    }
    
    // Clear storage and state
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
