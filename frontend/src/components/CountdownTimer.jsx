import React, { useEffect, useState } from 'react'
import { AlertTriangle, Clock } from 'lucide-react'

export default function CountdownTimer({
  initialSeconds = 0,
  onExpire,
  className = '',
}) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)

  useEffect(() => {
    setSecondsLeft(initialSeconds)
  }, [initialSeconds])

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (onExpire) onExpire()
      return
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [secondsLeft, onExpire])

  const formatTime = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const isLowTime = secondsLeft < 5 * 60 // Less than 5 minutes

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm tracking-wider shadow-xs ${
      isLowTime
        ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400 animate-pulse'
        : 'bg-card text-foreground'
    } ${className}`}>
      <Clock className={`w-4.5 h-4.5 ${isLowTime ? 'text-rose-500' : 'text-primary'}`} />
      <span>{formatTime(secondsLeft)}</span>
      
      {isLowTime && secondsLeft > 0 && (
        <span className="hidden sm:inline text-[10px] font-semibold uppercase text-rose-500 tracking-normal ml-1">
          Low Time Warning
        </span>
      )}
    </div>
  )
}
