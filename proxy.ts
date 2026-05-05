import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  buildRootDomainUrl,
  buildSubdomainUrl,
  getPreferredDevelopmentHost,
  getSubdomain,
  supportsSubdomains,
} from '@/lib/subdomains'
import { getSupabaseCookieOptions } from '@/lib/supabase/cookie-options'

function withRedirectTo(url: string, redirectTo: string) {
  const nextUrl = new URL(url)
  nextUrl.searchParams.set('redirectTo', redirectTo)
  return nextUrl
}

export async function proxy(request: NextRequest) {
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.host ||
    ''
  const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol
  const subdomain = getSubdomain(host)
  const preferredDevelopmentHost = getPreferredDevelopmentHost(host)

  if (preferredDevelopmentHost) {
    const normalizedProtocol = protocol.replace(/:$/, '') || 'http'
    return NextResponse.redirect(
      `${normalizedProtocol}://${preferredDevelopmentHost}${request.nextUrl.pathname}${request.nextUrl.search}`
    )
  }

  if (request.nextUrl.pathname.startsWith('/admin') && subdomain) {
    return NextResponse.redirect(
      buildRootDomainUrl({
        host,
        protocol,
        pathname: `${request.nextUrl.pathname}${request.nextUrl.search}`,
      })
    )
  }

  if (request.nextUrl.pathname === '/login' && subdomain !== 'auth' && supportsSubdomains(host)) {
    return NextResponse.redirect(
      buildSubdomainUrl({
        host,
        protocol,
        subdomain: 'auth',
      })
    )
  }

  if (subdomain === 'auth' && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.rewrite(url)
  }

  if (subdomain === 'links' && !request.nextUrl.pathname.startsWith('/links')) {
    const url = request.nextUrl.clone()
    url.pathname = `/links${url.pathname}`
    return NextResponse.rewrite(url)
  }

  if (subdomain === 'bus' && !request.nextUrl.pathname.startsWith('/bus')) {
    const url = request.nextUrl.clone()
    url.pathname = `/bus${url.pathname}`
    return NextResponse.rewrite(url)
  }

  if (subdomain === 'bin' && !request.nextUrl.pathname.startsWith('/bin')) {
    const url = request.nextUrl.clone()
    url.pathname = `/bin${url.pathname}`
    return NextResponse.rewrite(url)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getSupabaseCookieOptions(host, protocol),
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.endsWith('/edit'))) {
    const loginUrl = supportsSubdomains(host)
      ? buildSubdomainUrl({ host, protocol, subdomain: 'auth' })
      : `${protocol.replace(/:$/, '')}://${host}/login`

    return NextResponse.redirect(withRedirectTo(loginUrl, request.nextUrl.href))
  }

  if (user && request.nextUrl.pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next|static|public|favicon.ico).*)'],
}