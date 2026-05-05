import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import LoginForm from '@/components/LoginForm'
import { buildRootDomainUrl, getRootDomainForHost } from '@/lib/subdomains'
import { createClient } from '@/lib/supabase/server'

function getSafeRedirectTo(host: string, protocol: string, redirectTo?: string | string[]) {
  const defaultRedirect = buildRootDomainUrl({
    host,
    protocol,
    pathname: '/admin',
  })

  const candidate = Array.isArray(redirectTo) ? redirectTo[0] : redirectTo

  if (!candidate) {
    return defaultRedirect
  }

  try {
    const targetUrl = new URL(candidate, `${protocol.replace(/:$/, '')}://${host}`)
    const currentRootDomain = getRootDomainForHost(host)
    const targetRootDomain = getRootDomainForHost(targetUrl.host)

    if (currentRootDomain && currentRootDomain === targetRootDomain) {
      return targetUrl.toString()
    }
  } catch {
    return defaultRedirect
  }

  return defaultRedirect
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string | string[] }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || ''
  const protocol = headerStore.get('x-forwarded-proto') || 'https'
  const resolvedSearchParams = await searchParams
  const redirectTo = getSafeRedirectTo(host, protocol, resolvedSearchParams.redirectTo)

  if (user) {
    redirect(redirectTo)
  }

  return <LoginForm redirectTo={redirectTo} />
}


