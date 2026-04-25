import CmsPageRenderer from '@/components/CmsPageRenderer'
import { getPageBySlug } from '@/lib/cms'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const cmsPage = await getPageBySlug({ supabase, slug: 'home' })

  if (!cmsPage) {
    return (
      <main className="flex flex-1 items-center justify-center min-h-screen">
        <p>PLCreative</p>
      </main>
    )
  }

  return <CmsPageRenderer sections={cmsPage.sections} />
}
