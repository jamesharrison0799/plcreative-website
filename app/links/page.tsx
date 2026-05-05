import LinksBuilder from '@/components/LinksBuilder'
import { createClient } from '@/lib/supabase/server'

export default async function LinksPage() {
  const supabase = await createClient()

  let links: Array<{
    id: string
    title: string
    url: string
    description: string | null
    order_index: number
    position_x: number
    position_y: number
    velocity_x: number
    velocity_y: number
  }> = []
  let titleImageUrl: string | null = null
  let titleImageSize = 100
  let titleImagePaddingTop = 0
  let titleImagePaddingRight = 0
  let titleImagePaddingBottom = 0
  let titleImagePaddingLeft = 0
  let initialLoadState:
    | { kind: 'ready' }
    | { kind: 'missing-table'; message: string }
    | { kind: 'error'; code?: string | null; message: string } = { kind: 'ready' }
  
  try {
    const [{ data, error }, { data: settings }] = await Promise.all([
      supabase
        .from('links')
        .select('id, title, url, description, order_index, position_x, position_y, velocity_x, velocity_y')
        .order('order_index', { ascending: true }),
      supabase
        .from('links_settings')
        .select('title_image_url, title_image_size, title_image_padding_top, title_image_padding_right, title_image_padding_bottom, title_image_padding_left')
        .eq('id', 1)
        .maybeSingle<{
          title_image_url: string | null
          title_image_size: number | null
          title_image_padding_top: number | null
          title_image_padding_right: number | null
          title_image_padding_bottom: number | null
          title_image_padding_left: number | null
        }>(),
    ])

    if (error?.code === 'PGRST205') {
      initialLoadState = {
        kind: 'missing-table',
        message: 'The public.links table is missing from Supabase.',
      }
    } else if (error) {
      initialLoadState = {
        kind: 'error',
        code: error.code,
        message: error.message,
      }
      console.error('Failed to fetch links:', error)
    }
    
    links = data || []
    titleImageUrl = settings?.title_image_url ?? null
    titleImageSize = settings?.title_image_size ?? 100
    titleImagePaddingTop = settings?.title_image_padding_top ?? 0
    titleImagePaddingRight = settings?.title_image_padding_right ?? 0
    titleImagePaddingBottom = settings?.title_image_padding_bottom ?? 0
    titleImagePaddingLeft = settings?.title_image_padding_left ?? 0
  } catch (err) {
    initialLoadState = {
      kind: 'error',
      message: err instanceof Error ? err.message : 'Unknown error while loading links.',
    }
    console.error('Error fetching links:', err)
  }

  return (
    <LinksBuilder
      initialLinks={links}
      isAdmin={false}
      initialLoadState={initialLoadState}
      initialTitleImageUrl={titleImageUrl}
      initialTitleImageSize={titleImageSize}
      initialTitleImagePaddingTop={titleImagePaddingTop}
      initialTitleImagePaddingRight={titleImagePaddingRight}
      initialTitleImagePaddingBottom={titleImagePaddingBottom}
      initialTitleImagePaddingLeft={titleImagePaddingLeft}
    />
  )
}
