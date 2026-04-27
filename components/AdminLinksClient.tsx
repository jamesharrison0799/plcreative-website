'use client'

import { useState } from 'react'
import { createLinkAction, updateLinkAction, deleteLinkAction } from '@/app/admin/actions'

interface Link {
  id: string
  url: string
  title: string
  description: string | null
  order_index: number
}

export default function AdminLinksClient({ links: initialLinks }: { links: Link[] }) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ url: '', title: '', description: '' })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)

    if (editingId) {
      data.set('id', editingId)
      await updateLinkAction(data)
      setEditingId(null)
    } else {
      await createLinkAction(data)
    }

    setFormData({ url: '', title: '', description: '' })
    setIsAdding(false)
    // Refresh the page to see updated data
    window.location.reload()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this link?')) return
    const data = new FormData()
    data.set('id', id)
    await deleteLinkAction(data)
    // Refresh the page to see updated data
    window.location.reload()
  }

  const handleEdit = (link: Link) => {
    setFormData({ url: link.url, title: link.title, description: link.description || '' })
    setEditingId(link.id)
    setIsAdding(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-foreground/40">Links</p>
        <h1 className="mt-2 text-lg">Manage links</h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground/50">
          Add and manage links that appear on links.plcreative.love
        </p>
      </div>

      <div className="border border-foreground/10 p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-sm">Links ({initialLinks.length})</h2>
          <button
            onClick={() => {
              setIsAdding(!isAdding)
              setFormData({ url: '', title: '', description: '' })
              setEditingId(null)
            }}
            className="border border-foreground/10 px-3 py-2 text-sm hover:bg-foreground/5"
          >
            {isAdding ? 'Cancel' : 'Add link'}
          </button>
        </div>

        {isAdding && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 border border-foreground/10 space-y-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-foreground/40">Title</span>
              <input
                name="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., My Portfolio"
                className="border border-foreground/10 bg-background px-3 py-2 outline-none focus:border-foreground/30"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-foreground/40">URL</span>
              <input
                name="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com"
                className="border border-foreground/10 bg-background px-3 py-2 outline-none focus:border-foreground/30"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-foreground/40">Description (optional)</span>
              <input
                name="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
                className="border border-foreground/10 bg-background px-3 py-2 outline-none focus:border-foreground/30"
              />
            </label>
            <button
              type="submit"
              className="border border-foreground/10 px-4 py-2 text-sm hover:bg-foreground/5"
            >
              {editingId ? 'Update link' : 'Create link'}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {initialLinks.length === 0 ? (
            <p className="text-sm text-foreground/50 py-4">No links yet. Add one to get started.</p>
          ) : (
            initialLinks.map((link) => (
              <div key={link.id} className="border border-foreground/10 p-3 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium break-words">{link.title}</p>
                  <p className="text-xs text-foreground/50 break-all">{link.url}</p>
                  {link.description && <p className="text-xs text-foreground/60 mt-1">{link.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(link)}
                    className="border border-foreground/10 px-3 py-2 text-sm hover:bg-foreground/5"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="border border-foreground/10 px-3 py-2 text-sm hover:bg-foreground/5 text-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
