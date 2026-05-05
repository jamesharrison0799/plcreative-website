'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { buildRootDomainUrl, getRootDomainForHost } from '@/lib/subdomains'
import { createClient } from '@/lib/supabase/client'

function getDefaultAdminUrl() {
  if (typeof window === 'undefined') {
    return '/admin'
  }

  return buildRootDomainUrl({
    host: window.location.host,
    protocol: window.location.protocol,
    pathname: '/admin',
  })
}

function getSafeRedirectTo(redirectTo: string | null) {
  if (typeof window === 'undefined') {
    return '/admin'
  }

  if (!redirectTo) {
    return getDefaultAdminUrl()
  }

  try {
    const targetUrl = new URL(redirectTo, window.location.href)
    const currentRootDomain = getRootDomainForHost(window.location.host)
    const targetRootDomain = getRootDomainForHost(targetUrl.host)

    if (currentRootDomain && currentRootDomain === targetRootDomain) {
      return targetUrl.toString()
    }
  } catch {
    return getDefaultAdminUrl()
  }

  return getDefaultAdminUrl()
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const supabase = createClient()
  const redirectTo = useMemo(
    () => getSafeRedirectTo(searchParams.get('redirectTo')),
    [searchParams]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.assign(redirectTo)
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center min-h-screen">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <p className="text-center">Login</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border border-foreground/10 rounded bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border border-foreground/10 rounded bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="text-sm border border-foreground/10 rounded bg-background px-3 py-2 hover:bg-foreground/5 transition-colors disabled:opacity-50"
          >
            {loading ? '…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}


