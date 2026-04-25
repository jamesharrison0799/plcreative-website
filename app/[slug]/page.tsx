import { notFound } from 'next/navigation'
import CmsPageRenderer from '@/components/CmsPageRenderer'
import { getPageBySlug } from '@/lib/cms'
import { createClient } from '@/lib/supabase/server'

export default async function DynamicCmsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const cmsPage = await getPageBySlug({ supabase, slug })

  if (!cmsPage || cmsPage.page.status !== 'published') {
    notFound()
  }

  return <CmsPageRenderer sections={cmsPage.sections} />
}
