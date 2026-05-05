import { getRootDomainForHost } from '@/lib/subdomains'

function isIpv4Address(value: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)
}

export function getSupabaseCookieOptions(host: string, protocol: string) {
  const rootDomain = getRootDomainForHost(host)
  const normalizedProtocol = protocol.replace(/:$/, '')

  return {
    domain:
      rootDomain && rootDomain !== 'localhost' && !isIpv4Address(rootDomain)
        ? rootDomain
        : undefined,
    path: '/',
    sameSite: 'lax' as const,
    secure: normalizedProtocol === 'https',
  }
}