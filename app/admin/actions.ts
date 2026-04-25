'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { slugify } from '@/lib/cms'

function revalidateCmsPaths(slug: string) {
  revalidatePath('/admin')
  revalidatePath(`/admin/pages/${slug}`)
  revalidatePath('/')

  if (slug !== 'home') {
    revalidatePath(`/${slug}`)
  }
}

export async function createPageAction(formData: FormData) {
  const { supabase } = await requireAdmin()

  const title = String(formData.get('title') ?? '').trim()
  const rawSlug = String(formData.get('slug') ?? '').trim()
  const slug = slugify(rawSlug || title)

  if (!title || !slug) {
    return
  }

  const { data: page, error } = await supabase
    .from('pages')
    .insert({
      title,
      slug,
      status: 'draft',
      seo_title: title,
      seo_description: '',
      updated_at: new Date().toISOString(),
    })
    .select('id, slug')
    .single<{ id: string; slug: string }>()

  if (error || !page) {
    return
  }

  await supabase.from('page_sections').insert({
    page_id: page.id,
    type: 'hero',
    position: 0,
    data: { heading: title, body: '' },
    updated_at: new Date().toISOString(),
  })

  revalidateCmsPaths(slug)
  redirect(`/admin/pages/${page.slug}`)
}

export async function updatePageMetadataAction(formData: FormData) {
  const { supabase } = await requireAdmin()

  const pageId = String(formData.get('page_id') ?? '')
  const slug = String(formData.get('slug') ?? '')

  if (!pageId || !slug) {
    return
  }

  await supabase
    .from('pages')
    .update({
      title: String(formData.get('title') ?? '').trim(),
      status: String(formData.get('status') ?? 'draft').trim(),
      seo_title: String(formData.get('seo_title') ?? '').trim(),
      seo_description: String(formData.get('seo_description') ?? '').trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', pageId)

  revalidateCmsPaths(slug)
}

export async function updateSectionAction(formData: FormData) {
  const { supabase } = await requireAdmin()

  const sectionId = String(formData.get('section_id') ?? '')
  const slug = String(formData.get('slug') ?? '')
  const sectionType = String(formData.get('section_type') ?? '')

  if (!sectionId || !slug) {
    return
  }

  const numberValue = (key: string, fallback: number) => {
    const raw = Number(formData.get(key) ?? fallback)
    return Number.isFinite(raw) ? raw : fallback
  }

  const boolValue = (key: string) => String(formData.get(key) ?? 'false') === 'true'

  const data: Record<string, unknown> =
    sectionType === 'hero_media'
      ? {
          heading: String(formData.get('heading') ?? '').trim(),
          use_title_image: boolValue('use_title_image'),
          title_image_url: String(formData.get('title_image_url') ?? '').trim(),
          title_image_size: numberValue('title_image_size', 100),
          title_image_offset_x: numberValue('title_image_offset_x', 0),
          title_image_offset_y: numberValue('title_image_offset_y', 0),
          title_image_h_align: String(formData.get('title_image_h_align') ?? 'center').trim(),
          title_image_v_align: String(formData.get('title_image_v_align') ?? 'center').trim(),
          title_image_padding_top: numberValue('title_image_padding_top', 0),
          title_image_padding_right: numberValue('title_image_padding_right', 0),
          title_image_padding_bottom: numberValue('title_image_padding_bottom', 0),
          title_image_padding_left: numberValue('title_image_padding_left', 0),
          media_url: String(formData.get('media_url') ?? '').trim(),
          logo_url: String(formData.get('logo_url') ?? '').trim(),
          media_type: String(formData.get('media_type') ?? 'image').trim(),
          overlay_opacity: Number(formData.get('overlay_opacity') ?? 45),
          media_blur: numberValue('media_blur', 0),
          media_opacity: numberValue('media_opacity', 100),
          media_brightness: numberValue('media_brightness', 100),
          media_contrast: numberValue('media_contrast', 100),
          glass_mode: boolValue('glass_mode'),
        }
      : sectionType === 'hero'
      ? {
          heading: String(formData.get('heading') ?? '').trim(),
          body: String(formData.get('body') ?? '').trim(),
          use_title_image: boolValue('use_title_image'),
          title_image_url: String(formData.get('title_image_url') ?? '').trim(),
          title_image_size: numberValue('title_image_size', 100),
          title_image_offset_x: numberValue('title_image_offset_x', 0),
          title_image_offset_y: numberValue('title_image_offset_y', 0),
          title_image_h_align: String(formData.get('title_image_h_align') ?? 'center').trim(),
          title_image_v_align: String(formData.get('title_image_v_align') ?? 'center').trim(),
          title_image_padding_top: numberValue('title_image_padding_top', 0),
          title_image_padding_right: numberValue('title_image_padding_right', 0),
          title_image_padding_bottom: numberValue('title_image_padding_bottom', 0),
          title_image_padding_left: numberValue('title_image_padding_left', 0),
          image_url: String(formData.get('image_url') ?? '').trim(),
          media_blur: numberValue('media_blur', 0),
          media_opacity: numberValue('media_opacity', 100),
          media_brightness: numberValue('media_brightness', 100),
          media_contrast: numberValue('media_contrast', 100),
          glass_mode: boolValue('glass_mode'),
        }
      : sectionType === 'cta'
      ? {
          heading: String(formData.get('heading') ?? '').trim(),
          body: String(formData.get('body') ?? '').trim(),
          button_text: String(formData.get('button_text') ?? '').trim(),
          button_url: String(formData.get('button_url') ?? '').trim(),
        }
      : sectionType === 'image'
      ? {
          image_url: String(formData.get('image_url') ?? '').trim(),
          alt: String(formData.get('alt') ?? '').trim(),
          caption: String(formData.get('caption') ?? '').trim(),
          heading: String(formData.get('heading') ?? '').trim(),
        }
      : sectionType === 'faq'
      ? {
          heading: String(formData.get('heading') ?? '').trim(),
          items: (() => {
            try {
              return JSON.parse(String(formData.get('items_json') ?? '[]'))
            } catch {
              return []
            }
          })(),
        }
      : sectionType === 'testimonials'
      ? {
          heading: String(formData.get('heading') ?? '').trim(),
          items: (() => {
            try {
              return JSON.parse(String(formData.get('items_json') ?? '[]'))
            } catch {
              return []
            }
          })(),
        }
      : {
          heading: String(formData.get('heading') ?? '').trim(),
          body: String(formData.get('body') ?? '').trim(),
        }

  await supabase
    .from('page_sections')
    .update({
      data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sectionId)

  revalidateCmsPaths(slug)
}

export async function addTextSectionAction(formData: FormData) {
  const { supabase } = await requireAdmin()

  const pageId = String(formData.get('page_id') ?? '')
  const slug = String(formData.get('slug') ?? '')
  const type = String(formData.get('type') ?? 'text')

  if (!pageId || !slug) {
    return
  }

  const { data: sections } = await supabase
    .from('page_sections')
    .select('position')
    .eq('page_id', pageId)
    .order('position', { ascending: false })
    .limit(1)
    .returns<Array<{ position: number }>>()

  const nextPosition = sections?.[0]?.position ? sections[0].position + 1 : 1

  const defaultData: Record<string, unknown> =
    type === 'hero_media'
      ? {
          heading: '',
          use_title_image: false,
          title_image_url: '',
          title_image_size: 100,
          title_image_offset_x: 0,
          title_image_offset_y: 0,
          title_image_h_align: 'center',
          title_image_v_align: 'center',
          title_image_padding_top: 0,
          title_image_padding_right: 0,
          title_image_padding_bottom: 0,
          title_image_padding_left: 0,
          media_url: '',
          logo_url: '',
          media_type: 'image',
          overlay_opacity: 45,
          media_blur: 0,
          media_opacity: 100,
          media_brightness: 100,
          media_contrast: 100,
          glass_mode: false,
        }
      : type === 'hero'
      ? {
          heading: 'Hero heading',
          body: '',
          use_title_image: false,
          title_image_url: '',
          title_image_size: 100,
          title_image_offset_x: 0,
          title_image_offset_y: 0,
          title_image_h_align: 'center',
          title_image_v_align: 'center',
          title_image_padding_top: 0,
          title_image_padding_right: 0,
          title_image_padding_bottom: 0,
          title_image_padding_left: 0,
          image_url: '',
          media_blur: 0,
          media_opacity: 100,
          media_brightness: 100,
          media_contrast: 100,
          glass_mode: false,
        }
      : type === 'cta'
      ? { heading: 'Call to action', body: '', button_text: 'Get started', button_url: '/' }
      : type === 'image'
      ? { image_url: '', alt: '', caption: '', heading: '' }
      : type === 'faq'
      ? { heading: 'FAQ', items: [{ q: 'Question?', a: 'Answer.' }] }
      : type === 'testimonials'
      ? { heading: 'Testimonials', items: [{ name: 'Jane Doe', quote: 'Great work!', title: '' }] }
      : { heading: 'Text section', body: '' }

  await supabase.from('page_sections').insert({
    page_id: pageId,
    type,
    position: nextPosition,
    data: defaultData,
    updated_at: new Date().toISOString(),
  })

  revalidateCmsPaths(slug)
}

export async function deleteSectionAction(formData: FormData) {
  const { supabase } = await requireAdmin()

  const sectionId = String(formData.get('section_id') ?? '')
  const slug = String(formData.get('slug') ?? '')

  if (!sectionId || !slug) return

  await supabase.from('page_sections').delete().eq('id', sectionId)
  revalidateCmsPaths(slug)
}

export async function moveSectionAction(formData: FormData) {
  const { supabase } = await requireAdmin()

  const sectionId = String(formData.get('section_id') ?? '')
  const pageId = String(formData.get('page_id') ?? '')
  const slug = String(formData.get('slug') ?? '')
  const direction = String(formData.get('direction') ?? '')

  if (!sectionId || !pageId || !slug || !direction) return

  const { data: sections } = await supabase
    .from('page_sections')
    .select('id, position')
    .eq('page_id', pageId)
    .order('position', { ascending: true })
    .returns<Array<{ id: string; position: number }>>()

  if (!sections) return

  const idx = sections.findIndex((s) => s.id === sectionId)
  if (idx === -1) return

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= sections.length) return

  const posA = sections[idx].position
  const posB = sections[swapIdx].position

  await Promise.all([
    supabase.from('page_sections').update({ position: posB, updated_at: new Date().toISOString() }).eq('id', sections[idx].id),
    supabase.from('page_sections').update({ position: posA, updated_at: new Date().toISOString() }).eq('id', sections[swapIdx].id),
  ])

  revalidateCmsPaths(slug)
}

export async function updateSiteSettingsAction(formData: FormData) {
  const { supabase } = await requireAdmin()

  await supabase.from('site_settings').upsert({
    id: 1,
    site_name: String(formData.get('site_name') ?? 'PLCreative').trim() || 'PLCreative',
    site_description:
      String(formData.get('site_description') ?? 'PLCreative').trim() || 'PLCreative',
    updated_at: new Date().toISOString(),
  })

  revalidatePath('/admin')
  revalidatePath('/')
}

export async function updateUserRoleAction(formData: FormData) {
  const { supabase } = await requireAdmin()

  const userId = String(formData.get('user_id') ?? '')
  const role = String(formData.get('role') ?? '')

  if (!userId || !['admin', 'user'].includes(role)) return

  await supabase.from('profiles').update({ role }).eq('id', userId)
  revalidatePath('/admin/users')
}

export async function deleteMediaAction(formData: FormData) {
  const { supabase } = await requireAdmin()
  const path = String(formData.get('path') ?? '')
  if (!path) return
  await supabase.storage.from('media').remove([path])
  revalidatePath('/admin/media')
}

export async function reorderSectionsAction(formData: FormData) {
  const { supabase } = await requireAdmin()

  const slug = String(formData.get('slug') ?? '')
  const orderedIds = String(formData.get('ordered_ids') ?? '')

  if (!slug || !orderedIds) return

  const ids = orderedIds.split(',').filter(Boolean)

  await Promise.all(
    ids.map((id, index) =>
      supabase
        .from('page_sections')
        .update({ position: index, updated_at: new Date().toISOString() })
        .eq('id', id)
    )
  )

  revalidateCmsPaths(slug)
}
