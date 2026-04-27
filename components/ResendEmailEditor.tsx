'use client'

import { useActionState } from 'react'
import {
  type ResendCampaignState,
  sendResendCampaignAction,
} from '@/app/admin/actions'

const initialResendCampaignState: ResendCampaignState = {
  status: 'idle',
  message: '',
}

export default function ResendEmailEditor({
  subscriberCount,
}: {
  subscriberCount: number
}) {
  const [state, formAction, pending] = useActionState(
    sendResendCampaignAction,
    initialResendCampaignState
  )

  return (
    <section className="border border-foreground/10 p-5">
      <h2 className="text-sm">Resend email editor</h2>
      <p className="mt-1 text-xs text-foreground/50">
        Audience: {subscriberCount} subscribed recipient{subscriberCount === 1 ? '' : 's'}.
      </p>

      <form action={formAction} className="mt-4 space-y-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-foreground/40">Subject</span>
          <input
            name="subject"
            placeholder="April update from PLCreative"
            required
            className="border border-foreground/10 bg-background px-3 py-2 outline-none focus:border-foreground/30"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-foreground/40">Body</span>
          <textarea
            name="body"
            rows={8}
            placeholder="Write your email content here."
            className="border border-foreground/10 bg-background px-3 py-2 outline-none focus:border-foreground/30 resize-y"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-foreground/40">HTML (optional)</span>
          <textarea
            name="html"
            rows={8}
            placeholder="<h1>Campaign headline</h1><p>Your HTML email content.</p>"
            className="font-mono border border-foreground/10 bg-background px-3 py-2 outline-none focus:border-foreground/30 resize-y text-xs"
          />
          <span className="text-[11px] text-foreground/40">
            If provided, HTML is sent as the rendered email body.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-foreground/40">Test email (optional)</span>
          <input
            name="test_email"
            type="email"
            placeholder="you@example.com"
            className="border border-foreground/10 bg-background px-3 py-2 outline-none focus:border-foreground/30"
          />
          <span className="text-[11px] text-foreground/40">
            If provided, only a test email is sent.
          </span>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="border border-foreground/10 px-4 py-2 text-sm hover:bg-foreground/5 disabled:opacity-50"
        >
          {pending ? 'Sending…' : 'Send email'}
        </button>
      </form>

      {state.status !== 'idle' ? (
        <p className={`mt-3 text-xs ${state.status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
          {state.message}
        </p>
      ) : null}
    </section>
  )
}
