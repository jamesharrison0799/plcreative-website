'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { buildRootDomainUrl, getRootDomainForHost } from '@/lib/subdomains'
import { createClient } from '@/lib/supabase/server'

function getSafeRedirectTarget(referer: string | null, host: string) {
  if (!referer) {
    return null
  }

  try {
    const refererUrl = new URL(referer)
    const currentRoot = getRootDomainForHost(host)
    const refererRoot = getRootDomainForHost(refererUrl.host)

    if (currentRoot && currentRoot === refererRoot) {
      return refererUrl.toString()
    }
  } catch {
    return null
  }

  return null
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || ''
  const protocol = headerStore.get('x-forwarded-proto') || 'https'
  const redirectTarget = getSafeRedirectTarget(headerStore.get('referer'), host)

  redirect(
    redirectTarget ??
      buildRootDomainUrl({
        host,
        protocol,
        pathname: '/',
      })
  )
}