import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { getSupabaseCookieOptions } from '@/lib/supabase/cookie-options'

export async function createClient() {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || ''
  const protocol = headerStore.get('x-forwarded-proto') || 'https'

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getSupabaseCookieOptions(host, protocol),
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cookies can't be set here, handled by middleware
          }
        },
      },
    }
  )
}
