import ReactMarkdown from 'react-markdown'
import type { CmsSectionRecord } from '@/lib/cms'
import { getTextValue } from '@/lib/cms'
import Link from 'next/link'

function MarkdownBody({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
        h2: ({ children }) => <h2 className="mt-6 mb-2 text-base font-medium">{children}</h2>,
        h3: ({ children }) => <h3 className="mt-4 mb-1 text-sm font-medium">{children}</h3>,
        a: ({ href, children }) => (
          <a href={href} className="underline opacity-70 hover:opacity-100">
            {children}
          </a>
        ),
        ul: ({ children }) => <ul className="mb-3 list-disc pl-5 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 list-decimal pl-5 space-y-1">{children}</ol>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-foreground/20 pl-4 opacity-70 my-3">
            {children}
          </blockquote>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  )
}

export default function CmsPageRenderer({
  sections,
}: {
  sections: CmsSectionRecord[]
}) {
  return (
    <>
      {sections.map((section) => {
        if (section.type === 'hero') {
          const heading = getTextValue(section.data, 'heading')
          const body = getTextValue(section.data, 'body')
          const imageUrl = getTextValue(section.data, 'image_url')
          const titleImageUrl = getTextValue(section.data, 'title_image_url')
          const useTitleImage = section.data?.use_title_image === true && Boolean(titleImageUrl)
          const titleImageSize = Math.max(20, Math.min(160, Number(section.data?.title_image_size ?? 100)))
          const titleImageOffsetX = Math.max(-300, Math.min(300, Number(section.data?.title_image_offset_x ?? 0)))
          const titleImageOffsetY = Math.max(-300, Math.min(300, Number(section.data?.title_image_offset_y ?? 0)))
          const titleImagePaddingTop = Math.max(0, Math.min(300, Number(section.data?.title_image_padding_top ?? 0)))
          const titleImagePaddingRight = Math.max(0, Math.min(300, Number(section.data?.title_image_padding_right ?? 0)))
          const titleImagePaddingBottom = Math.max(0, Math.min(300, Number(section.data?.title_image_padding_bottom ?? 0)))
          const titleImagePaddingLeft = Math.max(0, Math.min(300, Number(section.data?.title_image_padding_left ?? 0)))
          const hAlignRaw = getTextValue(section.data, 'title_image_h_align')
          const vAlignRaw = getTextValue(section.data, 'title_image_v_align')
          const hMap = { left: 'flex-start', center: 'center', right: 'flex-end' } as const
          const vMap = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const
          const titleHAlign = hMap[hAlignRaw as keyof typeof hMap] ?? 'center'
          const titleVAlign = vMap[vAlignRaw as keyof typeof vMap] ?? 'center'
          const blur = Math.max(0, Math.min(30, Number(section.data?.media_blur ?? 0)))
          const mediaOpacity = Math.max(0, Math.min(100, Number(section.data?.media_opacity ?? 100)))
          const brightness = Math.max(40, Math.min(200, Number(section.data?.media_brightness ?? 100)))
          const contrast = Math.max(40, Math.min(200, Number(section.data?.media_contrast ?? 100)))
          const glassMode = section.data?.glass_mode === true

          return (
            <section key={section.id} className="relative min-h-screen overflow-hidden">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={heading || 'Hero background'}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    filter: `blur(${blur}px) brightness(${brightness}%) contrast(${contrast}%)`,
                    opacity: mediaOpacity / 100,
                  }}
                />
              ) : null}

              {imageUrl ? <div className="absolute inset-0 bg-black/45" aria-hidden="true" /> : null}

              <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-24">
                <div className={glassMode ? 'max-w-2xl border border-white/25 bg-white/10 px-8 py-8 text-center backdrop-blur-md' : 'max-w-2xl text-center'}>
                  {useTitleImage ? (
                    <div
                      className="flex w-full min-h-[240px]"
                      style={{
                        justifyContent: titleHAlign,
                        alignItems: titleVAlign,
                        paddingTop: `${titleImagePaddingTop}px`,
                        paddingRight: `${titleImagePaddingRight}px`,
                        paddingBottom: `${titleImagePaddingBottom}px`,
                        paddingLeft: `${titleImagePaddingLeft}px`,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={titleImageUrl}
                        alt={heading || 'Title image'}
                        className="h-auto w-full max-w-[520px]"
                        style={{
                          width: `${titleImageSize}%`,
                          transform: `translate(${titleImageOffsetX}px, ${titleImageOffsetY}px)`,
                        }}
                      />
                    </div>
                  ) : (
                    <p className={imageUrl ? 'text-base font-normal text-white' : 'text-base font-normal'}>
                      {heading}
                    </p>
                  )}
                  {body ? (
                    <div className={imageUrl ? 'mt-4 text-sm text-white/85 leading-7' : 'mt-4 text-sm text-foreground/50 leading-7'}>
                      <MarkdownBody text={body} />
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          )
        }

        if (section.type === 'hero_media') {
          const heading = getTextValue(section.data, 'heading')
          const mediaUrl = getTextValue(section.data, 'media_url')
          const logoUrl = getTextValue(section.data, 'logo_url')
          const titleImageUrl = getTextValue(section.data, 'title_image_url')
          const useTitleImage = section.data?.use_title_image === true && Boolean(titleImageUrl)
          const titleImageSize = Math.max(20, Math.min(160, Number(section.data?.title_image_size ?? 100)))
          const titleImageOffsetX = Math.max(-300, Math.min(300, Number(section.data?.title_image_offset_x ?? 0)))
          const titleImageOffsetY = Math.max(-300, Math.min(300, Number(section.data?.title_image_offset_y ?? 0)))
          const titleImagePaddingTop = Math.max(0, Math.min(300, Number(section.data?.title_image_padding_top ?? 0)))
          const titleImagePaddingRight = Math.max(0, Math.min(300, Number(section.data?.title_image_padding_right ?? 0)))
          const titleImagePaddingBottom = Math.max(0, Math.min(300, Number(section.data?.title_image_padding_bottom ?? 0)))
          const titleImagePaddingLeft = Math.max(0, Math.min(300, Number(section.data?.title_image_padding_left ?? 0)))
          const hAlignRaw = getTextValue(section.data, 'title_image_h_align')
          const vAlignRaw = getTextValue(section.data, 'title_image_v_align')
          const hMap = { left: 'flex-start', center: 'center', right: 'flex-end' } as const
          const vMap = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const
          const titleHAlign = hMap[hAlignRaw as keyof typeof hMap] ?? 'center'
          const titleVAlign = vMap[vAlignRaw as keyof typeof vMap] ?? 'center'
          const mediaTypeRaw = getTextValue(section.data, 'media_type')
          const mediaType = mediaTypeRaw === 'video' ? 'video' : 'image'
          const overlayOpacityRaw = section.data?.overlay_opacity
          const overlayOpacity =
            typeof overlayOpacityRaw === 'number' && Number.isFinite(overlayOpacityRaw)
              ? Math.max(0, Math.min(100, overlayOpacityRaw))
              : 45
          const blur = Math.max(0, Math.min(30, Number(section.data?.media_blur ?? 0)))
          const mediaOpacity = Math.max(0, Math.min(100, Number(section.data?.media_opacity ?? 100)))
          const brightness = Math.max(40, Math.min(200, Number(section.data?.media_brightness ?? 100)))
          const contrast = Math.max(40, Math.min(200, Number(section.data?.media_contrast ?? 100)))
          const glassMode = section.data?.glass_mode === true

          return (
            <section key={section.id} className="relative min-h-screen overflow-hidden">
              {mediaUrl ? (
                mediaType === 'video' ? (
                  <video
                    className="absolute inset-0 h-full w-full object-cover"
                    src={mediaUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{
                      filter: `blur(${blur}px) brightness(${brightness}%) contrast(${contrast}%)`,
                      opacity: mediaOpacity / 100,
                    }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="absolute inset-0 h-full w-full object-cover"
                    src={mediaUrl}
                    alt={heading || 'Hero background'}
                    style={{
                      filter: `blur(${blur}px) brightness(${brightness}%) contrast(${contrast}%)`,
                      opacity: mediaOpacity / 100,
                    }}
                  />
                )
              ) : (
                <div className="absolute inset-0 bg-foreground/10" />
              )}

              <div
                className="absolute inset-0 bg-black"
                style={{ opacity: overlayOpacity / 100 }}
                aria-hidden="true"
              />

              <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
                <div className={glassMode ? 'flex flex-col items-center gap-6 border border-white/25 bg-white/10 px-8 py-8 text-center backdrop-blur-md' : 'flex flex-col items-center gap-6 text-center'}>
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt={heading || 'Logo'}
                      className="h-auto w-full max-w-[220px] sm:max-w-[300px]"
                    />
                  ) : (
                    <p className="text-sm text-white/70">Add a logo URL</p>
                  )}

                  {useTitleImage ? (
                    <div
                      className="flex w-full min-h-[220px]"
                      style={{
                        justifyContent: titleHAlign,
                        alignItems: titleVAlign,
                        paddingTop: `${titleImagePaddingTop}px`,
                        paddingRight: `${titleImagePaddingRight}px`,
                        paddingBottom: `${titleImagePaddingBottom}px`,
                        paddingLeft: `${titleImagePaddingLeft}px`,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={titleImageUrl}
                        alt={heading || 'Title image'}
                        className="h-auto w-full max-w-[520px]"
                        style={{
                          width: `${titleImageSize}%`,
                          transform: `translate(${titleImageOffsetX}px, ${titleImageOffsetY}px)`,
                        }}
                      />
                    </div>
                  ) : (
                    heading ? (
                      <p className="text-sm uppercase tracking-[0.2em] text-white/80">{heading}</p>
                    ) : null
                  )}
                </div>
              </div>
            </section>
          )
        }

        if (section.type === 'text') {
          const heading = getTextValue(section.data, 'heading')
          const body = getTextValue(section.data, 'body')

          return (
            <section key={section.id} className="px-6 py-16">
              <div className="mx-auto max-w-2xl">
                {heading ? <h2 className="text-sm font-medium mb-4">{heading}</h2> : null}
                {body ? (
                  <div className="text-sm leading-7 text-foreground/70">
                    <MarkdownBody text={body} />
                  </div>
                ) : null}
              </div>
            </section>
          )
        }

        if (section.type === 'cta') {
          const heading = getTextValue(section.data, 'heading')
          const body = getTextValue(section.data, 'body')
          const buttonText = getTextValue(section.data, 'button_text')
          const buttonUrl = getTextValue(section.data, 'button_url')

          return (
            <section key={section.id} className="px-6 py-24">
              <div className="mx-auto max-w-2xl text-center">
                {heading ? <h2 className="text-base font-medium">{heading}</h2> : null}
                {body ? (
                  <div className="mt-3 text-sm text-foreground/60 leading-7">
                    <MarkdownBody text={body} />
                  </div>
                ) : null}
                {buttonText && buttonUrl ? (
                  <Link
                    href={buttonUrl}
                    className="mt-8 inline-block border border-foreground/20 px-6 py-3 text-sm hover:bg-foreground/5"
                  >
                    {buttonText}
                  </Link>
                ) : null}
              </div>
            </section>
          )
        }

        if (section.type === 'image') {
          const heading = getTextValue(section.data, 'heading')
          const imageUrl = getTextValue(section.data, 'image_url')
          const alt = getTextValue(section.data, 'alt')
          const caption = getTextValue(section.data, 'caption')

          return (
            <section key={section.id} className="px-6 py-16">
              <div className="mx-auto max-w-3xl">
                {heading ? <h2 className="mb-6 text-sm font-medium">{heading}</h2> : null}
                {imageUrl ? (
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt={alt || heading} className="w-full" />
                    {caption ? (
                      <figcaption className="mt-2 text-xs text-foreground/40">{caption}</figcaption>
                    ) : null}
                  </figure>
                ) : null}
              </div>
            </section>
          )
        }

        if (section.type === 'faq') {
          const heading = getTextValue(section.data, 'heading')
          const items = section.data?.items
          const faqItems = Array.isArray(items) ? (items as Array<{ q: string; a: string }>) : []

          return (
            <section key={section.id} className="px-6 py-16">
              <div className="mx-auto max-w-2xl">
                {heading ? <h2 className="mb-8 text-sm font-medium">{heading}</h2> : null}
                <div className="space-y-6">
                  {faqItems.map((item, i) => (
                    <div key={i} className="border-b border-foreground/10 pb-6 last:border-0">
                      <p className="text-sm font-medium">{item.q}</p>
                      <p className="mt-2 text-sm text-foreground/60 leading-7">{item.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )
        }

        if (section.type === 'testimonials') {
          const heading = getTextValue(section.data, 'heading')
          const items = section.data?.items
          const testimonials = Array.isArray(items)
            ? (items as Array<{ name: string; quote: string; title?: string }>)
            : []

          return (
            <section key={section.id} className="px-6 py-16">
              <div className="mx-auto max-w-4xl">
                {heading ? <h2 className="mb-8 text-sm font-medium">{heading}</h2> : null}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {testimonials.map((t, i) => (
                    <div key={i} className="border border-foreground/10 p-5">
                      <p className="text-sm leading-7 text-foreground/70">&ldquo;{t.quote}&rdquo;</p>
                      <p className="mt-4 text-xs font-medium">{t.name}</p>
                      {t.title ? <p className="text-xs text-foreground/40">{t.title}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )
        }

        return null
      })}
    </>
  )
}
