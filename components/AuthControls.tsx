'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getClientAuthUrl } from '@/lib/auth-url'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function AuthControls({ loginHref }: { loginHref: string }) {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const auth = supabase.auth
    auth.getUser().then(({ data }) => setUser(data.user))

    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (user) {
    return (
      <div className="border-b border-foreground/10 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4 px-4 py-3 text-xs sm:px-6">
          <p className="min-w-0 text-foreground/70">
            Logged in as <span className="font-medium text-foreground">{user.email ?? 'authenticated user'}</span>
          </p>
          <button
            onClick={handleLogout}
            className="shrink-0 text-foreground/60 transition-colors hover:text-foreground"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-end px-4 py-4 sm:px-6">
      <a
        href={loginHref}
        onClick={(event) => {
          event.preventDefault()
          window.location.assign(getClientAuthUrl('/', window.location.href))
        }}
        className="text-xs text-gray-500 transition-colors hover:text-gray-800"
      >
        Login
      </a>
    </div>
  )
}
