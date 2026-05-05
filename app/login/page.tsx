'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/admin')
      router.refresh()
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


