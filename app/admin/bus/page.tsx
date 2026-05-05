import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'

export default async function AdminBusPage() {
  await requireAdmin()
  redirect('/bus')
}
