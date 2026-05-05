import { redirect } from 'next/navigation'
import { getAuthUrl } from '@/lib/auth-url'
import { createClient } from '@/lib/supabase/server'

export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(await getAuthUrl())
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, username, display_name')
    .eq('id', user.id)
    .single<{ id: string; role: string; username: string | null; display_name: string | null }>()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  return {
    supabase,
    user,
    profile,
  }
}
