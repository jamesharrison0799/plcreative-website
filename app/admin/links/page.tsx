import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'

export default async function AdminLinksPage() {
  await requireAdmin()
  redirect('/links')
}
