import React, { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])

    setTimeout(() => {
      removeToast(id)
    }, duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getTypeStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
      case 'error':
        return 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300'
      default:
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300'
    }
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      
      {/* Toast container overlay */}
      <div 
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            aria-live="assertive"
            className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg glass-panel transition-all duration-300 ease-out transform translate-y-0 scale-100 ${getTypeStyles(
              t.type
            )}`}
          >
            <div className="flex-shrink-0 mt-0.5">{getIcon(t.type)}</div>
            <div className="flex-grow text-sm font-medium pr-2">{t.message}</div>
            <button
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
