const IPV4_ADDRESS_REGEX = /^\d{1,3}(?:\.\d{1,3}){3}$/

function splitHost(host: string) {
  const [hostname = '', port = ''] = host.trim().toLowerCase().split(':')

  return {
    hostname,
    port,
  }
}

function getRootDomain(hostname: string) {
  if (!hostname || hostname === 'localhost' || IPV4_ADDRESS_REGEX.test(hostname)) {
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
