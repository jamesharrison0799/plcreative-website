import Link from 'next/link'
import ResendEmailEditor from '@/components/ResendEmailEditor'
import { requireAdmin } from '@/lib/admin'

export default async function AdminResendPage() {
  const { supabase } = await requireAdmin()

  const [{ count: subscriberCount }, { data: recentSubscribers }] = await Promise.all([
    supabase
      .from('mailing_list_subscribers')
      .select('id', { head: true, count: 'exact' })
      .eq('status', 'subscribed'),
    supabase
      .from('mailing_list_subscribers')
      .select('email, source, subscribed_at')
      .eq('status', 'subscribed')
      .order('subscribed_at', { ascending: false })
      .limit(8),
  ])

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-foreground/40">Email</p>
        <h1 className="mt-2 text-lg">Resend editor</h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground/50">
          Compose and send campaigns to your mailing list. For advanced no-code editing, use Resend dashboard templates and broadcasts.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link href="https://resend.com/templates" target="_blank" className="border border-foreground/10 px-2 py-1 hover:bg-foreground/5">
            Open Resend templates ↗
          </Link>
          <Link href="https://resend.com/broadcasts" target="_blank" className="border border-foreground/10 px-2 py-1 hover:bg-foreground/5">
            Open Resend broadcasts ↗
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="border border-foreground/10 p-4">
          <p className="text-xs text-foreground/40">Subscribed contacts</p>
          <p className="mt-2 text-lg">{subscriberCount ?? 0}</p>
        </div>
        <div className="border border-foreground/10 p-4 md:col-span-2">
          <p className="text-xs text-foreground/40">Recent subscribers</p>
          <div className="mt-2 space-y-1 text-xs text-foreground/70">
            {(recentSubscribers ?? []).length === 0 ? (
              <p className="text-foreground/40">No subscribers yet.</p>
            ) : (
              (recentSubscribers ?? []).map((row) => (
                <p key={`${row.email}-${row.subscribed_at}`}>
                  {row.email} <span className="text-foreground/40">· {row.source || 'website'}</span>
                </p>
              ))
            )}
          </div>
        </div>
      </section>

      <ResendEmailEditor subscriberCount={subscriberCount ?? 0} />
    </div>
  )
}