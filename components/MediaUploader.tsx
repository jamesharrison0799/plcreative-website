'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'application/pdf',
])

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB


export default function MediaUploader() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)

    for (const file of Array.from(files)) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        setError(`File type not allowed: ${file.type || 'unknown'}`)
        continue
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`File too large (max 10 MB): ${file.name}`)
        continue
      }

      // Derive extension from MIME type to ignore misleading filenames
      const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'application/pdf': 'pdf',
      }
      const ext = mimeToExt[file.type] ?? 'bin'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(path, file, { upsert: false })

      if (uploadError) {
        setError(uploadError.message)
      }
    }

    setUploading(false)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div
        className="border border-dashed border-foreground/20 p-8 text-center cursor-pointer hover:bg-foreground/5"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
      >
        <p className="text-sm text-foreground/50">
          {uploading ? 'Uploading…' : 'Drop files here or click to select'}
        </p>
        <p className="mt-1 text-xs text-foreground/30">Images, videos, documents</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
