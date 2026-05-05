'use client'

import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition, type FocusEvent } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { saveLinksBuilderAction } from '@/app/admin/actions'
import { createClient } from '@/lib/supabase/client'

const AUTO_SAVE_DELAY_MS = 900
const DRAFT_BROADCAST_DELAY_MS = 120
const EDITOR_COMMIT_DELAY_MS = 120

type LinkRecord = {
  id: string
  title: string
  url: string
  description: string | null
  order_index: number
  position_x: number
  position_y: number
  velocity_x: number
  velocity_y: number
}

type EditableLink = {
  clientId: string
  id?: string
  title: string
  url: string
  description: string
  position_x: number
  position_y: number
  velocity_x: number
  velocity_y: number
}

type LoadState =
  | { kind: 'ready' }
  | { kind: 'missing-table'; message: string }
  | { kind: 'error'; code?: string | null; message: string }

type SupabaseBrowserClient = ReturnType<typeof createClient>

type LiveDraftPayload = {
  senderId: string
  links: EditableLink[]
  activeId: string | null
  editingId: string | null
  titleImageUrl: string | null
  titleImageSize: number
  titleImagePaddingTop: number
  titleImagePaddingRight: number
  titleImagePaddingBottom: number
  titleImagePaddingLeft: number
}

const QUICK_TEMPLATES = [
  { title: 'Instagram', url: 'https://instagram.com/', description: 'Behind the scenes and fresh drops.' },
  { title: 'TikTok', url: 'https://www.tiktok.com/', description: 'Short-form updates, launches, and teasers.' },
  { title: 'YouTube', url: 'https://www.youtube.com/', description: 'Long-form stories and walkthroughs.' },
  { title: 'Shop', url: 'https://', description: 'Official store page with current products.' },
  { title: 'Etsy Store', url: 'https://www.etsy.com/shop/', description: 'Handmade and limited catalog.' },
  { title: 'Newsletter', url: '/#newsletter', description: 'Email updates, release notes, and offers.' },
]

const UNTITLED_LABEL = 'Untitled'

function makeClientId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `tmp-${Math.random().toString(36).slice(2, 10)}`
}

function toEditableLink(link: LinkRecord): EditableLink {
  return {
    clientId: link.id,
    id: link.id,
    title: link.title,
    url: link.url,
    description: link.description ?? '',
    position_x: link.position_x,
    position_y: link.position_y,
    velocity_x: link.velocity_x,
    velocity_y: link.velocity_y,
  }
}

function toEditableLinks(links: LinkRecord[]) {
  return [...links]
    .sort((a, b) => a.order_index - b.order_index)
    .map((item) => toEditableLink(item))
}

function toPublishedLinks(links: EditableLink[]) {
  return links.filter((item) => item.url.trim())
}

function normalizeLinkUrl(value: string) {
  const raw = value.trim()
  if (!raw) return ''

  if (
    raw.startsWith('/') ||
    raw.startsWith('#') ||
    raw.startsWith('mailto:') ||
    raw.startsWith('tel:')
  ) {
    return raw
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw
  }

  return `https://${raw}`
}

function normalizeEditableLink(link: EditableLink): EditableLink {
  return {
    ...link,
    title: link.title.trim() || UNTITLED_LABEL,
    url: normalizeLinkUrl(link.url),
    description: link.description.trim(),
  }
}

function serializeEditableLink(link: EditableLink | null) {
  if (!link) {
    return ''
  }

  return JSON.stringify({
    clientId: link.clientId,
    id: link.id ?? null,
    title: link.title,
    url: link.url,
    description: link.description,
    position_x: link.position_x,
    position_y: link.position_y,
    velocity_x: link.velocity_x,
    velocity_y: link.velocity_y,
  })
}

function serializeLinks(links: EditableLink[]) {
  return JSON.stringify(
    links.map((link) => ({
      id: link.id ?? null,
      clientId: link.clientId,
      title: link.title,
      url: link.url,
      description: link.description,
      position_x: link.position_x,
      position_y: link.position_y,
      velocity_x: link.velocity_x,
      velocity_y: link.velocity_y,
    }))
  )
}

function moveLink(previous: EditableLink[], activeId: string, overId: string) {
  const oldIndex = previous.findIndex((item) => item.clientId === activeId)
  const newIndex = previous.findIndex((item) => item.clientId === overId)

  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return previous
  }

  return arrayMove(previous, oldIndex, newIndex)
}

function PageLinkCard({
  link,
}: {
  link: EditableLink
}) {
  return (
    <>
      <div className="flex justify-center">
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground">{link.title || UNTITLED_LABEL}</p>
          {link.description ? <p className="mt-0.5 text-[13px] leading-5 text-foreground/72">{link.description}</p> : null}
        </div>
      </div>
    </>
  )
}

function PublicLinkRow({
  link,
  isLiveDragging,
  isLiveEditing,
  setItemRef,
}: {
  link: EditableLink
  isLiveDragging?: boolean
  isLiveEditing?: boolean
  setItemRef: (id: string, node: HTMLDivElement | null) => void
}) {
  return (
    <div
      ref={(node) => setItemRef(link.clientId, node)}
      className={`border-b border-foreground/10 py-2.5 transition-[transform,background-color,border-color,box-shadow] duration-300 ${
        isLiveDragging
          ? 'border-foreground/25 bg-foreground/[0.025]'
          : isLiveEditing
            ? 'border-foreground/20 bg-foreground/[0.015]'
            : 'bg-transparent'
      }`}
    >
      <div className="flex justify-center">
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground">{link.title || UNTITLED_LABEL}</p>
          {link.description ? <p className="mt-0.5 text-[13px] leading-5 text-foreground/72">{link.description}</p> : null}
        </div>
      </div>
    </div>
  )
}

function PageLinkShell({
  children,
  isDragging,
  isLiveDragging,
  isLiveEditing,
  setItemRef,
  itemId,
}: {
  children: React.ReactNode
  isDragging?: boolean
  isLiveDragging?: boolean
  isLiveEditing?: boolean
  setItemRef?: (id: string, node: HTMLDivElement | null) => void
  itemId?: string
}) {
  return (
    <div
      ref={setItemRef && itemId ? (node) => setItemRef(itemId, node) : undefined}
      className={`border-b border-foreground/10 bg-background py-2.5 transition-[transform,box-shadow,border-color,opacity,background-color] duration-300 ${
        isDragging
          ? 'border-foreground/30 bg-background shadow-[0_16px_34px_-20px_rgba(0,0,0,0.22)]'
          : isLiveDragging
            ? 'border-foreground/25 bg-foreground/[0.025]'
            : isLiveEditing
              ? 'border-foreground/20 bg-foreground/[0.015]'
              : 'border-foreground/10 opacity-100'
      }`}
    >
      {children}
    </div>
  )
}

async function fetchLinksSnapshot(supabase: SupabaseBrowserClient) {
  const [{ data, error }, { data: settings }] = await Promise.all([
    supabase
      .from('links')
      .select('id, title, url, description, order_index, position_x, position_y, velocity_x, velocity_y')
      .order('order_index', { ascending: true })
      .returns<LinkRecord[]>(),
    supabase
      .from('links_settings')
      .select('title_image_url, title_image_size, title_image_padding_top, title_image_padding_right, title_image_padding_bottom, title_image_padding_left')
      .eq('id', 1)
      .maybeSingle<{
        title_image_url: string | null
        title_image_size: number | null
        title_image_padding_top: number | null
        title_image_padding_right: number | null
        title_image_padding_bottom: number | null
        title_image_padding_left: number | null
      }>(),
  ])

  if (error?.code === 'PGRST205') {
    return {
      links: [] as LinkRecord[],
      titleImageUrl: settings?.title_image_url ?? null,
      titleImageSize: settings?.title_image_size ?? 100,
      titleImagePaddingTop: settings?.title_image_padding_top ?? 0,
      titleImagePaddingRight: settings?.title_image_padding_right ?? 0,
      titleImagePaddingBottom: settings?.title_image_padding_bottom ?? 0,
      titleImagePaddingLeft: settings?.title_image_padding_left ?? 0,
      loadState: {
        kind: 'missing-table',
        message: 'The public.links table is missing from Supabase.',
      } satisfies LoadState,
    }
  }

  if (error) {
    return {
      links: [] as LinkRecord[],
      titleImageUrl: settings?.title_image_url ?? null,
      titleImageSize: settings?.title_image_size ?? 100,
      titleImagePaddingTop: settings?.title_image_padding_top ?? 0,
      titleImagePaddingRight: settings?.title_image_padding_right ?? 0,
      titleImagePaddingBottom: settings?.title_image_padding_bottom ?? 0,
      titleImagePaddingLeft: settings?.title_image_padding_left ?? 0,
      loadState: {
        kind: 'error',
        code: error.code,
        message: error.message,
      } satisfies LoadState,
    }
  }

  return {
    links: data ?? [],
    titleImageUrl: settings?.title_image_url ?? null,
    titleImageSize: settings?.title_image_size ?? 100,
    titleImagePaddingTop: settings?.title_image_padding_top ?? 0,
    titleImagePaddingRight: settings?.title_image_padding_right ?? 0,
    titleImagePaddingBottom: settings?.title_image_padding_bottom ?? 0,
    titleImagePaddingLeft: settings?.title_image_padding_left ?? 0,
    loadState: { kind: 'ready' } satisfies LoadState,
  }
}

function SortablePageItem({
  link,
  isLiveDragging,
  isLiveEditing,
  setItemRef,
  onActivate,
}: {
  link: EditableLink
  isLiveDragging?: boolean
  isLiveEditing?: boolean
  setItemRef: (id: string, node: HTMLDivElement | null) => void
  onActivate: (clientId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.clientId,
  })

  const liftedTransform = transform
    ? {
        ...transform,
        scaleX: 1.03,
        scaleY: 1.03,
      }
    : null

  const style = {
    transform: CSS.Transform.toString(liftedTransform ?? transform),
    transition: isDragging ? undefined : transition,
    position: 'relative' as const,
    zIndex: isDragging ? 20 : undefined,
    transformOrigin: 'center center',
    willChange: 'transform',
  }

  return (
    <div
      ref={(node) => {
        setNodeRef(node)
        setItemRef(link.clientId, node)
      }}
      style={style}
      onClick={() => {
        if (!isDragging) {
          onActivate(link.clientId)
        }
      }}
      {...attributes}
      {...listeners}
    >
      <PageLinkShell
        isDragging={isDragging}
        isLiveDragging={isLiveDragging}
        isLiveEditing={isLiveEditing}
      >
        <PageLinkCard
          link={link}
        />
      </PageLinkShell>
    </div>
  )
}

function EditorCard({
  link,
  index,
  onChange,
  onDelete,
  onDuplicate,
  onFocus,
  onBlur,
  isLiveEditing,
  isLiveDragging,
  showToggle = false,
  onToggle,
}: {
  link: EditableLink
  index: number
  onChange: (clientId: string, field: keyof Pick<EditableLink, 'title' | 'url' | 'description'>, value: string) => void
  onDelete: (clientId: string) => void
  onDuplicate: (clientId: string) => void
  onFocus: (clientId: string) => void
  onBlur: (event: FocusEvent<HTMLElement>, clientId: string) => void
  isLiveEditing?: boolean
  isLiveDragging?: boolean
  showToggle?: boolean
  onToggle?: (clientId: string) => void
}) {
  return (
    <article
      onFocusCapture={() => onFocus(link.clientId)}
      onBlurCapture={(event) => onBlur(event, link.clientId)}
      className={`border-b pb-5 transition-[border-color,background-color] duration-300 ${
        isLiveDragging
          ? 'border-foreground/20 bg-foreground/[0.02]'
          : isLiveEditing
            ? 'border-foreground/15 bg-foreground/[0.015]'
            : 'border-foreground/10'
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">Link {index + 1}</p>
          <p className="mt-1 text-sm text-foreground/42">Reorder on page</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {showToggle && onToggle ? (
            <button
              type="button"
              onClick={() => onToggle(link.clientId)}
              className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/55 hover:text-foreground"
            >
              Toggle
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDuplicate(link.clientId)}
            className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/55 hover:text-foreground"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={() => onDelete(link.clientId)}
            className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/55 hover:text-foreground"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <label className="grid gap-1.5 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/55">Title</span>
            <input
              value={link.title}
              onChange={(event) => onChange(link.clientId, 'title', event.target.value)}
              className="border-b border-foreground/15 bg-transparent px-0 py-2 text-sm outline-none focus:border-foreground/35"
              placeholder="Instagram"
            />
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/55">URL</span>
            <input
              value={link.url}
              onChange={(event) => onChange(link.clientId, 'url', event.target.value)}
              className="border-b border-foreground/15 bg-transparent px-0 py-2 text-sm outline-none focus:border-foreground/35"
              placeholder="https://instagram.com/your-handle"
            />
          </label>
        </div>

        <label className="grid gap-1.5 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/55">Secondary text</span>
          <input
            value={link.description}
            onChange={(event) => onChange(link.clientId, 'description', event.target.value)}
            className="border-b border-foreground/15 bg-transparent px-0 py-2 text-sm outline-none focus:border-foreground/35"
            placeholder="Brief supporting line"
          />
        </label>
      </div>
    </article>
  )
}

export default function LinksBuilder({
  initialLinks,
  isAdmin,
  initialLoadState,
  initialTitleImageUrl,
  initialTitleImageSize,
  initialTitleImagePaddingTop,
  initialTitleImagePaddingRight,
  initialTitleImagePaddingBottom,
  initialTitleImagePaddingLeft,
}: {
  initialLinks: LinkRecord[]
  isAdmin: boolean
  initialLoadState: LoadState
  initialTitleImageUrl: string | null
  initialTitleImageSize: number
  initialTitleImagePaddingTop: number
  initialTitleImagePaddingRight: number
  initialTitleImagePaddingBottom: number
  initialTitleImagePaddingLeft: number
}) {
  const supabase = useMemo(() => createClient(), [])
  const [isPending, startTransition] = useTransition()
  const [links, setLinks] = useState<EditableLink[]>(() => toEditableLinks(initialLinks))
  const [loadState, setLoadState] = useState<LoadState>(initialLoadState)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string>('')
  const [saveError, setSaveError] = useState<string>('')
  const [editorVisible, setEditorVisible] = useState(isAdmin)
  const [selectedId, setSelectedId] = useState<string | null>(() => toEditableLinks(initialLinks)[0]?.clientId ?? null)
  const [selectedDraft, setSelectedDraft] = useState<EditableLink | null>(() => toEditableLinks(initialLinks)[0] ?? null)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [lastSavedFingerprint, setLastSavedFingerprint] = useState(() => serializeLinks(toEditableLinks(initialLinks)))
  const [lastSavedTitleImageUrl, setLastSavedTitleImageUrl] = useState(initialTitleImageUrl ?? '')
  const [lastSavedTitleImageSize, setLastSavedTitleImageSize] = useState(initialTitleImageSize)
  const [lastSavedTitleImagePaddingTop, setLastSavedTitleImagePaddingTop] = useState(initialTitleImagePaddingTop)
  const [lastSavedTitleImagePaddingRight, setLastSavedTitleImagePaddingRight] = useState(initialTitleImagePaddingRight)
  const [lastSavedTitleImagePaddingBottom, setLastSavedTitleImagePaddingBottom] = useState(initialTitleImagePaddingBottom)
  const [lastSavedTitleImagePaddingLeft, setLastSavedTitleImagePaddingLeft] = useState(initialTitleImagePaddingLeft)
  const [remoteDraft, setRemoteDraft] = useState<LiveDraftPayload | null>(null)
  const [titleImageUrl, setTitleImageUrl] = useState<string | null>(initialTitleImageUrl)
  const [titleImageSize, setTitleImageSize] = useState(initialTitleImageSize)
  const [titleImagePaddingTop, setTitleImagePaddingTop] = useState(initialTitleImagePaddingTop)
  const [titleImagePaddingRight, setTitleImagePaddingRight] = useState(initialTitleImagePaddingRight)
  const [titleImagePaddingBottom, setTitleImagePaddingBottom] = useState(initialTitleImagePaddingBottom)
  const [titleImagePaddingLeft, setTitleImagePaddingLeft] = useState(initialTitleImagePaddingLeft)
  const [isUploadingTitleImage, setIsUploadingTitleImage] = useState(false)
  const clientId = useMemo(() => makeClientId(), [])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const itemRefs = useRef(new Map<string, HTMLDivElement>())
  const previousRectsRef = useRef(new Map<string, DOMRect>())
  const skipLocalDbRefreshUntilRef = useRef(0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const hasLocalInteractiveState =
    isAdmin &&
    (
      activeId !== null ||
      serializeLinks(links) !== lastSavedFingerprint ||
      (titleImageUrl ?? '') !== lastSavedTitleImageUrl ||
      titleImageSize !== lastSavedTitleImageSize ||
      titleImagePaddingTop !== lastSavedTitleImagePaddingTop ||
      titleImagePaddingRight !== lastSavedTitleImagePaddingRight ||
      titleImagePaddingBottom !== lastSavedTitleImagePaddingBottom ||
      titleImagePaddingLeft !== lastSavedTitleImagePaddingLeft
    )
  const remoteDraftMatchesPersisted = remoteDraft ? serializeLinks(remoteDraft.links) === serializeLinks(links) : false
  const shouldShowRemoteDraft = Boolean(
    remoteDraft && !hasLocalInteractiveState && (!remoteDraftMatchesPersisted || remoteDraft.activeId || remoteDraft.editingId)
  )
  const draftLinks = shouldShowRemoteDraft && remoteDraft ? remoteDraft.links : null
  const displayedTitleImageUrl = shouldShowRemoteDraft && remoteDraft
    ? remoteDraft.titleImageUrl
    : titleImageUrl
  const displayedTitleImageSize = shouldShowRemoteDraft && remoteDraft
    ? remoteDraft.titleImageSize
    : titleImageSize
  const displayedTitleImagePaddingTop = shouldShowRemoteDraft && remoteDraft
    ? remoteDraft.titleImagePaddingTop
    : titleImagePaddingTop
  const displayedTitleImagePaddingRight = shouldShowRemoteDraft && remoteDraft
    ? remoteDraft.titleImagePaddingRight
    : titleImagePaddingRight
  const displayedTitleImagePaddingBottom = shouldShowRemoteDraft && remoteDraft
    ? remoteDraft.titleImagePaddingBottom
    : titleImagePaddingBottom
  const displayedTitleImagePaddingLeft = shouldShowRemoteDraft && remoteDraft
    ? remoteDraft.titleImagePaddingLeft
    : titleImagePaddingLeft
  const deferredLinks = useDeferredValue(links)
  const renderedLinks = draftLinks ?? (isAdmin ? deferredLinks : links)
  const displayedActiveId = activeId ?? remoteDraft?.activeId ?? null
  const displayedEditingId = editingId ?? remoteDraft?.editingId ?? null
  const publishedLinks = useMemo(() => toPublishedLinks(renderedLinks), [renderedLinks])
  const selectedIndex = useMemo(() => links.findIndex((link) => link.clientId === selectedId), [links, selectedId])

  useEffect(() => {
    if (!selectedDraft) {
      return
    }

    const matchingLink = links.find((link) => link.clientId === selectedDraft.clientId)
    if (!matchingLink) {
      return
    }

    if (serializeEditableLink(matchingLink) === serializeEditableLink(selectedDraft)) {
      return
    }

    const timeout = window.setTimeout(() => {
      setLinks((previous) =>
        previous.map((link) =>
          link.clientId === selectedDraft.clientId
            ? {
                ...link,
                title: selectedDraft.title,
                url: selectedDraft.url,
                description: selectedDraft.description,
              }
            : link
        )
      )
    }, EDITOR_COMMIT_DELAY_MS)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [links, selectedDraft])

  function setItemRef(id: string, node: HTMLDivElement | null) {
    if (node) {
      itemRefs.current.set(id, node)
      return
    }

    itemRefs.current.delete(id)
  }

  function revealEditorFor(clientId: string) {
    setEditorVisible(true)
    setSelectedId(clientId)
    setEditingId(clientId)
    setSelectedDraft(links.find((link) => link.clientId === clientId) ?? null)
  }

  useLayoutEffect(() => {
    const nextRects = new Map<string, DOMRect>()
    const shouldAnimateReflow = !isAdmin && activeId === null

    for (const link of publishedLinks) {
      const node = itemRefs.current.get(link.clientId)
      if (!node) {
        continue
      }

      const previousRect = previousRectsRef.current.get(link.clientId)
      const nextRect = node.getBoundingClientRect()
      nextRects.set(link.clientId, nextRect)

      if (!previousRect) {
        continue
      }

      const deltaX = previousRect.left - nextRect.left
      const deltaY = previousRect.top - nextRect.top

      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
        continue
      }

      if (!shouldAnimateReflow) {
        continue
      }

      node.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: 'translate(0px, 0px)' },
        ],
        {
          duration: 260,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        }
      )
    }

    previousRectsRef.current = nextRects
  }, [activeId, isAdmin, publishedLinks])

  useEffect(() => {
    const channel = supabase
      .channel('links-live-updates')
      .on('broadcast', { event: 'draft-state' }, ({ payload }) => {
        const nextDraft = payload as LiveDraftPayload

        if (nextDraft.senderId === clientId) {
          return
        }

        setRemoteDraft(nextDraft)
      })
      .on('broadcast', { event: 'clear-draft-state' }, ({ payload }) => {
        const nextPayload = payload as { senderId?: string }

        if (nextPayload.senderId === clientId) {
          return
        }

        setRemoteDraft(null)
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'links' },
        () => {
          if (isAdmin && Date.now() < skipLocalDbRefreshUntilRef.current) {
            return
          }

          void fetchLinksSnapshot(supabase).then((snapshot) => {
            const nextLinks = toEditableLinks(snapshot.links)
            const nextSelectedId = selectedId && nextLinks.some((link) => link.clientId === selectedId)
              ? selectedId
              : (nextLinks[0]?.clientId ?? null)
            setLoadState(snapshot.loadState)
            setLinks(nextLinks)
            setLastSavedFingerprint(serializeLinks(nextLinks))
            setTitleImageUrl(snapshot.titleImageUrl)
            setLastSavedTitleImageUrl(snapshot.titleImageUrl ?? '')
            setTitleImageSize(snapshot.titleImageSize)
            setTitleImagePaddingTop(snapshot.titleImagePaddingTop)
            setTitleImagePaddingRight(snapshot.titleImagePaddingRight)
            setTitleImagePaddingBottom(snapshot.titleImagePaddingBottom)
            setTitleImagePaddingLeft(snapshot.titleImagePaddingLeft)
            setLastSavedTitleImageSize(snapshot.titleImageSize)
            setLastSavedTitleImagePaddingTop(snapshot.titleImagePaddingTop)
            setLastSavedTitleImagePaddingRight(snapshot.titleImagePaddingRight)
            setLastSavedTitleImagePaddingBottom(snapshot.titleImagePaddingBottom)
            setLastSavedTitleImagePaddingLeft(snapshot.titleImagePaddingLeft)
            setSelectedId(nextSelectedId)
            setSelectedDraft(nextLinks.find((link) => link.clientId === nextSelectedId) ?? null)
            setRemoteDraft((previous) => {
              if (!previous) {
                return previous
              }

              return serializeLinks(previous.links) === serializeLinks(nextLinks) &&
                (previous.titleImageUrl ?? '') === (snapshot.titleImageUrl ?? '')
                && previous.titleImageSize === snapshot.titleImageSize
                && previous.titleImagePaddingTop === snapshot.titleImagePaddingTop
                && previous.titleImagePaddingRight === snapshot.titleImagePaddingRight
                && previous.titleImagePaddingBottom === snapshot.titleImagePaddingBottom
                && previous.titleImagePaddingLeft === snapshot.titleImagePaddingLeft
                ? null
                : previous
            })
          })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'links_settings' },
        () => {
          void fetchLinksSnapshot(supabase).then((snapshot) => {
            setTitleImageUrl(snapshot.titleImageUrl)
            setLastSavedTitleImageUrl(snapshot.titleImageUrl ?? '')
            setTitleImageSize(snapshot.titleImageSize)
            setTitleImagePaddingTop(snapshot.titleImagePaddingTop)
            setTitleImagePaddingRight(snapshot.titleImagePaddingRight)
            setTitleImagePaddingBottom(snapshot.titleImagePaddingBottom)
            setTitleImagePaddingLeft(snapshot.titleImagePaddingLeft)
            setLastSavedTitleImageSize(snapshot.titleImageSize)
            setLastSavedTitleImagePaddingTop(snapshot.titleImagePaddingTop)
            setLastSavedTitleImagePaddingRight(snapshot.titleImagePaddingRight)
            setLastSavedTitleImagePaddingBottom(snapshot.titleImagePaddingBottom)
            setLastSavedTitleImagePaddingLeft(snapshot.titleImagePaddingLeft)
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        void channelRef.current.send({
          type: 'broadcast',
          event: 'clear-draft-state',
          payload: { senderId: clientId },
        })
      }

      channelRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [clientId, isAdmin, selectedId, supabase])

  useEffect(() => {
    if (!isAdmin || !channelRef.current || loadState.kind !== 'ready') {
      return
    }

    const timeout = window.setTimeout(() => {
      void channelRef.current?.send({
        type: 'broadcast',
        event: 'draft-state',
        payload: {
          senderId: clientId,
          links,
          activeId,
          editingId,
          titleImageUrl,
          titleImageSize,
          titleImagePaddingTop,
          titleImagePaddingRight,
          titleImagePaddingBottom,
          titleImagePaddingLeft,
        } satisfies LiveDraftPayload,
      })
    }, DRAFT_BROADCAST_DELAY_MS)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [
    activeId,
    clientId,
    editingId,
    isAdmin,
    links,
    loadState.kind,
    titleImageUrl,
    titleImageSize,
    titleImagePaddingTop,
    titleImagePaddingRight,
    titleImagePaddingBottom,
    titleImagePaddingLeft,
  ])

  function updateLink(
    clientId: string,
    field: keyof Pick<EditableLink, 'title' | 'url' | 'description'>,
    value: string
  ) {
    setSelectedDraft((previous) =>
      previous && previous.clientId === clientId
        ? {
            ...previous,
            [field]: value,
          }
        : previous
    )
  }

  function addBlankLink() {
    const clientId = makeClientId()
    setLinks((previous) => [
      ...previous,
      {
        clientId,
        title: '',
        url: '',
        description: '',
        position_x: 50,
        position_y: 50,
        velocity_x: 0,
        velocity_y: 0,
      },
    ])
    setEditorVisible(true)
    setSelectedId(clientId)
    setEditingId(clientId)
    setSelectedDraft({
      clientId,
      title: '',
      url: '',
      description: '',
      position_x: 50,
      position_y: 50,
      velocity_x: 0,
      velocity_y: 0,
    })
  }

  function addTemplate(index: number) {
    const template = QUICK_TEMPLATES[index]
    if (!template) return

    const clientId = makeClientId()
    setLinks((previous) => [
      ...previous,
      {
        clientId,
        title: template.title,
        url: template.url,
        description: template.description,
        position_x: 50,
        position_y: 50,
        velocity_x: 0,
        velocity_y: 0,
      },
    ])
    setEditorVisible(true)
    setSelectedId(clientId)
    setEditingId(clientId)
    setSelectedDraft({
      clientId,
      title: template.title,
      url: template.url,
      description: template.description,
      position_x: 50,
      position_y: 50,
      velocity_x: 0,
      velocity_y: 0,
    })
  }

  function duplicateLink(clientId: string) {
    const existing = links.find((item) => item.clientId === clientId)
    if (!existing) return

    const nextClientId = makeClientId()
    setLinks((previous) => [
      ...previous,
      {
        clientId: nextClientId,
        title: existing.title,
        url: existing.url,
        description: existing.description,
        position_x: existing.position_x,
        position_y: existing.position_y,
        velocity_x: existing.velocity_x,
        velocity_y: existing.velocity_y,
      },
    ])
    setEditorVisible(true)
    setSelectedId(nextClientId)
    setEditingId(nextClientId)
    setSelectedDraft({
      clientId: nextClientId,
      title: existing.title,
      url: existing.url,
      description: existing.description,
      position_x: existing.position_x,
      position_y: existing.position_y,
      velocity_x: existing.velocity_x,
      velocity_y: existing.velocity_y,
    })
  }

  function removeLink(clientId: string) {
    setLinks((previous) => {
      const next = previous.filter((item) => item.clientId !== clientId)
      setSelectedId((current) => {
        if (current !== clientId) {
          return current
        }

        return next[0]?.clientId ?? null
      })
      setSelectedDraft((previousDraft) => {
        if (previousDraft?.clientId !== clientId) {
          return previousDraft
        }

        return next[0] ?? null
      })
      return next
    })
    setEditingId((previous) => (previous === clientId ? null : previous))
  }

  function handlePageDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    setLinks((previous) => moveLink(previous, String(active.id), String(over.id)))
  }

  function handlePageDragOver(event: DragOverEvent) {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    setLinks((previous) => moveLink(previous, String(active.id), String(over.id)))
  }

  function handleEditorBlur(event: FocusEvent<HTMLElement>, clientId: string) {
    const nextTarget = event.relatedTarget
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return
    }

    setEditingId((previous) => (previous === clientId ? null : previous))
  }

  async function uploadTitleImage(file: File) {
    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')

    if (!isSvg) {
      setSaveError('Please upload an SVG file.')
      return
    }

    setIsUploadingTitleImage(true)
    setSaveError('')

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase()
    const filePath = `links/title-images/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, file, { upsert: false, contentType: 'image/svg+xml' })

    if (uploadError) {
      setSaveError(uploadError.message || 'Could not upload title image.')
      setIsUploadingTitleImage(false)
      return
    }

    const { data: publicData } = supabase.storage.from('media').getPublicUrl(filePath)
    setTitleImageUrl(publicData.publicUrl)
    setSaveMessage('Title image updated.')
    setIsUploadingTitleImage(false)
  }

  async function persistLinks(nextLinks: EditableLink[]) {
    setSaveMessage('')
    setSaveError('')
    setIsAutoSaving(true)

    const normalizedNextLinks = nextLinks.map((link) => normalizeEditableLink(link))
    const persistableLinks = normalizedNextLinks.filter((link) => link.title && link.url)

    const result = await saveLinksBuilderAction(
      normalizedNextLinks.map((link) => ({
        id: link.id,
        title: link.title,
        url: link.url,
        description: link.description,
        position_x: link.position_x,
        position_y: link.position_y,
        velocity_x: link.velocity_x,
        velocity_y: link.velocity_y,
      })),
      {
        titleImageUrl,
        titleImageSize,
        titleImagePaddingTop,
        titleImagePaddingRight,
        titleImagePaddingBottom,
        titleImagePaddingLeft,
      }
    )

    if (!result?.ok) {
      setSaveError(result?.message || 'Could not save links.')
      setIsAutoSaving(false)
      return false
    }

    const savedLinks = Array.isArray(result.links) ? toEditableLinks(result.links) : []
    const persistedIdByClientId = new Map<string, string>()

    for (let index = 0; index < persistableLinks.length; index += 1) {
      const localLink = persistableLinks[index]
      const savedLink = savedLinks[index]

      if (!localLink || !savedLink) {
        continue
      }

      persistedIdByClientId.set(localLink.clientId, savedLink.id ?? savedLink.clientId)
    }

    const mergedLinks = nextLinks.map((link) => {
      const persistedId = persistedIdByClientId.get(link.clientId)

      if (!persistedId) {
        return link
      }

      return {
        ...link,
        id: persistedId,
        clientId: persistedId,
      }
    })

    skipLocalDbRefreshUntilRef.current = Date.now() + 1200
    setLinks(mergedLinks)
    setSelectedId((previous) => {
      const nextSelectedId = previous ? persistedIdByClientId.get(previous) ?? previous : previous
      setSelectedDraft(mergedLinks.find((link) => link.clientId === nextSelectedId) ?? null)
      return nextSelectedId
    })
    setEditingId((previous) => (previous ? persistedIdByClientId.get(previous) ?? previous : previous))
    setSaveMessage(result.message || 'Saved. The links page has been updated.')
    setLastSavedFingerprint(serializeLinks(mergedLinks))
    setLastSavedTitleImageUrl(result.titleImageUrl ?? titleImageUrl ?? '')
    setTitleImageUrl(result.titleImageUrl ?? titleImageUrl)
    setLastSavedTitleImageSize(result.titleImageSize ?? titleImageSize)
    setLastSavedTitleImagePaddingTop(result.titleImagePaddingTop ?? titleImagePaddingTop)
    setLastSavedTitleImagePaddingRight(result.titleImagePaddingRight ?? titleImagePaddingRight)
    setLastSavedTitleImagePaddingBottom(result.titleImagePaddingBottom ?? titleImagePaddingBottom)
    setLastSavedTitleImagePaddingLeft(result.titleImagePaddingLeft ?? titleImagePaddingLeft)
    setTitleImageSize(result.titleImageSize ?? titleImageSize)
    setTitleImagePaddingTop(result.titleImagePaddingTop ?? titleImagePaddingTop)
    setTitleImagePaddingRight(result.titleImagePaddingRight ?? titleImagePaddingRight)
    setTitleImagePaddingBottom(result.titleImagePaddingBottom ?? titleImagePaddingBottom)
    setTitleImagePaddingLeft(result.titleImagePaddingLeft ?? titleImagePaddingLeft)
    setIsAutoSaving(false)
    return true
  }

  useEffect(() => {
    if (!isAdmin || loadState.kind !== 'ready') {
      return
    }

    if (activeId) {
      return
    }

    const nextFingerprint = serializeLinks(links)
    const titleImageUnchanged = (titleImageUrl ?? '') === lastSavedTitleImageUrl
    const styleUnchanged =
      titleImageSize === lastSavedTitleImageSize &&
      titleImagePaddingTop === lastSavedTitleImagePaddingTop &&
      titleImagePaddingRight === lastSavedTitleImagePaddingRight &&
      titleImagePaddingBottom === lastSavedTitleImagePaddingBottom &&
      titleImagePaddingLeft === lastSavedTitleImagePaddingLeft

    if (nextFingerprint === lastSavedFingerprint && titleImageUnchanged && styleUnchanged) {
      return
    }

    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        await persistLinks(links)
      })
    }, AUTO_SAVE_DELAY_MS)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [
    activeId,
    isAdmin,
    lastSavedFingerprint,
    lastSavedTitleImageUrl,
    lastSavedTitleImageSize,
    lastSavedTitleImagePaddingTop,
    lastSavedTitleImagePaddingRight,
    lastSavedTitleImagePaddingBottom,
    lastSavedTitleImagePaddingLeft,
    links,
    loadState.kind,
    startTransition,
    supabase,
    titleImageUrl,
    titleImageSize,
    titleImagePaddingTop,
    titleImagePaddingRight,
    titleImagePaddingBottom,
    titleImagePaddingLeft,
  ])

  useEffect(() => {
    if (!saveMessage) {
      return
    }

    const timeout = window.setTimeout(() => {
      setSaveMessage('')
    }, 1400)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [saveMessage])

  const showAdminEditor = isAdmin && editorVisible

  return (
    <main className="min-h-screen bg-background px-4 py-16 sm:px-6">
      <div className={`mx-auto w-full ${showAdminEditor ? 'max-w-6xl' : 'max-w-lg'} text-center`}>
        <div className={showAdminEditor ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10 lg:items-start' : ''}>
          <section className={`space-y-3 ${showAdminEditor ? 'lg:min-w-0' : ''}`}>
            <header className="border-b border-foreground/10 pb-2">
              <div className="flex flex-col items-center justify-center gap-1.5">
                {displayedTitleImageUrl ? (
                  <img
                    src={displayedTitleImageUrl}
                    alt="PLCreative"
                    className="h-auto w-auto max-w-full"
                    style={{
                      maxHeight: '4.5rem',
                      width: `${displayedTitleImageSize}%`,
                      paddingTop: `${displayedTitleImagePaddingTop}px`,
                      paddingRight: `${displayedTitleImagePaddingRight}px`,
                      paddingBottom: `${displayedTitleImagePaddingBottom}px`,
                      paddingLeft: `${displayedTitleImagePaddingLeft}px`,
                    }}
                  />
                ) : (
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground">PLCreative</p>
                )}
                {isAdmin ? (
                  <>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-foreground/45">
                      Live admin mode
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditorVisible((value) => !value)}
                      className="mt-1 border border-foreground/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] hover:bg-foreground/5"
                    >
                      {editorVisible ? 'Hide editor' : 'Show editor'}
                    </button>
                  </>
                ) : null}
              </div>
            </header>

            {isAdmin ? (
          <DndContext
            id="links-page-order"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(event) => setActiveId(String(event.active.id))}
            onDragOver={handlePageDragOver}
            onDragCancel={() => setActiveId(null)}
            onDragEnd={handlePageDragEnd}
          >
            <SortableContext items={publishedLinks.map((item) => item.clientId)} strategy={verticalListSortingStrategy}>
              <div className="border-t border-foreground/10">
                <div className="flex flex-wrap items-center justify-center gap-2 border-b border-foreground/10 py-2.5 text-center">
                  <button
                    type="button"
                    onClick={addBlankLink}
                    className="border border-foreground/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] hover:bg-foreground/5"
                  >
                    Add item
                  </button>
                  {QUICK_TEMPLATES.map((template, index) => (
                    <button
                      key={template.title}
                      type="button"
                      onClick={() => addTemplate(index)}
                      className="px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-foreground/50 hover:text-foreground"
                    >
                      {template.title}
                    </button>
                  ))}
                </div>
                <nav aria-label="External links" className="text-center">
                {publishedLinks.length > 0 ? (
                  publishedLinks.map((link) => (
                    <SortablePageItem
                      key={link.clientId}
                      link={link}
                      isLiveDragging={displayedActiveId === link.clientId}
                      isLiveEditing={displayedEditingId === link.clientId}
                      setItemRef={setItemRef}
                      onActivate={revealEditorFor}
                    />
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-foreground/20 px-4 py-10 text-center text-sm text-foreground/50">
                    No links published yet.
                  </p>
                )}
                </nav>
              </div>
            </SortableContext>

          </DndContext>
            ) : (
              <nav aria-label="External links" className="border-t border-foreground/10">
                {publishedLinks.length > 0 ? (
                  publishedLinks.map((link) => {
                    const isInternal = link.url.startsWith('/') || link.url.startsWith('#')

                    return (
                      <a
                        key={link.clientId}
                        href={link.url}
                        target={isInternal ? undefined : '_blank'}
                        rel={isInternal ? undefined : 'noopener noreferrer'}
                        className="group block transition hover:bg-foreground/[0.012]"
                      >
                        <PublicLinkRow
                          link={link}
                          setItemRef={setItemRef}
                          isLiveDragging={displayedActiveId === link.clientId}
                          isLiveEditing={displayedEditingId === link.clientId}
                        />
                      </a>
                    )
                  })
                ) : (
                  <p className="rounded-2xl border border-dashed border-foreground/20 px-4 py-10 text-center text-sm text-foreground/50">
                    No links published yet.
                  </p>
                )}
              </nav>
            )}
          </section>

          {showAdminEditor ? (
            <aside className="mt-6 border border-foreground/10 bg-background text-left shadow-xl lg:sticky lg:top-6 lg:mt-0">
              <div className="flex h-full flex-col">
                <div className="border-b border-foreground/10 px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground">Editor</p>
                  <h2 className="mt-2 text-lg font-medium">Live links</h2>
                  <p className="mt-2 text-sm leading-6 text-foreground/60">
                    Edit titles and secondary text here. Reorder the list directly on the page.
                  </p>
                </div>

                <div className="flex-1 space-y-5 px-5 py-4 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
                  <section className="space-y-3 border border-foreground/10 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-foreground/55">Title image</p>
                    <p className="text-sm text-foreground/60">
                      Upload an SVG to replace the heading at the top.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer border border-foreground/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] hover:bg-foreground/5">
                        <input
                          type="file"
                          accept="image/svg+xml,.svg"
                          className="hidden"
                          disabled={isUploadingTitleImage}
                          onChange={async (event) => {
                            const input = event.currentTarget
                            const file = event.target.files?.[0]
                            if (!file) {
                              return
                            }

                            await uploadTitleImage(file)
                            input.value = ''
                          }}
                        />
                        {isUploadingTitleImage ? 'Uploading…' : 'Upload SVG'}
                      </label>

                      {titleImageUrl ? (
                        <button
                          type="button"
                          onClick={() => setTitleImageUrl(null)}
                          className="border border-foreground/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] hover:bg-foreground/5"
                        >
                          Use text
                        </button>
                      ) : null}
                    </div>

                    <div className="space-y-3 pt-2">
                      <label className="grid gap-1 text-xs text-foreground/60">
                        <span>Size ({titleImageSize}%)</span>
                        <input
                          type="range"
                          min={40}
                          max={180}
                          step={1}
                          value={titleImageSize}
                          onChange={(event) => setTitleImageSize(Number(event.target.value))}
                        />
                      </label>

                      <label className="grid gap-1 text-xs text-foreground/60">
                        <span>Padding top ({titleImagePaddingTop}px)</span>
                        <input
                          type="range"
                          min={0}
                          max={80}
                          step={1}
                          value={titleImagePaddingTop}
                          onChange={(event) => setTitleImagePaddingTop(Number(event.target.value))}
                        />
                      </label>

                      <label className="grid gap-1 text-xs text-foreground/60">
                        <span>Padding right ({titleImagePaddingRight}px)</span>
                        <input
                          type="range"
                          min={0}
                          max={80}
                          step={1}
                          value={titleImagePaddingRight}
                          onChange={(event) => setTitleImagePaddingRight(Number(event.target.value))}
                        />
                      </label>

                      <label className="grid gap-1 text-xs text-foreground/60">
                        <span>Padding bottom ({titleImagePaddingBottom}px)</span>
                        <input
                          type="range"
                          min={0}
                          max={80}
                          step={1}
                          value={titleImagePaddingBottom}
                          onChange={(event) => setTitleImagePaddingBottom(Number(event.target.value))}
                        />
                      </label>

                      <label className="grid gap-1 text-xs text-foreground/60">
                        <span>Padding left ({titleImagePaddingLeft}px)</span>
                        <input
                          type="range"
                          min={0}
                          max={80}
                          step={1}
                          value={titleImagePaddingLeft}
                          onChange={(event) => setTitleImagePaddingLeft(Number(event.target.value))}
                        />
                      </label>
                    </div>
                  </section>

                  {loadState.kind === 'missing-table' ? (
                    <section className="space-y-2 border border-foreground/15 p-4">
                      <p className="text-sm">Links database is not set up yet.</p>
                      <p className="text-sm text-foreground/60">{loadState.message}</p>
                      <p className="text-xs text-foreground/55">Run: npx supabase db push</p>
                    </section>
                  ) : null}

                  {loadState.kind === 'error' ? (
                    <section className="space-y-2 border border-foreground/15 p-4">
                      <p className="text-sm">Could not load live links.</p>
                      <p className="text-sm text-foreground/60">{loadState.message}</p>
                      {loadState.code ? <p className="text-xs text-foreground/55">Code: {loadState.code}</p> : null}
                    </section>
                  ) : null}

                  {selectedDraft ? (
                    <EditorCard
                      link={selectedDraft}
                      index={selectedIndex === -1 ? 0 : selectedIndex}
                      onChange={updateLink}
                      onDelete={removeLink}
                      onDuplicate={duplicateLink}
                      onFocus={setEditingId}
                      onBlur={handleEditorBlur}
                      isLiveEditing={displayedEditingId === selectedDraft.clientId}
                      isLiveDragging={displayedActiveId === selectedDraft.clientId}
                    />
                  ) : (
                    <div className="border border-dashed border-foreground/20 px-4 py-10 text-center text-sm text-foreground/50">
                      Select a list item to edit it.
                    </div>
                  )}
                </div>

                <div className="border-t border-foreground/10 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <p className="text-foreground/60">
                      {isPending || isAutoSaving ? 'Syncing live...' : 'Autosave on'}
                    </p>
                    {saveMessage ? <p className="text-foreground/60">{saveMessage}</p> : null}
                    {saveError ? <p className="text-foreground">{saveError}</p> : null}
                  </div>
                </div>
              </div>
            </aside>
          ) : null}
        </div>
      </div>
      </main>
    )
  }