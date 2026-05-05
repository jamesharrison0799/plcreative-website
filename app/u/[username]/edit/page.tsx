'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getClientAuthUrl } from '@/lib/auth-url'
import { createClient } from '@/lib/supabase/client'
import NextImage from 'next/image'

const PREVIEW_SIZE = 320
const OUTPUT_SIZE = 512
const MIN_ZOOM = 1
const MAX_ZOOM = 3

interface ProfileForm {
  username: string
  display_name: string
  bio: string
  website: string
  location: string
  avatar_url: string
}

interface SelectedAvatar {
  file: File
  objectUrl: string
  width: number
  height: number
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase()
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getCoverDimensions(containerSize: number, width: number, height: number) {
  const scale = Math.max(containerSize / width, containerSize / height)

  return {
    width: width * scale,
    height: height * scale,
  }
}

async function loadImageDimensions(file: File) {
  const objectUrl = URL.createObjectURL(file)

  const dimensions = await new Promise<{ objectUrl: string; width: number; height: number }>(
    (resolve, reject) => {
      const image = new Image()
      image.onload = () => {
        resolve({
          objectUrl,
          width: image.naturalWidth,
          height: image.naturalHeight,
        })
      }
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Unable to read image.'))
      }
      image.src = objectUrl
    }
  )

  return dimensions
}

async function renderAvatarBlob(avatar: SelectedAvatar, zoom: number, panX: number, panY: number) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Unable to process image.'))
    img.src = avatar.objectUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Unable to process image.')
  }

  const base = getCoverDimensions(OUTPUT_SIZE, avatar.width, avatar.height)
  const drawWidth = base.width * zoom
  const drawHeight = base.height * zoom
  const maxOffsetX = Math.max(0, (drawWidth - OUTPUT_SIZE) / 2)
  const maxOffsetY = Math.max(0, (drawHeight - OUTPUT_SIZE) / 2)
  const drawX = (OUTPUT_SIZE - drawWidth) / 2 + panX * maxOffsetX
  const drawY = (OUTPUT_SIZE - drawHeight) / 2 + panY * maxOffsetY

  context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.9)
  })

  if (!blob) {
    throw new Error('Unable to process image.')
  }

  return blob
}

export default function EditProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const [form, setForm] = useState<ProfileForm>({
    username: '',
    display_name: '',
    bio: '',
    website: '',
    location: '',
    avatar_url: '',
  })
  const [originalUsername, setOriginalUsername] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<SelectedAvatar | null>(null)
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isDraggingPreview, setIsDraggingPreview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    return () => {
      if (selectedAvatar) {
        URL.revokeObjectURL(selectedAvatar.objectUrl)
      }
    }
  }, [selectedAvatar])

  useEffect(() => {
    const load = async () => {
      const { username } = await params
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.assign(getClientAuthUrl('/', window.location.href))
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name, bio, website, location, avatar_url')
        .eq('id', user.id)
        .single()

      if (!profile || profile.username !== username) {
        router.push('/')
        return
      }

      setOriginalUsername(profile.username)
      setForm({
        username: profile.username ?? '',
        display_name: profile.display_name ?? '',
        bio: profile.bio ?? '',
        website: profile.website ?? '',
        location: profile.location ?? '',
        avatar_url: profile.avatar_url ?? '',
      })
      setLoading(false)
    }
    load()
  }, [params, router, supabase])

  const closeAvatarModal = () => {
    setSelectedAvatar((current) => {
      if (current) {
        URL.revokeObjectURL(current.objectUrl)
      }

      return null
    })
    setZoom(MIN_ZOOM)
    setPanX(0)
    setPanY(0)
    setIsDraggingPreview(false)
  }

  useEffect(() => {
    if (!selectedAvatar) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !uploadingAvatar) {
        closeAvatarModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedAvatar, uploadingAvatar])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.')
      e.target.value = ''
      return
    }

    try {
      setError(null)
      const nextAvatar = await loadImageDimensions(file)

      setSelectedAvatar((current) => {
        if (current) {
          URL.revokeObjectURL(current.objectUrl)
        }

        return {
          file,
          objectUrl: nextAvatar.objectUrl,
          width: nextAvatar.width,
          height: nextAvatar.height,
        }
      })
      setZoom(MIN_ZOOM)
      setPanX(0)
      setPanY(0)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to read image.')
    } finally {
      e.target.value = ''
    }
  }

  const applyAvatarUpload = async () => {
    if (!selectedAvatar) {
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setUploadingAvatar(true)
    setError(null)

    try {
      const blob = await renderAvatarBlob(selectedAvatar, zoom, panX, panY)
      const filePath = `${user.id}/${Date.now()}-${sanitizeFileName(selectedAvatar.file.name.replace(/\.[^.]+$/, ''))}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)

      setForm((current) => ({
        ...current,
        avatar_url: data.publicUrl,
      }))
      closeAvatarModal()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload image.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase
      .from('profiles')
      .update({
        username: form.username.trim().toLowerCase(),
        display_name: form.display_name.trim(),
        bio: form.bio.trim(),
        website: form.website.trim(),
        location: form.location.trim(),
        avatar_url: form.avatar_url.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      router.push(`/u/${form.username.trim().toLowerCase()}`)
    }
  }

  const set = (field: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [field]: e.target.value }))

  const previewBase = selectedAvatar
    ? getCoverDimensions(PREVIEW_SIZE, selectedAvatar.width, selectedAvatar.height)
    : null
  const previewWidth = previewBase ? previewBase.width * zoom : 0
  const previewHeight = previewBase ? previewBase.height * zoom : 0
  const maxPreviewOffsetX = Math.max(0, (previewWidth - PREVIEW_SIZE) / 2)
  const maxPreviewOffsetY = Math.max(0, (previewHeight - PREVIEW_SIZE) / 2)
  const previewLeft = (PREVIEW_SIZE - previewWidth) / 2 + panX * maxPreviewOffsetX
  const previewTop = (PREVIEW_SIZE - previewHeight) / 2 + panY * maxPreviewOffsetY

  useEffect(() => {
    if (!isDraggingPreview) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const nextPanX = maxPreviewOffsetX === 0
        ? 0
        : clamp(dragStartRef.current.panX + (event.clientX - dragStartRef.current.x) / maxPreviewOffsetX, -1, 1)
      const nextPanY = maxPreviewOffsetY === 0
        ? 0
        : clamp(dragStartRef.current.panY + (event.clientY - dragStartRef.current.y) / maxPreviewOffsetY, -1, 1)

      setPanX(nextPanX)
      setPanY(nextPanY)
    }

    const handlePointerUp = () => {
      setIsDraggingPreview(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDraggingPreview, maxPreviewOffsetX, maxPreviewOffsetY])

  const handlePreviewPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!selectedAvatar) {
      return
    }

    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      panX,
      panY,
    }
    setIsDraggingPreview(true)
  }

  const handlePreviewWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    setZoom((current) => clamp(current - event.deltaY * 0.0015, MIN_ZOOM, MAX_ZOOM))
  }

  if (loading) return null

  return (
    <>
      <main className="flex flex-1 justify-center min-h-screen px-4 pt-20">
        <div className="w-full max-w-lg flex flex-col gap-6 py-12">
          <p>Edit Profile</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />

            <div className="border border-gray-200 p-4">
              <div className="flex items-start gap-4">
                {form.avatar_url ? (
                  <NextImage
                    src={form.avatar_url}
                    alt={form.display_name || form.username || 'Profile picture'}
                    width={80}
                    height={80}
                    className="rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-gray-300 text-xs text-gray-400">
                    No photo
                  </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div>
                    <p className="text-sm">Profile picture</p>
                    <p className="text-xs text-gray-500">Upload and crop.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-foreground/10 px-3 py-2 text-sm hover:bg-foreground/5"
                    >
                      {form.avatar_url ? 'Change photo' : 'Upload photo'}
                    </button>
                    {form.avatar_url && (
                      <button
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, avatar_url: '' }))}
                        className="px-3 py-2 text-sm text-foreground/50 hover:text-foreground"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                  {uploadingAvatar && <p className="text-xs text-gray-500">Uploading image…</p>}
                </div>
              </div>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">Username</span>
              <input
                type="text"
                value={form.username}
                onChange={set('username')}
                required
                pattern="[a-zA-Z0-9_\-]+"
                title="Letters, numbers, underscores and hyphens only"
                className="border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:border-gray-400"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">Display name</span>
              <input
                type="text"
                value={form.display_name}
                onChange={set('display_name')}
                className="border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:border-gray-400"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">Bio</span>
              <textarea
                value={form.bio}
                onChange={set('bio')}
                rows={3}
                className="border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:border-gray-400 resize-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">Location</span>
              <input
                type="text"
                value={form.location}
                onChange={set('location')}
                className="border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:border-gray-400"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">Website</span>
              <input
                type="url"
                value={form.website}
                onChange={set('website')}
                placeholder="https://"
                className="border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:border-gray-400"
              />
            </label>
            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="text-sm border border-foreground/10 rounded px-4 py-2 hover:bg-foreground/5 transition-colors disabled:opacity-50"
              >
                {saving ? '…' : 'Save'}
              </button>
              <a
                href={`/u/${originalUsername}`}
                className="text-sm text-gray-400 hover:text-gray-700 px-4 py-2"
              >
                Cancel
              </a>
            </div>
          </form>
        </div>
      </main>

      {selectedAvatar && (
        <div className="fixed inset-0 z-50 bg-black text-white" onClick={() => !uploadingAvatar && closeAvatarModal()}>
          <div className="flex min-h-screen flex-col" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 sm:px-8">
              <div>
                <p className="text-sm">Crop profile photo</p>
                <p className="text-xs text-white/60">Drag to reframe. Scroll to zoom.</p>
              </div>
              <button
                type="button"
                onClick={closeAvatarModal}
                disabled={uploadingAvatar}
                className="border border-white/20 px-3 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-8 px-6 pb-6 sm:px-8 sm:pb-8 md:grid md:grid-cols-[minmax(0,1fr)_280px] md:items-center">
              <div className="flex flex-col gap-4 md:min-h-0 md:justify-center">
                <div
                  className={`relative mx-auto overflow-hidden rounded-full border border-white/15 bg-neutral-950 ${isDraggingPreview ? 'cursor-grabbing' : 'cursor-grab'}`}
                  style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE, touchAction: 'none' }}
                  onPointerDown={handlePreviewPointerDown}
                  onWheel={handlePreviewWheel}
                  onDoubleClick={() => {
                    setZoom(MIN_ZOOM)
                    setPanX(0)
                    setPanY(0)
                  }}
                >
                  {/* img is intentional — next/image does not support blob: object URLs */}
                  <img // eslint-disable-line @next/next/no-img-element
                    src={selectedAvatar.objectUrl}
                    alt="New avatar preview"
                    className="absolute max-w-none select-none"
                    draggable={false}
                    style={{
                      width: previewWidth,
                      height: previewHeight,
                      left: previewLeft,
                      top: previewTop,
                    }}
                  />
                </div>

                <div className="flex items-center justify-center gap-4 text-xs text-white/50">
                  <span>Scroll to zoom</span>
                  <span>Drag to reframe</span>
                </div>
              </div>

              <div className="flex flex-col gap-5 border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-white/50">Zoom</span>
                  <input
                    type="range"
                    min={String(MIN_ZOOM)}
                    max={String(MAX_ZOOM)}
                    step="0.01"
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setZoom((current) => clamp(current - 0.15, MIN_ZOOM, MAX_ZOOM))}
                    className="border border-white/15 px-4 py-3 text-sm text-white hover:bg-white/10"
                  >
                    Zoom out
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((current) => clamp(current + 0.15, MIN_ZOOM, MAX_ZOOM))}
                    className="border border-white/15 px-4 py-3 text-sm text-white hover:bg-white/10"
                  >
                    Zoom in
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(MIN_ZOOM)
                      setPanX(0)
                      setPanY(0)
                    }}
                    className="border border-white/15 px-4 py-3 text-sm text-white hover:bg-white/10"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-white/15 px-4 py-3 text-sm text-white hover:bg-white/10"
                  >
                    Replace
                  </button>
                </div>

                <div className="bg-white/5 px-4 py-3 text-xs leading-5 text-white/55">
                  The final image is exported as a clean square avatar and resized for performance before upload.
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={applyAvatarUpload}
                    disabled={uploadingAvatar}
                    className="flex-1 bg-white px-4 py-3 text-sm text-black disabled:opacity-60"
                  >
                    {uploadingAvatar ? 'Applying…' : 'Apply photo'}
                  </button>
                  <button
                    type="button"
                    onClick={closeAvatarModal}
                    disabled={uploadingAvatar}
                    className="border border-white/15 px-4 py-3 text-sm text-white/75 hover:bg-white/10 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
