import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm">Page not found.</p>
        <Link href="/" className="text-xs text-foreground/50 hover:text-foreground underline">
          Go home
        </Link>
      </div>
    </main>
  )
}
