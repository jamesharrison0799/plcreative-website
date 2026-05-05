import { buildSubdomainUrl, supportsSubdomains } from '@/lib/subdomains'

function addRedirectTo(url: string, redirectTo?: string) {
  if (!redirectTo) {
    return url
  }

  const nextUrl = new URL(url)
  nextUrl.searchParams.set('redirectTo', redirectTo)
  return nextUrl.toString()
}

export function getClientAuthUrl(pathname = '/', redirectTo?: string) {
  const host = window.location.host
  const protocol = window.location.protocol

  const base = supportsSubdomains(host)
    ? buildSubdomainUrl({ host, protocol, subdomain: 'auth', pathname })
    : `${protocol}//${host}/login`

  return addRedirectTo(base, redirectTo)
}
