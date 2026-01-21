import { useState, useRef } from 'react'
import { Camera, Loader2, User } from 'lucide-react'

interface AvatarProps {
  name?: string
  photo?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  editable?: boolean
  onPhotoChange?: (base64: string) => void
  uploading?: boolean
}

const sizeClasses = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-14 h-14 text-lg',
  lg: 'w-20 h-20 text-2xl',
  xl: 'w-28 h-28 text-4xl'
}

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
}

export default function Avatar({ 
  name, 
  photo, 
  size = 'md', 
  editable = false, 
  onPhotoChange,
  uploading = false
}: AvatarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [localPhoto, setLocalPhoto] = useState<string | null>(null)

  const displayPhoto = localPhoto || photo
  const initial = name?.charAt(0).toUpperCase() || '?'

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB')
      return
    }

    // Compress and convert to base64
    const base64 = await compressImage(file, 400, 0.8)
    setLocalPhoto(base64)
    onPhotoChange?.(base64)
  }

  const compressImage = (file: File, maxSize: number, quality: number): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Calculate new dimensions
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width)
              width = maxSize
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height)
              height = maxSize
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, width, height)

          const base64 = canvas.toDataURL('image/jpeg', quality)
          resolve(base64)
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  return (
    <div className="relative inline-block">
      <div 
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center overflow-hidden ${
          displayPhoto ? '' : 'bg-primary'
        }`}
        onClick={editable ? () => fileInputRef.current?.click() : undefined}
        style={editable ? { cursor: 'pointer' } : undefined}
      >
        {uploading ? (
          <div className="bg-primary w-full h-full flex items-center justify-center">
            <Loader2 className={`${iconSizes[size]} text-white animate-spin`} />
          </div>
        ) : displayPhoto ? (
          <img 
            src={displayPhoto} 
            alt={name || 'Avatar'}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-bold text-white">{initial}</span>
        )}
      </div>

      {editable && !uploading && (
        <>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 shadow-lg hover:bg-primary-dark transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </>
      )}
    </div>
  )
}
