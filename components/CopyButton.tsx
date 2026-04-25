'use client'

import { useState } from 'react'

export default function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="border border-foreground/10 px-2 py-1 text-xs hover:bg-foreground/5"
    >
      {copied ? '✓' : 'Copy'}
    </button>
  )
}
