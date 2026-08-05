import React, { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showRestored, setShowRestored] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowRestored(true)
      // Hide restored alert after 3 seconds
      const timer = setTimeout(() => {
        setShowRestored(false)
      }, 3000)
      return () => clearTimeout(timer)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowRestored(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOnline) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-6 py-3.5 rounded-xl border border-rose-700 shadow-2xl flex items-center gap-3 animate-bounce">
        <WifiOff className="w-5 h-5 text-white flex-shrink-0" />
        <div className="flex flex-col text-left">
          <span className="font-bold text-sm leading-none mb-1">Network Connection Lost</span>
          <span className="text-[10px] text-white/90 leading-tight">Your time keeps running. Do not refresh. Local auto-saves are active.</span>
        </div>
      </div>
    )
  }

  if (showRestored) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-xl border border-emerald-700 shadow-xl flex items-center gap-2.5 animate-fade-in text-xs font-semibold uppercase tracking-wider">
        <Wifi className="w-4 h-4 text-white" />
        <span>Connection Restored. Syncing answers...</span>
      </div>
    )
  }

  return null
}
