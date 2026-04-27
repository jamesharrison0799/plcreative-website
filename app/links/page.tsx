import { createClient } from '@supabase/supabase-js'

interface Link {
  id: string
  url: string
  title: string
  description: string | null
  order_index: number
}

export default async function LinksPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  let links: Link[] = []
  
  try {
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .order('order_index', { ascending: true })

    if (error && error.code !== 'PGRST205') {
      console.error('Failed to fetch links:', error)
    }
    
    links = data || []
  } catch (err) {
    console.error('Error fetching links:', err)
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md">
        <h1 className="text-center text-sm text-foreground mb-8">links</h1>
        
        <div className="space-y-3">
          {links && links.length > 0 ? (
            links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-foreground/10 p-4 text-sm hover:bg-foreground/5 transition-colors"
              >
                <p className="font-medium">{link.title}</p>
                {link.description && <p className="text-xs text-foreground/60 mt-1">{link.description}</p>}
              </a>
            ))
          ) : (
            <p className="text-center text-sm text-foreground/50">No links yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
