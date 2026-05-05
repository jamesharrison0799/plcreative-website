import { headers } from 'next/headers'
import { buildSubdomainUrl } from '@/lib/subdomains'

export async function getAuthUrl(pathname = '/') {
  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || ''
  const protocol = headerStore.get('x-forwarded-proto') || 'https'

  return buildSubdomainUrl({
    host,
    protocol,
    subdomain: 'auth',
    pathname,
  })
}

export function getClientAuthUrl(pathname = '/') {
  return buildSubdomainUrl({
    host: window.location.host,
    protocol: window.location.protocol,
    subdomain: 'auth',
    pathname,
  })
}
