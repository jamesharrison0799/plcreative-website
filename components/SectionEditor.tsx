'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import type { DraggableAttributes } from '@dnd-kit/core'
import { updateSectionAction, deleteSectionAction } from '@/app/admin/actions'
import type { CmsSectionRecord } from '@/lib/cms'
import { getTextValue } from '@/lib/cms'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), {
  ssr: false,
  loading: () => <div className="h-32 border border-foreground/10 bg-foreground/5 animate-pulse" />,
})

interface Props {
  section: CmsSectionRecord
  slug: string
  pageId: string
  dragHandleListeners?: SyntheticListenerMap
  dragHandleAttributes?: DraggableAttributes
  isDragging?: boolean
}

export default function SectionEditor({
  section,
  slug,
  dragHandleListeners,
  dragHandleAttributes,
  isDragging,
}: Props) {
  const [body, setBody] = useState(getTextValue(section.data, 'body'))
  const [expanded, setExpanded] = useState(true)
  const [itemsJson, setItemsJson] = useState(() => {
    const items = section.data?.items
    return Array.isArray(items) ? JSON.stringify(items, null, 2) : '[]'
  })

  const isComplexType = section.type === 'faq' || section.type === 'testimonials'

  return (
    <div
      className={`border border-foreground/10 bg-background transition-shadow ${
        isDragging ? 'shadow-2xl opacity-80 ring-1 ring-foreground/20' : ''
      }`}
    >
      {/* Header / drag handle */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-foreground/10">
        {/* Drag grip */}
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-foreground/30 hover:text-foreground/60 shrink-0 touch-none"
          {...dragHandleListeners}
          {...dragHandleAttributes}
          aria-label="Drag to reorder"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="3" y="3" width="2" height="2" />
            <rect x="7" y="3" width="2" height="2" />
            <rect x="11" y="3" width="2" height="2" />
            <rect x="3" y="7" width="2" height="2" />
            <rect x="7" y="7" width="2" height="2" />
            <rect x="11" y="7" width="2" height="2" />
            <rect x="3" y="11" width="2" height="2" />
            <rect x="7" y="11" width="2" height="2" />
            <rect x="11" y="11" width="2" height="2" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm capitalize font-medium truncate">{section.type}</p>
          {!expanded && (
            <p className="text-xs text-foreground/40 truncate">
              {getTextValue(section.data, 'heading') || '—'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Collapse toggle */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="border border-foreground/10 px-2 py-1 text-xs hover:bg-foreground/5"
          >
            {expanded ? '▲' : '▼'}
          </button>

          {/* Delete */}
          <form action={deleteSectionAction} className="inline">
            <input type="hidden" name="section_id" value={section.id} />
            <input type="hidden" name="slug" value={slug} />
            <button
              type="submit"
              className="border border-red-500/30 px-2 py-1 text-xs text-red-500/70 hover:bg-red-500/5"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      {/* Edit form (collapsible) */}
      {expanded && (
        <form action={updateSectionAction} className="space-y-4 p-4">
          <input type="hidden" name="section_id" value={section.id} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="section_type" value={section.type} />
          {!isComplexType && <input type="hidden" name="body" value={body} />}
          {isComplexType && <input type="hidden" name="items_json" value={itemsJson} />}

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-foreground/40">Heading</span>
            <input
              name="heading"
              defaultValue={getTextValue(section.data, 'heading')}
              className="border border-foreground/10 bg-background px-3 py-2 outline-none focus:border-foreground/30"
            />
          </label>

          {(section.type === 'hero' || section.type === 'text') && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-foreground/40">Body (Markdown)</span>
              <div data-color-mode="auto">
                <MDEditor value={body} onChange={(v) => setBody(v ?? '')} preview="edit" height={200} />
              </div>
            </label>
          )}

          {section.type === 'cta' && (
            <>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-foreground/40">Body</span>
                <div data-color-mode="auto">
                  <MDEditor value={body} onChange={(v) => setBody(v ?? '')} preview="edit" height={120} />
                </div>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-foreground/40">Button text</span>
                  <input
                    name="button_text"
                    defaultValue={getTextValue(section.data, 'button_text')}
                    className="border border-foreground/10 bg-background px-3 py-2 outline-none focus:border-foreground/30"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-foreground/40">Button URL</span>
                  <input
                    name="button_url"
                    defaultValue={getTextValue(section.data, 'button_url')}
                    className="border border-foreground/10 bg-background px-3 py-2 outline-none focus:border-foreground/30"
                  />
                </label>
              </div>
            </>
          )}

          {section.type === 'image' && (
            <>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-foreground/40">Image URL</span>
                <input
                  name="image_url"
                  defaultValue={getTextValue(section.data, 'image_url')}
                  className="border border-foreground/10 bg-background px-3 py-2 outline-none focus:border-foreground/30"
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-foreground/40">Alt text</span>
                  <input
                    name="alt"
                    defaultValue={getTextValue(section.data, 'alt')}
                    className="border border-foreground/10 bg-background px-3 py-2 outline-none focus:border-foreground/30"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-foreground/40">Caption</span>
                  <input
                    name="caption"
                    defaultValue={getTextValue(section.data, 'caption')}
                    className="border border-foreground/10 bg-background px-3 py-2 outline-none focus:border-foreground/30"
                  />
                </label>
              </div>
            </>
          )}

          {isComplexType && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-foreground/40">Items (JSON)</span>
              <textarea
                value={itemsJson}
                onChange={(e) => setItemsJson(e.target.value)}
                rows={8}
                className="border border-foreground/10 bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground/30 resize-y"
              />
            </label>
          )}

          <button
            type="submit"
            className="border border-foreground/10 px-4 py-2 text-sm hover:bg-foreground/5"
          >
            Save section
          </button>
        </form>
      )}
    </div>
  )
}
