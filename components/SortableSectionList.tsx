'use client'

import { useState, useCallback, useTransition } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
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
import SectionEditor from '@/components/SectionEditor'
import type { CmsSectionRecord } from '@/lib/cms'
import { reorderSectionsAction, addTextSectionAction } from '@/app/admin/actions'

// ── Sortable wrapper for each section ──────────────────────────────────────
function SortableSection({
  section,
  slug,
  pageId,
  activeId,
}: {
  section: CmsSectionRecord
  slug: string
  pageId: string
  activeId: string | null
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? ('relative' as const) : undefined,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <SectionEditor
        section={section}
        slug={slug}
        pageId={pageId}
        dragHandleListeners={listeners}
        dragHandleAttributes={attributes as import('@dnd-kit/core').DraggableAttributes}
        isDragging={isDragging || activeId === section.id}
      />
    </div>
  )
}

// ── Main sortable list ──────────────────────────────────────────────────────
interface Props {
  initialSections: CmsSectionRecord[]
  slug: string
  pageId: string
}

const SECTION_TYPES = ['text', 'hero', 'cta', 'image', 'faq', 'testimonials'] as const

export default function SortableSectionList({ initialSections, slug, pageId }: Props) {
  const [sections, setSections] = useState(initialSections)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [addType, setAddType] = useState<string>('text')
  const [isPending, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)

      if (!over || active.id === over.id) return

      setSections((current) => {
        const oldIndex = current.findIndex((s) => s.id === active.id)
        const newIndex = current.findIndex((s) => s.id === over.id)
        const reordered = arrayMove(current, oldIndex, newIndex)

        // Persist to server
        startTransition(async () => {
          const formData = new FormData()
          formData.set('slug', slug)
          formData.set('ordered_ids', reordered.map((s) => s.id).join(','))
          await reorderSectionsAction(formData)
        })

        return reordered
      })
    },
    [slug]
  )

  const activeSection = activeId ? sections.find((s) => s.id === activeId) : null

  const handleAddSection = useCallback(() => {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('page_id', pageId)
      formData.set('slug', slug)
      formData.set('type', addType)
      await addTextSectionAction(formData)
    })
  }, [pageId, slug, addType])

  return (
    <section className="space-y-4 border border-foreground/10 p-5">
      {/* Add section bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm">Sections</h2>
        <div className="flex items-center gap-2">
          <select
            value={addType}
            onChange={(e) => setAddType(e.target.value)}
            className="border border-foreground/10 bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30"
          >
            {SECTION_TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddSection}
            disabled={isPending}
            className="border border-foreground/10 px-3 py-2 text-sm hover:bg-foreground/5 disabled:opacity-40"
          >
            {isPending ? '…' : '+ Add section'}
          </button>
        </div>
      </div>

      {/* Drag indicator */}
      {sections.length > 1 && (
        <p className="text-xs text-foreground/30">
          {isPending ? 'Saving order…' : 'Drag sections to reorder'}
        </p>
      )}

      {sections.length === 0 && (
        <p className="text-sm text-foreground/40">No sections yet. Add one above.</p>
      )}

      {/* Sortable list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {sections.map((section) => (
              <SortableSection
                key={section.id}
                section={section}
                slug={slug}
                pageId={pageId}
                activeId={activeId}
              />
            ))}
          </div>
        </SortableContext>

        {/* Ghost overlay while dragging */}
        <DragOverlay dropAnimation={null}>
          {activeSection ? (
            <div className="opacity-90 shadow-2xl ring-1 ring-foreground/20">
              <SectionEditor
                section={activeSection}
                slug={slug}
                pageId={pageId}
                isDragging
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  )
}
