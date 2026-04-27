import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { profile } = await requireAdmin()

  return (
    <main className="min-h-screen bg-background pt-16 text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row">
        <aside className="w-full border-b border-foreground/10 p-6 md:w-72 md:border-b-0 md:border-r">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-foreground/40">PLCreative</p>
            <p className="text-sm">Admin</p>
            <p className="text-xs text-foreground/50">
              {profile.display_name || profile.username || 'Administrator'}
            </p>
          </div>

          <nav className="mt-8 flex flex-col gap-2 text-sm">
            <Link href="/admin" className="border border-foreground/10 px-3 py-2 hover:bg-foreground/5">
              Dashboard
            </Link>
            <Link href="/admin/pages/home" className="border border-foreground/10 px-3 py-2 hover:bg-foreground/5">
              Edit Home Page
            </Link>
            <Link href="/admin/users" className="border border-foreground/10 px-3 py-2 hover:bg-foreground/5">
              Users
            </Link>
            <Link href="/admin/media" className="border border-foreground/10 px-3 py-2 hover:bg-foreground/5">
              Media
            </Link>
            <Link href="/admin/resend" className="border border-foreground/10 px-3 py-2 hover:bg-foreground/5">
              Resend
            </Link>
          </nav>
        </aside>

        <section className="min-w-0 flex-1 p-6 md:p-10">{children}</section>
      </div>
    </main>
  )
}
