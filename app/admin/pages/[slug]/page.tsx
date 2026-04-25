import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { getPageBySlug } from '@/lib/cms'
import PageBuilder from '@/components/PageBuilder'

export default async function AdminEditPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { supabase } = await requireAdmin()
  const cmsPage = await getPageBySlug({ supabase, slug })

  if (!cmsPage) {
    notFound()
  }

  return (
    <PageBuilder
      page={cmsPage.page}
      initialSections={cmsPage.sections}
    />
  )
}
