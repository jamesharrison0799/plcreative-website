'use client'

import Link from 'next/link'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex flex-1 items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm">Something went wrong.</p>
        <div className="flex gap-4">
          <button
            onClick={reset}
            className="text-xs text-foreground/50 hover:text-foreground underline"
          >
            Try again
          </button>
          <Link href="/" className="text-xs text-foreground/50 hover:text-foreground underline">
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}
