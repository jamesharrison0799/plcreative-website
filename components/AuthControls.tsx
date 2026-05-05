'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'

export default function AuthControls() {
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
      <button
        onClick={handleLogout}
        className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
      >
        Logout
      </button>
    )
  }

  return (
    <Link
      href="/login"
      className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
    >
      Login
    </Link>
  )
}
