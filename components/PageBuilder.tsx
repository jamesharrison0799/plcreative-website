'use client'

import {
  useState,
  useCallback,
  useRef,
  useSyncExternalStore,
  useTransition,
} from 'react'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DraggableAttributes } from '@dnd-kit/core'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import type { CmsSectionRecord, CmsPageRecord } from '@/lib/cms'
import { getTextValue } from '@/lib/cms'
import { createClient } from '@/lib/supabase/client'
import {
  updateSectionAction,
  deleteSectionAction,
  reorderSectionsAction,
  addTextSectionAction,
  updatePageMetadataAction,
} from '@/app/admin/actions'

// ─── Types ───────────────────────────────────────────────────────────────────

interface EditState {
  heading: string
  use_title_image: string
  title_image_url: string
  title_image_size: string
  title_image_offset_x: string
  title_image_offset_y: string
  title_image_h_align: string
  title_image_v_align: string
  title_image_padding_top: string
  title_image_padding_right: string
  title_image_padding_bottom: string
  title_image_padding_left: string
  body: string
  button_text: string
  button_url: string
  image_url: string
  logo_url: string
  media_url: string
  media_type: string
  overlay_opacity: string
  media_blur: string
  media_opacity: string
  media_brightness: string
  media_contrast: string
  glass_mode: string
  alt: string
  caption: string
  items_json: string
}

function getEditState(section: CmsSectionRecord): EditState {
  return {
    heading: getTextValue(section.data, 'heading'),
    use_title_image: String(section.data?.use_title_image ?? false),
    title_image_url: getTextValue(section.data, 'title_image_url'),
    title_image_size: String(section.data?.title_image_size ?? 100),
    title_image_offset_x: String(section.data?.title_image_offset_x ?? 0),
    title_image_offset_y: String(section.data?.title_image_offset_y ?? 0),
    title_image_h_align: getTextValue(section.data, 'title_image_h_align') || 'center',
    title_image_v_align: getTextValue(section.data, 'title_image_v_align') || 'center',
    title_image_padding_top: String(section.data?.title_image_padding_top ?? 0),
    title_image_padding_right: String(section.data?.title_image_padding_right ?? 0),
    title_image_padding_bottom: String(section.data?.title_image_padding_bottom ?? 0),
    title_image_padding_left: String(section.data?.title_image_padding_left ?? 0),
    body: getTextValue(section.data, 'body'),
    button_text: getTextValue(section.data, 'button_text'),
    button_url: getTextValue(section.data, 'button_url'),
    image_url: getTextValue(section.data, 'image_url'),
    logo_url: getTextValue(section.data, 'logo_url'),
    media_url: getTextValue(section.data, 'media_url'),
    media_type: getTextValue(section.data, 'media_type') || 'image',
    overlay_opacity: String(section.data?.overlay_opacity ?? 45),
    media_blur: String(section.data?.media_blur ?? 0),
    media_opacity: String(section.data?.media_opacity ?? 100),
    media_brightness: String(section.data?.media_brightness ?? 100),
    media_contrast: String(section.data?.media_contrast ?? 100),
    glass_mode: String(section.data?.glass_mode ?? false),
    alt: getTextValue(section.data, 'alt'),
    caption: getTextValue(section.data, 'caption'),
    items_json: (() => {
      const items = section.data?.items
      return Array.isArray(items) ? JSON.stringify(items, null, 2) : '[]'
    })(),
  }
}

// ─── Markdown renderer (client-side) ─────────────────────────────────────────

function MD({ text }: { text: string }) {
  if (!text) return null
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
        h2: ({ children }) => <h2 className="mt-6 mb-2 text-base font-medium">{children}</h2>,
        h3: ({ children }) => <h3 className="mt-4 mb-1 text-sm font-medium">{children}</h3>,
        a: ({ href, children }) => (
          <a href={href} className="underline opacity-70 hover:opacity-100">{children}</a>
        ),
        ul: ({ children }) => <ul className="mb-3 list-disc pl-5 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 list-decimal pl-5 space-y-1">{children}</ol>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-foreground/20 pl-4 opacity-70 my-3">{children}</blockquote>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  )
}

// ─── Live preview: renders a section from local edit state ───────────────────

function SectionPreview({ type, edit }: { type: string; edit: EditState }) {
  if (type === 'hero') {
    const mediaBlur = Math.max(0, Math.min(30, Number(edit.media_blur) || 0))
    const mediaOpacity = Math.max(0, Math.min(100, Number(edit.media_opacity) || 100))
    const mediaBrightness = Math.max(40, Math.min(200, Number(edit.media_brightness) || 100))
    const mediaContrast = Math.max(40, Math.min(200, Number(edit.media_contrast) || 100))
    const glassMode = edit.glass_mode === 'true'
    const useTitleImage = edit.use_title_image === 'true' && Boolean(edit.title_image_url)
    const titleImageSize = Math.max(20, Math.min(160, Number(edit.title_image_size) || 100))
    const titleImageOffsetX = Math.max(-300, Math.min(300, Number(edit.title_image_offset_x) || 0))
    const titleImageOffsetY = Math.max(-300, Math.min(300, Number(edit.title_image_offset_y) || 0))
    const titleImagePaddingTop = Math.max(0, Math.min(300, Number(edit.title_image_padding_top) || 0))
    const titleImagePaddingRight = Math.max(0, Math.min(300, Number(edit.title_image_padding_right) || 0))
    const titleImagePaddingBottom = Math.max(0, Math.min(300, Number(edit.title_image_padding_bottom) || 0))
    const titleImagePaddingLeft = Math.max(0, Math.min(300, Number(edit.title_image_padding_left) || 0))
    const hMap = { left: 'flex-start', center: 'center', right: 'flex-end' } as const
    const vMap = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const
    const titleHAlign = hMap[edit.title_image_h_align as keyof typeof hMap] ?? 'center'
    const titleVAlign = vMap[edit.title_image_v_align as keyof typeof vMap] ?? 'center'

    return (
      <div className="relative min-h-[70vh] overflow-hidden">
        {edit.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={edit.image_url}
            alt={edit.heading || 'Hero background'}
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              filter: `blur(${mediaBlur}px) brightness(${mediaBrightness}%) contrast(${mediaContrast}%)`,
              opacity: mediaOpacity / 100,
            }}
          />
        ) : null}
        {edit.image_url ? <div className="absolute inset-0 bg-black/45" aria-hidden="true" /> : null}

        <div className="relative z-10 flex min-h-[70vh] items-center justify-center px-10 py-20 text-center">
          <div
            className={glassMode ? 'max-w-2xl border border-white/25 bg-white/10 px-8 py-8 backdrop-blur-md' : 'max-w-2xl'}
          >
            {useTitleImage ? (
              <div
                className="flex w-full min-h-[240px]"
                style={{
                  justifyContent: titleHAlign,
                  alignItems: titleVAlign,
                  paddingTop: `${titleImagePaddingTop}px`,
                  paddingRight: `${titleImagePaddingRight}px`,
                  paddingBottom: `${titleImagePaddingBottom}px`,
                  paddingLeft: `${titleImagePaddingLeft}px`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={edit.title_image_url}
                  alt={edit.heading || 'Title image'}
                  className="h-auto w-full max-w-[520px]"
                  style={{
                    width: `${titleImageSize}%`,
                    transform: `translate(${titleImageOffsetX}px, ${titleImageOffsetY}px)`,
                  }}
                />
              </div>
            ) : (
              <p className={edit.image_url ? 'text-3xl font-light tracking-tight text-white' : 'text-3xl font-light tracking-tight'}>
                {edit.heading || <span className="opacity-20">Heading</span>}
              </p>
            )}
            {edit.body ? (
              <div className={edit.image_url ? 'mt-5 text-sm leading-7 text-white/85' : 'mt-5 text-sm leading-7 text-foreground/55'}>
                <MD text={edit.body} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'hero_media') {
    const mediaType = edit.media_type === 'video' ? 'video' : 'image'
    const overlayOpacity = Math.max(0, Math.min(100, Number(edit.overlay_opacity) || 45))
    const mediaBlur = Math.max(0, Math.min(30, Number(edit.media_blur) || 0))
    const mediaOpacity = Math.max(0, Math.min(100, Number(edit.media_opacity) || 100))
    const mediaBrightness = Math.max(40, Math.min(200, Number(edit.media_brightness) || 100))
    const mediaContrast = Math.max(40, Math.min(200, Number(edit.media_contrast) || 100))
    const glassMode = edit.glass_mode === 'true'
    const useTitleImage = edit.use_title_image === 'true' && Boolean(edit.title_image_url)
    const titleImageSize = Math.max(20, Math.min(160, Number(edit.title_image_size) || 100))
    const titleImageOffsetX = Math.max(-300, Math.min(300, Number(edit.title_image_offset_x) || 0))
    const titleImageOffsetY = Math.max(-300, Math.min(300, Number(edit.title_image_offset_y) || 0))
    const titleImagePaddingTop = Math.max(0, Math.min(300, Number(edit.title_image_padding_top) || 0))
    const titleImagePaddingRight = Math.max(0, Math.min(300, Number(edit.title_image_padding_right) || 0))
    const titleImagePaddingBottom = Math.max(0, Math.min(300, Number(edit.title_image_padding_bottom) || 0))
    const titleImagePaddingLeft = Math.max(0, Math.min(300, Number(edit.title_image_padding_left) || 0))
    const hMap = { left: 'flex-start', center: 'center', right: 'flex-end' } as const
    const vMap = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const
    const titleHAlign = hMap[edit.title_image_h_align as keyof typeof hMap] ?? 'center'
    const titleVAlign = vMap[edit.title_image_v_align as keyof typeof vMap] ?? 'center'

    return (
      <div className="relative min-h-[85vh] overflow-hidden">
        {edit.media_url ? (
          mediaType === 'video' ? (
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src={edit.media_url}
              autoPlay
              muted
              loop
              playsInline
              style={{
                filter: `blur(${mediaBlur}px) brightness(${mediaBrightness}%) contrast(${mediaContrast}%)`,
                opacity: mediaOpacity / 100,
              }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={edit.media_url}
              alt={edit.heading || 'Hero background'}
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                filter: `blur(${mediaBlur}px) brightness(${mediaBrightness}%) contrast(${mediaContrast}%)`,
                opacity: mediaOpacity / 100,
              }}
            />
          )
        ) : (
          <div className="absolute inset-0 bg-foreground/20" />
        )}

        <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity / 100 }} />

        <div className="relative z-10 flex min-h-[85vh] items-center justify-center px-6 py-16">
          <div
            className={glassMode
              ? 'flex flex-col items-center gap-5 border border-white/25 bg-white/10 px-8 py-8 text-center backdrop-blur-md'
              : 'flex flex-col items-center gap-5 text-center'}
          >
            {edit.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={edit.logo_url} alt={edit.heading || 'Logo'} className="h-auto w-full max-w-[220px] sm:max-w-[300px]" />
            ) : (
              <p className="text-xs text-white/70">Set a logo URL</p>
            )}
            {useTitleImage ? (
              <div
                className="flex w-full min-h-[220px]"
                style={{
                  justifyContent: titleHAlign,
                  alignItems: titleVAlign,
                  paddingTop: `${titleImagePaddingTop}px`,
                  paddingRight: `${titleImagePaddingRight}px`,
                  paddingBottom: `${titleImagePaddingBottom}px`,
                  paddingLeft: `${titleImagePaddingLeft}px`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={edit.title_image_url}
                  alt={edit.heading || 'Title image'}
                  className="h-auto w-full max-w-[520px]"
                  style={{
                    width: `${titleImageSize}%`,
                    transform: `translate(${titleImageOffsetX}px, ${titleImageOffsetY}px)`,
                  }}
                />
              </div>
            ) : (
              edit.heading ? <p className="text-sm uppercase tracking-[0.18em] text-white/80">{edit.heading}</p> : null
            )}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'text') {
    return (
      <div className="px-10 py-14">
        <div className="mx-auto max-w-2xl">
          {edit.heading && <h2 className="mb-4 text-sm font-medium">{edit.heading}</h2>}
          {edit.body && (
            <div className="text-sm leading-7 text-foreground/70">
              <MD text={edit.body} />
            </div>
          )}
        </div>
      </div>
    )
  }

  if (type === 'cta') {
    return (
      <div className="px-10 py-20 text-center">
        <div className="mx-auto max-w-xl">
          {edit.heading && <h2 className="text-xl font-light">{edit.heading}</h2>}
          {edit.body && (
            <div className="mt-3 text-sm leading-7 text-foreground/60">
              <MD text={edit.body} />
            </div>
          )}
          {edit.button_text && (
            <span className="mt-8 inline-block border border-foreground/25 px-7 py-3 text-sm">
              {edit.button_text}
            </span>
          )}
        </div>
      </div>
    )
  }

  if (type === 'newsletter') {
    return (
      <div className="px-10 py-20 text-center">
        <div className="mx-auto max-w-xl">
          {edit.heading && <h2 className="text-xl font-light">{edit.heading}</h2>}
          {edit.body && (
            <div className="mt-3 text-sm leading-7 text-foreground/60">
              <MD text={edit.body} />
            </div>
          )}
          <div className="mt-7 mx-auto max-w-md border border-foreground/15 p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <input
                type="email"
                readOnly
                value="email@example.com"
                className="border border-foreground/20 bg-background px-3 py-2 text-sm"
              />
              <span className="inline-flex items-center justify-center border border-foreground/25 px-4 py-2 text-sm">
                {edit.button_text || 'Subscribe'}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'image') {
    return (
      <div className="px-10 py-14">
        <div className="mx-auto max-w-3xl">
          {edit.heading && <h2 className="mb-5 text-sm font-medium">{edit.heading}</h2>}
          {edit.image_url ? (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={edit.image_url} alt={edit.alt || edit.heading} className="w-full" />
              {edit.caption && (
                <figcaption className="mt-2 text-xs text-foreground/40">{edit.caption}</figcaption>
              )}
            </figure>
          ) : (
            <div className="flex aspect-video items-center justify-center border border-dashed border-foreground/15">
              <p className="text-xs text-foreground/30">Set an image URL in the panel</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (type === 'faq') {
    let items: Array<{ q: string; a: string }> = []
    try { items = JSON.parse(edit.items_json) } catch { /* ignore */ }
    return (
      <div className="px-10 py-14">
        <div className="mx-auto max-w-2xl">
          {edit.heading && <h2 className="mb-7 text-sm font-medium">{edit.heading}</h2>}
          <div className="space-y-5">
            {items.map((item, i) => (
              <div key={i} className="border-b border-foreground/10 pb-5 last:border-0">
                <p className="text-sm font-medium">{item.q}</p>
                <p className="mt-2 text-sm leading-7 text-foreground/60">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'testimonials') {
    let items: Array<{ name: string; quote: string; title?: string }> = []
    try { items = JSON.parse(edit.items_json) } catch { /* ignore */ }
    return (
      <div className="px-10 py-14">
        <div className="mx-auto max-w-4xl">
          {edit.heading && <h2 className="mb-7 text-sm font-medium">{edit.heading}</h2>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((t, i) => (
              <div key={i} className="border border-foreground/10 p-5">
                <p className="text-sm leading-7 text-foreground/70">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-4 text-xs font-medium">{t.name}</p>
                {t.title && <p className="text-xs text-foreground/40">{t.title}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return null
}

// ─── Section edit form (shown in left panel when selected) ───────────────────

function EditForm({
  section,
  edit,
  onChange,
  onSave,
  isSaving,
  onClose,
  onUploadFile,
  uploadingField,
  uploadError,
}: {
  section: CmsSectionRecord
  edit: EditState
  onChange: (u: Partial<EditState>) => void
  onSave: () => void
  isSaving: boolean
  onClose: () => void
  onUploadFile: (target: 'image_url' | 'media_url' | 'logo_url' | 'title_image_url', file: File) => Promise<void>
  uploadingField: 'image_url' | 'media_url' | 'logo_url' | 'title_image_url' | null
  uploadError: string | null
}) {
  const heroImageInputRef = useRef<HTMLInputElement>(null)
  const titleImageInputRef = useRef<HTMLInputElement>(null)
  const backgroundInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const needsBody = ['hero', 'text', 'cta', 'newsletter'].includes(section.type)
  const isHero = section.type === 'hero'
  const isHeroMedia = section.type === 'hero_media'
  const isCta = section.type === 'cta'
  const isNewsletter = section.type === 'newsletter'
  const isImage = section.type === 'image'
  const isComplex = section.type === 'faq' || section.type === 'testimonials'

  const inp =
    'border border-foreground/10 bg-background px-2 py-1 text-xs outline-none focus:border-foreground/30 w-full'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-foreground/10 px-4 py-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="text-foreground/40 hover:text-foreground text-sm"
        >
          ←
        </button>
        <span className="text-sm capitalize font-medium flex-1">{section.type}</span>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-foreground/40">Heading</span>
          <input value={edit.heading} onChange={(e) => onChange({ heading: e.target.value })} className={inp} />
        </label>

        {(isHero || isHeroMedia) && (
          <>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={edit.use_title_image === 'true'}
                onChange={(e) => onChange({ use_title_image: String(e.target.checked) })}
              />
              <span className="text-xs text-foreground/60">Use title image instead of text</span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-foreground/40">Title image URL</span>
              <input value={edit.title_image_url} onChange={(e) => onChange({ title_image_url: e.target.value })} className={inp} />
            </label>

            <input
              ref={titleImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const input = e.currentTarget
                const file = e.target.files?.[0]
                if (!file) return
                await onUploadFile('title_image_url', file)
                input.value = ''
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => titleImageInputRef.current?.click()}
                disabled={uploadingField === 'title_image_url'}
                className="border border-foreground/10 px-2 py-1 text-xs hover:bg-foreground/5 disabled:opacity-40"
              >
                {uploadingField === 'title_image_url' ? 'Uploading…' : 'Upload title image'}
              </button>

              <button
                type="button"
                onClick={() => onChange({ use_title_image: 'false', title_image_url: '' })}
                className="border border-red-500/20 px-2 py-1 text-xs text-red-500/70 hover:bg-red-500/5"
              >
                Remove title image
              </button>
            </div>

            <details className="border border-foreground/10">
              <summary className="cursor-pointer px-2 py-1 text-xs text-foreground/60 hover:text-foreground select-none">
                Transform (advanced)
              </summary>
              <div className="space-y-2 border-t border-foreground/10 p-2">
                <div className="grid grid-cols-[88px_1fr] gap-2">
                  <div>
                    <p className="mb-1 text-[10px] text-foreground/40">Anchor</p>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        ['left', 'top'], ['center', 'top'], ['right', 'top'],
                        ['left', 'center'], ['center', 'center'], ['right', 'center'],
                        ['left', 'bottom'], ['center', 'bottom'], ['right', 'bottom'],
                      ].map(([h, v]) => {
                        const active = edit.title_image_h_align === h && edit.title_image_v_align === v
                        return (
                          <button
                            key={`${h}-${v}`}
                            type="button"
                            onClick={() => onChange({ title_image_h_align: h, title_image_v_align: v })}
                            className={active
                              ? 'h-6 w-6 border border-foreground/40 bg-foreground/15'
                              : 'h-6 w-6 border border-foreground/15 hover:bg-foreground/5'}
                            aria-label={`Anchor ${h} ${v}`}
                          />
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-foreground/40">X</span>
                      <input type="number" min={-300} max={300} value={edit.title_image_offset_x} onChange={(e) => onChange({ title_image_offset_x: e.target.value })} className={inp} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-foreground/40">Y</span>
                      <input type="number" min={-300} max={300} value={edit.title_image_offset_y} onChange={(e) => onChange({ title_image_offset_y: e.target.value })} className={inp} />
                    </label>
                    <label className="col-span-2 flex flex-col gap-1">
                      <span className="text-[10px] text-foreground/40">W (%)</span>
                      <input type="number" min={20} max={160} value={edit.title_image_size} onChange={(e) => onChange({ title_image_size: e.target.value })} className={inp} />
                    </label>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-[10px] text-foreground/40">Insets (px)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1"><span className="text-[10px] text-foreground/40">Top</span><input type="number" min={0} max={300} value={edit.title_image_padding_top} onChange={(e) => onChange({ title_image_padding_top: e.target.value })} className={inp} /></label>
                    <label className="flex flex-col gap-1"><span className="text-[10px] text-foreground/40">Right</span><input type="number" min={0} max={300} value={edit.title_image_padding_right} onChange={(e) => onChange({ title_image_padding_right: e.target.value })} className={inp} /></label>
                    <label className="flex flex-col gap-1"><span className="text-[10px] text-foreground/40">Bottom</span><input type="number" min={0} max={300} value={edit.title_image_padding_bottom} onChange={(e) => onChange({ title_image_padding_bottom: e.target.value })} className={inp} /></label>
                    <label className="flex flex-col gap-1"><span className="text-[10px] text-foreground/40">Left</span><input type="number" min={0} max={300} value={edit.title_image_padding_left} onChange={(e) => onChange({ title_image_padding_left: e.target.value })} className={inp} /></label>
                  </div>
                </div>
              </div>
            </details>
          </>
        )}

        {needsBody && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-foreground/40">Body</span>
            <textarea
              value={edit.body}
              onChange={(e) => onChange({ body: e.target.value })}
              rows={4}
              className={`${inp} font-mono text-xs resize-y leading-5`}
              placeholder="Supports **markdown**"
            />
          </label>
        )}

        {isHero && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-foreground/40">Hero image URL</span>
              <input value={edit.image_url} onChange={(e) => onChange({ image_url: e.target.value })} className={inp} />
            </label>

            <input
              ref={heroImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const input = e.currentTarget
                const file = e.target.files?.[0]
                if (!file) return
                await onUploadFile('image_url', file)
                input.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => heroImageInputRef.current?.click()}
              disabled={uploadingField === 'image_url'}
              className="border border-foreground/10 px-2 py-1.5 text-xs hover:bg-foreground/5 disabled:opacity-40"
            >
              {uploadingField === 'image_url' ? 'Uploading hero image…' : 'Upload hero image'}
            </button>
          </>
        )}

        {(isCta || isNewsletter) && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-foreground/40">Button label</span>
              <input value={edit.button_text} onChange={(e) => onChange({ button_text: e.target.value })} className={inp} />
            </label>
            {isCta ? (
              <label className="flex flex-col gap-1">
                <span className="text-xs text-foreground/40">Button URL</span>
                <input value={edit.button_url} onChange={(e) => onChange({ button_url: e.target.value })} className={inp} />
              </label>
            ) : null}
          </>
        )}

        {isHeroMedia && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-foreground/40">Background URL</span>
              <input value={edit.media_url} onChange={(e) => onChange({ media_url: e.target.value })} className={inp} />
            </label>

            <input
              ref={backgroundInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={async (e) => {
                const input = e.currentTarget
                const file = e.target.files?.[0]
                if (!file) return
                await onUploadFile('media_url', file)
                input.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => backgroundInputRef.current?.click()}
              disabled={uploadingField === 'media_url'}
              className="border border-foreground/10 px-2 py-1.5 text-xs hover:bg-foreground/5 disabled:opacity-40"
            >
              {uploadingField === 'media_url' ? 'Uploading background…' : 'Upload background'}
            </button>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-foreground/40">Background type</span>
              <select value={edit.media_type} onChange={(e) => onChange({ media_type: e.target.value })} className={inp}>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-foreground/40">Logo URL</span>
              <input value={edit.logo_url} onChange={(e) => onChange({ logo_url: e.target.value })} className={inp} />
            </label>

            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const input = e.currentTarget
                const file = e.target.files?.[0]
                if (!file) return
                await onUploadFile('logo_url', file)
                input.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingField === 'logo_url'}
              className="border border-foreground/10 px-2 py-1.5 text-xs hover:bg-foreground/5 disabled:opacity-40"
            >
              {uploadingField === 'logo_url' ? 'Uploading logo…' : 'Upload logo'}
            </button>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-foreground/40">Overlay opacity: {edit.overlay_opacity}%</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={edit.overlay_opacity}
                onChange={(e) => onChange({ overlay_opacity: e.target.value })}
                className="w-full"
              />
            </label>

            {uploadError ? <p className="text-xs text-red-500">{uploadError}</p> : null}
          </>
        )}

        {(isHero || isHeroMedia) && (
          <details className="border border-foreground/10">
            <summary className="cursor-pointer px-2 py-1 text-xs text-foreground/60 hover:text-foreground select-none">
              Image FX (advanced)
            </summary>
            <div className="space-y-2 border-t border-foreground/10 p-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-foreground/40">Blur: {edit.media_blur}px</span>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={edit.media_blur}
                onChange={(e) => onChange({ media_blur: e.target.value })}
                className="w-full"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-foreground/40">Media opacity: {edit.media_opacity}%</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={edit.media_opacity}
                onChange={(e) => onChange({ media_opacity: e.target.value })}
                className="w-full"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-foreground/40">Brightness: {edit.media_brightness}%</span>
              <input
                type="range"
                min={40}
                max={200}
                step={1}
                value={edit.media_brightness}
                onChange={(e) => onChange({ media_brightness: e.target.value })}
                className="w-full"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-foreground/40">Contrast: {edit.media_contrast}%</span>
              <input
                type="range"
                min={40}
                max={200}
                step={1}
                value={edit.media_contrast}
                onChange={(e) => onChange({ media_contrast: e.target.value })}
                className="w-full"
              />
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={edit.glass_mode === 'true'}
                onChange={(e) => onChange({ glass_mode: String(e.target.checked) })}
              />
              <span className="text-xs text-foreground/60">Glass mode</span>
            </label>
            </div>
          </details>
        )}

        {isImage && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-foreground/40">Image URL</span>
              <input value={edit.image_url} onChange={(e) => onChange({ image_url: e.target.value })} className={inp} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-foreground/40">Alt text</span>
              <input value={edit.alt} onChange={(e) => onChange({ alt: e.target.value })} className={inp} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-foreground/40">Caption</span>
              <input value={edit.caption} onChange={(e) => onChange({ caption: e.target.value })} className={inp} />
            </label>
          </>
        )}

        {isComplex && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-foreground/40">Items (JSON)</span>
            <textarea
              value={edit.items_json}
              onChange={(e) => onChange({ items_json: e.target.value })}
              rows={8}
              className={`${inp} font-mono text-xs resize-y`}
            />
          </label>
        )}
      </div>

      {/* Save */}
      <div className="shrink-0 border-t border-foreground/10 p-3">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="w-full border border-foreground/15 py-2 text-sm hover:bg-foreground/5 disabled:opacity-40"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ─── Sortable section card in the list ───────────────────────────────────────

function SortableListCard({
  section,
  edit,
  isSelected,
  isDragging,
  onSelect,
  onDelete,
  dragListeners,
  dragAttributes,
  dragRef,
  dragStyle,
}: {
  section: CmsSectionRecord
  edit: EditState
  isSelected: boolean
  isDragging: boolean
  onSelect: () => void
  onDelete: () => void
  dragListeners?: SyntheticListenerMap
  dragAttributes?: DraggableAttributes
  dragRef: (el: HTMLElement | null) => void
  dragStyle: React.CSSProperties
}) {
  return (
    <div
      ref={dragRef}
      style={dragStyle}
      className={`flex items-center gap-2 border px-3 py-2.5 cursor-pointer transition-colors
        ${isDragging ? 'opacity-40' : ''}
        ${isSelected
          ? 'border-blue-500/50 bg-blue-500/5'
          : 'border-foreground/10 hover:border-foreground/20 hover:bg-foreground/3'
        }`}
      onClick={onSelect}
    >
      {/* Drag grip */}
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-foreground/25 hover:text-foreground/50 shrink-0 touch-none"
        onClick={(e) => e.stopPropagation()}
        {...dragListeners}
        {...dragAttributes}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <rect x="1" y="1" width="2" height="2" /><rect x="5" y="1" width="2" height="2" /><rect x="9" y="1" width="2" height="2" />
          <rect x="1" y="5" width="2" height="2" /><rect x="5" y="5" width="2" height="2" /><rect x="9" y="5" width="2" height="2" />
          <rect x="1" y="9" width="2" height="2" /><rect x="5" y="9" width="2" height="2" /><rect x="9" y="9" width="2" height="2" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium capitalize">{section.type}</p>
        <p className="text-xs text-foreground/40 truncate">{edit.heading || '—'}</p>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="shrink-0 text-xs text-foreground/25 hover:text-red-400 px-1"
      >
        ✕
      </button>
    </div>
  )
}

function SortableCard(props: Parameters<typeof SortableListCard>[0] & { sectionId: string }) {
  const { sectionId, ...rest } = props
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sectionId })

  return (
    <SortableListCard
      {...rest}
      isDragging={isDragging}
      dragRef={setNodeRef}
      dragStyle={{ transform: CSS.Transform.toString(transform), transition }}
      dragListeners={listeners}
      dragAttributes={attributes as DraggableAttributes}
    />
  )
}

// ─── Main PageBuilder ─────────────────────────────────────────────────────────

const SECTION_TYPES = ['text', 'hero', 'cta', 'newsletter', 'image', 'faq', 'testimonials'] as const
const SECTION_TYPES_EXTENDED = ['hero_media', ...SECTION_TYPES] as const

interface Props {
  page: CmsPageRecord
  initialSections: CmsSectionRecord[]
}

export default function PageBuilder({ page, initialSections }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [, startTransition] = useTransition()
  const isClientReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  // Sections & edits
  const [sections, setSections] = useState(initialSections)
  const [editMap, setEditMap] = useState<Record<string, EditState>>(() => {
    const m: Record<string, EditState> = {}
    for (const s of initialSections) m[s.id] = getEditState(s)
    return m
  })

  // UI state
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addType, setAddType] = useState('text')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [uploadingField, setUploadingField] = useState<'image_url' | 'media_url' | 'logo_url' | 'title_image_url' | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Refs for scrolling section into view in left panel
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const leftPanelRef = useRef<HTMLDivElement>(null)

  const selectedSection = selectedId ? sections.find((s) => s.id === selectedId) : null
  const selectedEdit = selectedId ? editMap[selectedId] : null
  const isEditing = Boolean(selectedSection && selectedEdit)

  const selectSection = useCallback((id: string) => {
    setSelectedId(id)
    // Scroll the card into view in the left panel
    setTimeout(() => {
      const card = cardRefs.current[id]
      if (card && leftPanelRef.current) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 50)
  }, [])

  // Preview section refs for scrolling on selection
  const previewRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const handlePreviewClick = useCallback((id: string) => {
    selectSection(id)
  }, [selectSection])

  // Update a field in editMap and trigger live preview
  const handleEditChange = useCallback((id: string, updates: Partial<EditState>) => {
    setEditMap((prev) => ({ ...prev, [id]: { ...prev[id], ...updates } }))
  }, [])

  const handleUploadForSelected = useCallback(async (
    target: 'image_url' | 'media_url' | 'logo_url' | 'title_image_url',
    file: File
  ) => {
    if (!selectedId) return

    setUploadError(null)
    setUploadingField(target)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadErr } = await supabase.storage.from('media').upload(path, file, {
      upsert: false,
    })

    if (uploadErr) {
      setUploadError(uploadErr.message)
      setUploadingField(null)
      return
    }

    const { data } = supabase.storage.from('media').getPublicUrl(path)
    const updates: Partial<EditState> = { [target]: data.publicUrl }

    if (target === 'media_url') {
      updates.media_type = file.type.startsWith('video/') ? 'video' : 'image'
    }

    if (target === 'title_image_url') {
      updates.use_title_image = 'true'
    }

    setEditMap((prev) => ({
      ...prev,
      [selectedId]: { ...prev[selectedId], ...updates },
    }))

    setUploadingField(null)
  }, [selectedId, supabase])

  // Save a section to the server
  const handleSave = useCallback((section: CmsSectionRecord) => {
    const edit = editMap[section.id]
    if (!edit) return

    setSavingIds((prev) => new Set([...prev, section.id]))

    startTransition(async () => {
      const fd = new FormData()
      fd.set('section_id', section.id)
      fd.set('slug', page.slug)
      fd.set('section_type', section.type)
      fd.set('heading', edit.heading)
      fd.set('use_title_image', edit.use_title_image)
      fd.set('title_image_url', edit.title_image_url)
      fd.set('title_image_size', edit.title_image_size)
      fd.set('title_image_offset_x', edit.title_image_offset_x)
      fd.set('title_image_offset_y', edit.title_image_offset_y)
      fd.set('title_image_h_align', edit.title_image_h_align)
      fd.set('title_image_v_align', edit.title_image_v_align)
      fd.set('title_image_padding_top', edit.title_image_padding_top)
      fd.set('title_image_padding_right', edit.title_image_padding_right)
      fd.set('title_image_padding_bottom', edit.title_image_padding_bottom)
      fd.set('title_image_padding_left', edit.title_image_padding_left)
      fd.set('body', edit.body)
      fd.set('button_text', edit.button_text)
      fd.set('button_url', edit.button_url)
      fd.set('image_url', edit.image_url)
      fd.set('logo_url', edit.logo_url)
      fd.set('media_url', edit.media_url)
      fd.set('media_type', edit.media_type)
      fd.set('overlay_opacity', edit.overlay_opacity)
      fd.set('media_blur', edit.media_blur)
      fd.set('media_opacity', edit.media_opacity)
      fd.set('media_brightness', edit.media_brightness)
      fd.set('media_contrast', edit.media_contrast)
      fd.set('glass_mode', edit.glass_mode)
      fd.set('alt', edit.alt)
      fd.set('caption', edit.caption)
      fd.set('items_json', edit.items_json)
      await updateSectionAction(fd)
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(section.id)
        return next
      })
    })
  }, [editMap, page.slug, startTransition])

  // Delete a section
  const handleDelete = useCallback((sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId))
    if (selectedId === sectionId) setSelectedId(null)

    startTransition(async () => {
      const fd = new FormData()
      fd.set('section_id', sectionId)
      fd.set('slug', page.slug)
      await deleteSectionAction(fd)
    })
  }, [selectedId, page.slug, startTransition])

  // Add a section
  const handleAdd = useCallback(() => {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('page_id', page.id)
      fd.set('slug', page.slug)
      fd.set('type', addType)
      await addTextSectionAction(fd)
      router.refresh()
    })
  }, [addType, page.id, page.slug, router, startTransition])

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    setSections((current) => {
      const oldIdx = current.findIndex((s) => s.id === active.id)
      const newIdx = current.findIndex((s) => s.id === over.id)
      const reordered = arrayMove(current, oldIdx, newIdx)

      startTransition(async () => {
        const fd = new FormData()
        fd.set('slug', page.slug)
        fd.set('ordered_ids', reordered.map((s) => s.id).join(','))
        await reorderSectionsAction(fd)
      })

      return reordered
    })
  }, [page.slug, startTransition])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-background">

      {/* ── Preview canvas (full page proportion) ───────────────── */}
      <div
        className={`absolute inset-y-0 left-0 overflow-y-auto transition-[padding] duration-200
          pl-[19.5rem] pr-3 sm:pl-[22rem]
          ${isEditing ? 'right-0 pr-[21rem] sm:pr-[25.5rem]' : 'right-0 sm:pr-4'}`}
      >
        {sections.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-foreground/30">Add a section to get started</p>
          </div>
        )}

        {sections.map((section) => {
          const edit = editMap[section.id] ?? getEditState(section)
          const isSelected = selectedId === section.id

          return (
            <div
              key={section.id}
              ref={(el) => { previewRefs.current[section.id] = el }}
              className={`relative group cursor-pointer outline outline-2 transition-all
                ${isSelected
                  ? 'outline-blue-500/50'
                  : 'outline-transparent hover:outline-foreground/10'
                }`}
              onClick={() => handlePreviewClick(section.id)}
            >
              <SectionPreview type={section.type} edit={edit} />

              {/* Edit badge */}
              <div className={`absolute top-3 right-3 rounded px-2 py-0.5 text-xs transition-opacity
                ${isSelected
                  ? 'bg-blue-500 text-white opacity-100'
                  : 'bg-foreground/80 text-background opacity-0 group-hover:opacity-100'
                }`}>
                {isSelected ? 'Editing' : 'Click to edit'}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Floating UI panels ──────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-30 p-3 sm:p-4">
        <div className="flex h-full items-start justify-between gap-3">
          <div className="pointer-events-auto flex h-full w-[18.5rem] sm:w-[20.5rem] shrink-0 flex-col overflow-hidden rounded-xl border border-foreground/15 bg-background/90 shadow-2xl backdrop-blur">
            {/* Panel header */}
            <div className="shrink-0 border-b border-foreground/10 px-4 py-3 flex items-center gap-2">
              <Link href="/admin" className="text-xs text-foreground/40 hover:text-foreground">
                ←
              </Link>
              <span className="flex-1 text-sm truncate font-medium">{page.title}</span>
              <Link
                href={page.slug === 'home' ? '/' : `/${page.slug}`}
                target="_blank"
                className="text-xs text-foreground/40 hover:text-foreground"
              >
                ↗
              </Link>
            </div>

            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Add section */}
              <div className="shrink-0 border-b border-foreground/10 p-3 flex gap-2">
                <select
                  value={addType}
                  onChange={(e) => setAddType(e.target.value)}
                  className="flex-1 border border-foreground/10 bg-background px-2 py-1.5 text-xs outline-none focus:border-foreground/30"
                >
                  {SECTION_TYPES_EXTENDED.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAdd}
                  className="shrink-0 border border-foreground/10 px-3 py-1.5 text-xs hover:bg-foreground/5"
                >
                  + Add
                </button>
              </div>

              <p className="shrink-0 px-4 py-2 text-xs text-foreground/30">
                Click a section in the preview to edit it
              </p>

              <div ref={leftPanelRef} className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
                {sections.length === 0 && (
                  <p className="py-6 text-center text-xs text-foreground/30">No sections yet</p>
                )}

                {isClientReady ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={(e) => setActiveId(String(e.active.id))}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                      {sections.map((section) => (
                        <div
                          key={section.id}
                          ref={(el) => { cardRefs.current[section.id] = el }}
                        >
                          <SortableCard
                            sectionId={section.id}
                            section={section}
                            edit={editMap[section.id] ?? getEditState(section)}
                            isSelected={selectedId === section.id}
                            isDragging={activeId === section.id}
                            onSelect={() => selectSection(section.id)}
                            onDelete={() => handleDelete(section.id)}
                            dragRef={() => {}}
                            dragStyle={{}}
                          />
                        </div>
                      ))}
                    </SortableContext>

                    <DragOverlay dropAnimation={null}>
                      {activeId && editMap[activeId] ? (
                        <div className="opacity-80 shadow-xl">
                          <SortableListCard
                            section={sections.find((s) => s.id === activeId)!}
                            edit={editMap[activeId]}
                            isSelected={false}
                            isDragging={false}
                            onSelect={() => {}}
                            onDelete={() => {}}
                            dragRef={() => {}}
                            dragStyle={{}}
                          />
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                ) : (
                  <div className="space-y-1.5">
                    {sections.map((section) => (
                      <div
                        key={section.id}
                        ref={(el) => { cardRefs.current[section.id] = el }}
                      >
                        <SortableListCard
                          section={section}
                          edit={editMap[section.id] ?? getEditState(section)}
                          isSelected={selectedId === section.id}
                          isDragging={false}
                          onSelect={() => selectSection(section.id)}
                          onDelete={() => handleDelete(section.id)}
                          dragRef={() => {}}
                          dragStyle={{}}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Page settings */}
              <details className="shrink-0 border-t border-foreground/10">
                <summary className="cursor-pointer px-4 py-3 text-xs text-foreground/50 hover:text-foreground select-none">
                  Page settings
                </summary>
                <div className="p-4">
                  <form action={updatePageMetadataAction} className="space-y-2">
                    <input type="hidden" name="page_id" value={page.id} />
                    <input type="hidden" name="slug" value={page.slug} />
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-foreground/40">Title</span>
                      <input name="title" defaultValue={page.title}
                        className="border border-foreground/10 bg-background px-2 py-1.5 text-xs outline-none focus:border-foreground/30 w-full" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-foreground/40">Status</span>
                      <select name="status" defaultValue={page.status}
                        className="border border-foreground/10 bg-background px-2 py-1.5 text-xs outline-none focus:border-foreground/30 w-full">
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-foreground/40">SEO title</span>
                      <input name="seo_title" defaultValue={page.seo_title ?? ''}
                        className="border border-foreground/10 bg-background px-2 py-1.5 text-xs outline-none focus:border-foreground/30 w-full" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-foreground/40">SEO description</span>
                      <textarea name="seo_description" defaultValue={page.seo_description ?? ''} rows={2}
                        className="border border-foreground/10 bg-background px-2 py-1.5 text-xs outline-none focus:border-foreground/30 resize-none w-full" />
                    </label>
                    <button type="submit"
                      className="w-full border border-foreground/10 py-1.5 text-xs hover:bg-foreground/5">
                      Save
                    </button>
                  </form>
                </div>
              </details>
            </div>
          </div>

          {selectedSection && selectedEdit ? (
            <div className="pointer-events-auto h-full w-[20rem] sm:w-[24rem] max-w-[92vw] overflow-hidden rounded-xl border border-foreground/15 bg-background/90 shadow-2xl backdrop-blur">
              <EditForm
                key={selectedSection.id}
                section={selectedSection}
                edit={selectedEdit}
                onChange={(u) => handleEditChange(selectedSection.id, u)}
                onSave={() => handleSave(selectedSection)}
                isSaving={savingIds.has(selectedSection.id)}
                onClose={() => setSelectedId(null)}
                onUploadFile={handleUploadForSelected}
                uploadingField={uploadingField}
                uploadError={uploadError}
              />
            </div>
          ) : null}
        </div>

      </div>
    </div>
  )
}
