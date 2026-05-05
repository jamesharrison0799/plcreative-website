const IPV4_ADDRESS_REGEX = /^\d{1,3}(?:\.\d{1,3}){3}$/
const DEFAULT_DEV_ROOT_DOMAIN = 'lvh.me'

function getDevelopmentRootDomain() {
  const configured = process.env.NEXT_PUBLIC_DEV_ROOT_DOMAIN?.trim().toLowerCase()

  if (configured) {
    return configured
  }

  return process.env.NODE_ENV === 'development' ? DEFAULT_DEV_ROOT_DOMAIN : ''
}

function isLocalDevelopmentHostname(hostname: string) {
  return hostname === 'localhost' || hostname.endsWith('.localhost')
}

function splitHost(host: string) {
  const [hostname = '', port = ''] = host.trim().toLowerCase().split(':')

  return {
    hostname,
    port,
  }
}

function getRootDomain(hostname: string) {
  const developmentRootDomain = getDevelopmentRootDomain()

  if (!hostname) {
    return hostname
  }

  if (isLocalDevelopmentHostname(hostname) && developmentRootDomain) {
    return developmentRootDomain
  }

  if (hostname === 'localhost' || IPV4_ADDRESS_REGEX.test(hostname)) {
    return hostname
  }

  if (hostname.endsWith('.localhost')) {
    return 'localhost'
  }

  const parts = hostname.split('.').filter(Boolean)

  if (parts.length <= 2) {
    return parts.join('.')
  }

  return parts.slice(-2).join('.')
}

export function getRootDomainForHost(host: string) {
  const { hostname } = splitHost(host)
  return getRootDomain(hostname)
}

export function getSubdomain(host: string) {
  const { hostname } = splitHost(host)

  if (!hostname || hostname === 'localhost' || IPV4_ADDRESS_REGEX.test(hostname)) {
    return null
  }

  if (hostname.endsWith('.localhost')) {
    const parts = hostname.split('.')
    return parts.length > 1 ? parts[0] : null
  }

  const parts = hostname.split('.').filter(Boolean)
  return parts.length > 2 ? parts[0] : null
}

export function supportsSubdomains(host: string) {
  const rootDomain = getRootDomainForHost(host)

  return Boolean(rootDomain && rootDomain !== 'localhost' && !IPV4_ADDRESS_REGEX.test(rootDomain))
}

export function getPreferredDevelopmentHost(host: string) {
  const developmentRootDomain = getDevelopmentRootDomain()
  const { hostname, port } = splitHost(host)

  if (!developmentRootDomain || !isLocalDevelopmentHostname(hostname)) {
    return null
  }

  const subdomain = getSubdomain(host)
  const preferredHostname = subdomain
    ? `${subdomain}.${developmentRootDomain}`
    : developmentRootDomain

  return `${preferredHostname}${port ? `:${port}` : ''}`
}

export function buildSubdomainUrl({
  host,
  protocol,
  subdomain,
  pathname = '/',
}: {
  host: string
  protocol: string
  subdomain: string
  pathname?: string
}) {
  const { hostname, port } = splitHost(host)
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  const normalizedProtocol = protocol.replace(/:$/, '') || 'https'
  const rootDomain = getRootDomain(hostname)

  if (!rootDomain) {
    return normalizedPath
  }

  const targetHost =
    rootDomain === 'localhost'
      ? `${subdomain}.localhost${port ? `:${port}` : ''}`
      : `${subdomain}.${rootDomain}${port ? `:${port}` : ''}`

  return `${normalizedProtocol}://${targetHost}${normalizedPath}`
}

export function buildRootDomainUrl({
  host,
  protocol,
  pathname = '/',
}: {
  host: string
  protocol: string
  pathname?: string
}) {
  const { hostname, port } = splitHost(host)
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  const normalizedProtocol = protocol.replace(/:$/, '') || 'https'
  const rootDomain = getRootDomain(hostname)

  if (!rootDomain) {
    return normalizedPath
  }

  const targetHost = `${rootDomain}${port ? `:${port}` : ''}`
  return `${normalizedProtocol}://${targetHost}${normalizedPath}`
}
