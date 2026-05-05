import { createClient } from '@/lib/supabase/server'
import LinksBuilder from '@/components/LinksBuilder'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Link {
  id: string
  url: string
  title: string
  description: string | null
  order_index: number
  position_x: number
  position_y: number
  velocity_x: number
  velocity_y: number
}

export default async function LinksPage() {
  const supabase = await createClient()

  let links: Link[] = []
  let isAdmin = false
  let loadState:
    | { kind: 'ready' }
    | { kind: 'missing-table'; message: string }
    | { kind: 'error'; code?: string | null; message: string } = { kind: 'ready' }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: string }>()

    isAdmin = profile?.role === 'admin'
  }

  try {
    const { data, error } = await supabase
      .from('links')
      .select('id, url, title, description, order_index, position_x, position_y, velocity_x, velocity_y')
      .order('order_index', { ascending: true })

    if (error?.code === 'PGRST205') {
      loadState = {
        kind: 'missing-table',
        message: 'The public.links table is missing from Supabase.',
      }
    } else if (error) {
      console.error('Failed to fetch links:', error)
      loadState = {
        kind: 'error',
        code: error.code,
        message: error.message,
      }
    }

    links = data || []
  } catch (err) {
    console.error('Error fetching links:', err)
    loadState = {
      kind: 'error',
      message: err instanceof Error ? err.message : 'Unknown error loading links.',
    }
  }

  return <LinksBuilder initialLinks={links} isAdmin={isAdmin} initialLoadState={loadState} />
}
