import React from 'react'

export default function Loader({ size = 'medium', className = '' }) {
  const sizeClasses = {
    small: 'w-5 h-5 border-2',
    medium: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4',
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer spinning ring */}
      <div
        className={`${
          sizeClasses[size] || sizeClasses.medium
        } rounded-full border-muted animate-spin border-t-primary border-r-transparent border-b-transparent border-l-transparent`}
        role="status"
        aria-label="loading"
      />
      {/* Accessibility screen-reader fallback */}
      <span className="sr-only">Loading content...</span>
    </div>
  )
}
