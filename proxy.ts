import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function getRequestHostname(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const headerHost = request.headers.get('host')
  const candidate = forwardedHost || headerHost || request.nextUrl.hostname || ''

  return candidate.split(':')[0].toLowerCase()
}

function getSubdomain(hostname: string) {
  if (!hostname || hostname === 'localhost') {
    return null
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
    return null
  }

  if (hostname.endsWith('.localhost')) {
    const parts = hostname.split('.')
    return parts.length > 1 ? parts[0] : null
  }

  const parts = hostname.split('.').filter(Boolean)
  return parts.length > 2 ? parts[0] : null
}

export async function proxy(request: NextRequest) {
  const hostname = getRequestHostname(request)
  const subdomain = getSubdomain(hostname)

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

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
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