import { requireAdmin } from '@/lib/admin'
import { deleteMediaAction } from '@/app/admin/actions'
import MediaUploader from '@/components/MediaUploader'
import CopyButton from '@/components/CopyButton'

interface StorageFile {
  name: string
  id: string
  updated_at: string
  metadata?: { size?: number; mimetype?: string }
}

const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|svg|avif)$/i

export default async function AdminMediaPage() {
  const { supabase } = await requireAdmin()

  const { data: files, error } = await supabase.storage.from('media').list('', {
    limit: 200,
    sortBy: { column: 'updated_at', order: 'desc' },
  })

  const mediaFiles = (files ?? []) as StorageFile[]

  const getUrl = (name: string) => {
    const { data } = supabase.storage.from('media').getPublicUrl(name)
    return data.publicUrl
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-foreground/40">Admin</p>
        <h1 className="mt-2 text-lg">Media library</h1>
        {error && (
          <p className="mt-2 text-sm text-red-500">
            {error.message}. Make sure a public &quot;media&quot; bucket exists in Supabase Storage.
          </p>
        )}
      </div>

      <MediaUploader />

      {mediaFiles.length === 0 && !error && (
        <p className="text-sm text-foreground/40">No files yet.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {mediaFiles.map((file) => {
          const url = getUrl(file.name)
          const isImage = IMAGE_EXTS.test(file.name)

          return (
            <div key={file.id ?? file.name} className="border border-foreground/10">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt={file.name}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-foreground/5">
                  <p className="text-xs text-foreground/40 px-2 text-center break-all">{file.name}</p>
                </div>
              )}

              <div className="border-t border-foreground/10 p-2 flex items-center justify-between gap-2">
                <p className="truncate text-xs text-foreground/50 min-w-0">{file.name}</p>
                <div className="flex gap-1 shrink-0">
                  <CopyButton url={url} />
                  <form action={deleteMediaAction}>
                    <input type="hidden" name="path" value={file.name} />
                    <button
                      type="submit"
                      className="border border-red-500/20 px-2 py-1 text-xs text-red-500/60 hover:bg-red-500/5"
                    >
                      Del
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
