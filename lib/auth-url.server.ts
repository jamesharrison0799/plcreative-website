import { headers } from 'next/headers'
import { buildSubdomainUrl, supportsSubdomains } from '@/lib/subdomains'

function addRedirectTo(url: string, redirectTo?: string) {
  if (!redirectTo) {
    return url
  }

  const nextUrl = new URL(url)
  nextUrl.searchParams.set('redirectTo', redirectTo)
  return nextUrl.toString()
}

export async function getAuthUrl(pathname = '/', redirectTo?: string) {
  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || ''
  const protocol = headerStore.get('x-forwarded-proto') || 'https'

  const baseUrl = supportsSubdomains(host)
    ? buildSubdomainUrl({
        host,
        protocol,
        subdomain: 'auth',
        pathname,
      })
    : `${protocol.replace(/:$/, '')}://${host}/login`

  return addRedirectTo(baseUrl, redirectTo)
}