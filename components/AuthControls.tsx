import Link from 'next/link'
import { headers } from 'next/headers'
import { logoutAction } from '@/app/actions/auth'
import { getAuthUrl } from '@/lib/auth-url.server'
import { buildRootDomainUrl, buildSubdomainUrl } from '@/lib/subdomains'
import { createClient } from '@/lib/supabase/server'

async function getRequestContext() {
  const headerStore = await headers()

  return {
    host: headerStore.get('x-forwarded-host') || headerStore.get('host') || '',
    protocol: headerStore.get('x-forwarded-proto') || 'https',
  }
}

export default async function AuthControls() {
  const [{ host, protocol }, supabase] = await Promise.all([
    getRequestContext(),
    createClient(),
  ])

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const navLinks = [
    { label: 'Home', href: buildRootDomainUrl({ host, protocol, pathname: '/' }) },
    { label: 'Bus', href: buildSubdomainUrl({ host, protocol, subdomain: 'bus' }) },
    { label: 'Bin', href: buildSubdomainUrl({ host, protocol, subdomain: 'bin' }) },
    { label: 'Admin', href: buildRootDomainUrl({ host, protocol, pathname: '/admin' }) },
  ]

  if (user) {
    return (
      <div className="border-b border-foreground/10 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4 px-4 py-3 text-xs sm:px-6">
          <div className="flex items-center gap-4 min-w-0">
            <p className="text-foreground/70 shrink-0">
              <span className="font-medium text-foreground">{user.email ?? 'authenticated user'}</span>
            </p>
            <nav className="flex items-center gap-3">
              {navLinks.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="text-foreground/60 transition-colors hover:text-foreground"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="shrink-0 text-foreground/60 transition-colors hover:text-foreground"
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-end px-4 py-4 sm:px-6">
      <Link href={await getAuthUrl()} className="text-xs text-gray-500 transition-colors hover:text-gray-800">
        Login
      </Link>
    </div>
  )
}
