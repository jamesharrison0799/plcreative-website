import type { SupabaseClient } from '@supabase/supabase-js'

export type CmsPageStatus = 'draft' | 'published'
export type CmsSectionType =
  | 'hero'
  | 'hero_media'
  | 'text'
  | 'cta'
  | 'image'
  | 'faq'
  | 'testimonials'

export interface CmsPageRecord {
  id: string
  slug: string
  title: string
  status: CmsPageStatus
  seo_title: string | null
  seo_description: string | null
  created_at: string
  updated_at: string
}

export interface CmsSectionRecord {
  id: string
  page_id: string
  type: CmsSectionType
  position: number
  data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SiteSettingsRecord {
  id: number
  site_name: string
  site_description: string
  updated_at: string
}

export interface CmsPageData {
  page: CmsPageRecord
  sections: CmsSectionRecord[]
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getTextValue(data: Record<string, unknown>, key: string) {
  const value = data[key]
  return typeof value === 'string' ? value : ''
}

export async function getPageBySlug({
  supabase,
  slug,
}: {
  supabase: SupabaseClient
  slug: string
}) {
  const { data: page, error: pageError } = await supabase
    .from('pages')
    .select('id, slug, title, status, seo_title, seo_description, created_at, updated_at')
    .eq('slug', slug)
    .single<CmsPageRecord>()

  if (pageError || !page) {
    return null
  }

  const { data: sections } = await supabase
    .from('page_sections')
    .select('id, page_id, type, position, data, created_at, updated_at')
    .eq('page_id', page.id)
    .order('position', { ascending: true })
    .returns<CmsSectionRecord[]>()

  return {
    page,
    sections: sections ?? [],
  } satisfies CmsPageData
}

export async function getPagesIndex(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('pages')
    .select('id, slug, title, status, seo_title, seo_description, created_at, updated_at')
    .order('slug', { ascending: true })
    .returns<CmsPageRecord[]>()

  return data ?? []
}

export async function getSiteSettings(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('site_settings')
    .select('id, site_name, site_description, updated_at')
    .eq('id', 1)
    .single<SiteSettingsRecord>()

  return data ?? null
}
