import Link from 'next/link'
import { createPageAction, updateSiteSettingsAction } from '@/app/admin/actions'
import { requireAdmin } from '@/lib/admin'
import { getPagesIndex, getSiteSettings } from '@/lib/cms'

export default async function AdminPage() {
  const { supabase } = await requireAdmin()
  const [pages, siteSettings, subscribersCountRes] = await Promise.all([
    getPagesIndex(supabase),
    getSiteSettings(supabase),
    supabase
      .from('mailing_list_subscribers')
      .select('id', { head: true, count: 'exact' })
      .eq('status', 'subscribed'),
  ])
  const subscribersCount = subscribersCountRes.count ?? 0

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-foreground/40">Dashboard</p>
        <h1 className="mt-2 text-lg">CMS / site builder</h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground/50">
          Manage published pages, edit section content, and control site-wide settings.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="border border-foreground/10 p-4">
          <p className="text-xs text-foreground/40">Pages</p>
          <p className="mt-2 text-lg">{pages.length}</p>
        </div>
        <div className="border border-foreground/10 p-4">
          <p className="text-xs text-foreground/40">Published</p>
          <p className="mt-2 text-lg">{pages.filter((page) => page.status === 'published').length}</p>
        </div>
        <div className="border border-foreground/10 p-4">
          <p className="text-xs text-foreground/40">Mailing list</p>
          <p className="mt-2 text-lg">{subscribersCount}</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4 border border-foreground/10 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm">Pages</h2>
            <Link
              href="/admin/pages/home"
              className="border border-foreground/10 px-3 py-2 text-sm hover:bg-foreground/5"
            >
              Edit home
            </Link>
          </div>

          <div className="space-y-3">
            {pages.map((page) => (
              <div key={page.id} className="flex items-center justify-between gap-4 border border-foreground/10 p-3">
                <div>
                  <p className="text-sm">{page.title}</p>
                  <p className="text-xs text-foreground/50">
                    /{page.slug === 'home' ? '' : page.slug} · {page.status}
                  </p>
                </div>
                <Link
                  href={`/admin/pages/${page.slug}`}
                  className="border border-foreground/10 px-3 py-2 text-sm hover:bg-foreground/5"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section className="border border-foreground/10 p-5">
            <h2 className="text-sm">Links</h2>
            <p className="mt-2 text-xs text-foreground/50">Manage and view your links page</p>
            <div className="mt-3 flex gap-2">
              <Link
                href="/links"
                className="flex-1 border border-foreground/10 px-4 py-2 text-sm text-center hover:bg-foreground/5"
              >
                Manage
              </Link>
              <Link
                href="/links"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 border border-foreground/10 px-4 py-2 text-sm text-center hover:bg-foreground/5"
              >
                View
              </Link>
            </div>
          </section>

          <section className="border border-foreground/10 p-5">
            <h2 className="text-sm">Create page</h2>
            <form action={createPageAction} className="mt-4 space-y-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-foreground/40">Title</span>
                <input
                  name="title"
                  placeholder="About"
                  className="border border-foreground/10 bg-background px-3 py-2 outline-none focus:border-foreground/30"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-foreground/40">Slug</span>
                <input
                  name="slug"
                  placeholder="about"
                  className="border border-foreground/10 bg-background px-3 py-2 outline-none focus:border-foreground/30"
                />
              </label>
              <button
                type="submit"
                className="border border-foreground/10 px-4 py-2 text-sm hover:bg-foreground/5"
              >
                Create page
              </button>
            </form>
          </section>

          <section className="border border-foreground/10 p-5">
            <h2 className="text-sm">Site settings</h2>
            <form action={updateSiteSettingsAction} className="mt-4 space-y-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-foreground/40">Site name</span>
                <input
                  name="site_name"
                  defaultValue={siteSettings?.site_name ?? 'PLCreative'}
                  className="border border-foreground/10 bg-background px-3 py-2 outline-none focus:border-foreground/30"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-foreground/40">Site description</span>
                <textarea
                  name="site_description"
                  defaultValue={siteSettings?.site_description ?? 'PLCreative'}
                  rows={3}
                  className="border border-foreground/10 bg-background px-3 py-2 outline-none focus:border-foreground/30 resize-none"
                />
              </label>
              <button
                type="submit"
                className="border border-foreground/10 px-4 py-2 text-sm hover:bg-foreground/5"
              >
                Save settings
              </button>
            </form>
          </section>

        </div>
      </section>
    </div>
  )
}
