'use client'

import { useActionState } from 'react'
import {
  initialSubscribeState,
  subscribeNewsletterAction,
} from '@/app/actions/newsletter'

export default function NewsletterSignupForm({
  buttonLabel = 'Subscribe',
  source = 'website',
}: {
  buttonLabel?: string
  source?: string
}) {
  const [state, formAction, pending] = useActionState(
    subscribeNewsletterAction,
    initialSubscribeState
  )

  return (
    <form action={formAction} className="mx-auto grid max-w-md grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
      <input type="hidden" name="source" value={source} />
      <input
        type="email"
        name="email"
        required
        placeholder="you@example.com"
        autoComplete="email"
        className="border border-foreground/20 bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
      />
      <button
        type="submit"
        disabled={pending}
        className="border border-foreground/25 px-4 py-2 text-sm hover:bg-foreground/5 disabled:opacity-50"
      >
        {pending ? 'Submitting…' : buttonLabel}
      </button>

      {state.status !== 'idle' ? (
        <p
          className={`sm:col-span-2 text-xs ${
            state.status === 'success' ? 'text-green-600' : 'text-red-500'
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
