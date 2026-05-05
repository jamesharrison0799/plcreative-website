'use server'

import { headers } from 'next/headers'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

export type SubscribeState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

export const initialSubscribeState: SubscribeState = {
  status: 'idle',
  message: '',
}

export async function subscribeNewsletterAction(
  _prevState: SubscribeState,
  formData: FormData
): Promise<SubscribeState> {
  const honey = String(formData.get('company') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const ALLOWED_SOURCES = new Set(['website', 'footer', 'popup', 'landing'])
  const rawSource = String(formData.get('source') ?? '').trim()
  const source = ALLOWED_SOURCES.has(rawSource) ? rawSource : 'website'

  if (honey) {
    return { status: 'success', message: 'Thanks, you are on the mailing list.' }
  }

  if (!email) {
    return { status: 'error', message: 'Email is required.' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { status: 'error', message: 'Please enter a valid email address.' }
  }

  const supabase = await createClient()

  const headerStore = await headers()
  const forwardedFor = headerStore.get('x-forwarded-for') ?? ''
  const ip = forwardedFor.split(',')[0]?.trim() || 'unknown'
  const rateLimitKey = `newsletter:${ip}`

  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: rateLimitKey,
    p_limit: 5,
    p_window_seconds: 10 * 60,
  })

  if (!rateLimitError && allowed === false) {
    return {
      status: 'error',
      message: 'Too many attempts. Please wait a few minutes and try again.',
    }
  }

  const { error: dbError } = await supabase
    .from('mailing_list_subscribers')
    .upsert(
      {
        email,
        source,
        status: 'subscribed',
        subscribed_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    )

  if (dbError) {
    return {
      status: 'error',
      message: 'Could not subscribe right now. Please try again shortly.',
    }
  }

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const resend = new Resend(resendKey)
    const from = process.env.RESEND_FROM_EMAIL ?? 'PLCreative <onboarding@resend.dev>'
    const audienceId = process.env.RESEND_AUDIENCE_ID

    try {
      if (audienceId) {
        await resend.contacts.create({
          audienceId,
          email,
          unsubscribed: false,
        })
      }

      await resend.emails.send({
        from,
        to: [email],
        subject: 'You are subscribed',
        html: '<p>Thanks for subscribing to our mailing list.</p>',
      })
    } catch {
      // Keep subscription successful even if the outbound email provider is temporarily unavailable.
    }
  }

  return {
    status: 'success',
    message: 'Thanks, you are on the mailing list.',
  }
}
