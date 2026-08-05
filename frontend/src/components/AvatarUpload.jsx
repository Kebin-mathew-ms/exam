import React, { useRef, useState } from 'react'
import { Camera, Loader2, UploadCloud, X } from 'lucide-react'
import useToast from '../hooks/useToast'

export default function AvatarUpload({
  currentSrc = null,
  onUpload,
  loading = false,
  className = '',
}) {
  const fileInputRef = useRef(null)
  const { toast } = useToast()
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState(null)

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const processFile = (file) => {
    // 1. Validation size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast('File size exceeds the 2MB limit.', 'error')
      return
    }

    // 2. Validation format
    const allowed = ['image/png', 'image/jpeg', 'image/jpg']
    if (!allowed.includes(file.type)) {
      toast('Invalid file type. Please select a PNG or JPG/JPEG image.', 'error')
      return
    }

    // Generate local preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result)
    }
    reader.readAsDataURL(file)

    // Trigger callback
    if (onUpload) {
      onUpload(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const triggerInput = () => {
    fileInputRef.current?.click()
  }

  // Resolve active image source (prioritize local preview, then current DB path, then fallback avatar)
  const getImgSrc = () => {
    if (preview) return preview
    if (currentSrc) {
      // If relative, prepend host URL
      if (currentSrc.startsWith('uploads/') || currentSrc.startsWith('uploads\\')) {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        return `${baseURL}/${currentSrc}`
      }
      return currentSrc
    }
    return null
  }

  const imgSrc = getImgSrc()

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Upload Box Container */}
      <div
        onClick={triggerInput}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-28 h-28 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden ${
          dragOver
            ? 'border-primary bg-primary/5 scale-102'
            : 'border-muted-foreground/30 hover:border-primary hover:bg-muted/30'
        }`}
        role="button"
        tabIndex={0}
        aria-label="Upload profile avatar"
        onKeyDown={(e) => e.key === 'Enter' && triggerInput()}
      >
        {imgSrc ? (
          <>
            <img src={imgSrc} alt="Avatar Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity text-white">
              <Camera className="w-5 h-5" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-center p-2 text-muted-foreground">
            <UploadCloud className="w-6 h-6 text-muted-foreground/60 mb-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wider leading-none">Upload</span>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-xs flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".png,.jpg,.jpeg"
        className="hidden"
        aria-hidden="true"
      />

      <span className="text-[10px] text-muted-foreground text-center">
        Allowed formats: PNG, JPG (Max: 2MB)
      </span>
    </div>
  )
}
