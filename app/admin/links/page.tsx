import LinksBuilder from '@/components/LinksBuilder'
import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLinksPage() {
  await requireAdmin()
  const supabase = await createClient()

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

  const initialLoadState = error?.code === 'PGRST205'
    ? { kind: 'missing-table' as const, message: 'The public.links table is missing from Supabase.' }
    : error
      ? { kind: 'error' as const, code: error.code, message: error.message }
      : { kind: 'ready' as const }

  return (
    <LinksBuilder
      initialLinks={data ?? []}
      isAdmin={true}
      initialLoadState={initialLoadState}
      initialTitleImageUrl={settings?.title_image_url ?? null}
      initialTitleImageSize={settings?.title_image_size ?? 100}
      initialTitleImagePaddingTop={settings?.title_image_padding_top ?? 0}
      initialTitleImagePaddingRight={settings?.title_image_padding_right ?? 0}
      initialTitleImagePaddingBottom={settings?.title_image_padding_bottom ?? 0}
      initialTitleImagePaddingLeft={settings?.title_image_padding_left ?? 0}
    />
  )
}
