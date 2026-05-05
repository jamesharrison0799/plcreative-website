'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getClientAuthUrl } from '@/lib/auth-url'
import { buildRootDomainUrl, buildSubdomainUrl } from '@/lib/subdomains'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'

export default function AuthControls({ host, protocol }: { host: string; protocol: string }) {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const navLinks = [
    { label: 'Home', href: buildRootDomainUrl({ host, protocol, pathname: '/' }) },
    { label: 'Bus', href: buildSubdomainUrl({ host, protocol, subdomain: 'bus' }) },
    { label: 'Bin', href: buildSubdomainUrl({ host, protocol, subdomain: 'bin' }) },
    { label: 'Admin', href: buildRootDomainUrl({ host, protocol, pathname: '/admin' }) },
  ]

  useEffect(() => {
    const auth = supabase.auth
    const syncUser = async () => {
      const { data } = await auth.getUser()
      setUser(data.user)
      router.refresh()
    }

    syncUser()

    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      router.refresh()
    })

    window.addEventListener('pageshow', syncUser)
    window.addEventListener('focus', syncUser)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('pageshow', syncUser)
      window.removeEventListener('focus', syncUser)
    }
  }, [router, supabase.auth])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    window.location.assign(buildRootDomainUrl({ host, protocol, pathname: '/' }))
  }

  return (
    <div className="border-b border-foreground/10 bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-xs sm:px-6">
        <nav className="flex items-center gap-3">
          {navLinks.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-foreground/60 transition-colors hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </nav>

        {user ? (
          <div className="flex items-center gap-3">
            <p className="text-foreground/70 hidden sm:block">
              <span className="font-medium text-foreground">{user.email ?? 'authenticated user'}</span>
            </p>
            <button
              onClick={handleLogout}
              className="text-foreground/60 transition-colors hover:text-foreground"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            onClick={(event) => {
              event.preventDefault()
              window.location.assign(getClientAuthUrl('/', window.location.href))
            }}
            className="text-foreground/60 transition-colors hover:text-foreground"
          >
            Login
          </Link>
        )}
      </div>
    </div>
  )
}
