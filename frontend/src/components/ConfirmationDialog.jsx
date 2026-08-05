import React, { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmationDialog({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
}) {
  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Escape key handler to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
      />

      {/* Modal Dialog box */}
      <div className="relative w-full max-w-md rounded-xl bg-card border shadow-2xl glass-panel p-6 z-10 transition-all transform scale-100 flex flex-col gap-4">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Dialog Header & Icon */}
        <div className="flex gap-4 items-start">
          <div 
            className={`p-3 rounded-full flex-shrink-0 ${
              isDestructive 
                ? 'bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400' 
                : 'bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 id="dialog-title" className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            <p id="dialog-description" className="text-sm text-muted-foreground leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Dialog Action Buttons */}
        <div className="flex justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors bg-background"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm()
              onCancel()
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg text-white shadow-sm transition-colors ${
              isDestructive 
                ? 'bg-destructive hover:bg-destructive/90 focus:ring-destructive' 
                : 'bg-primary hover:bg-primary/90 focus:ring-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
