import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, bio, avatar_url, website, location, created_at')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: ownProfile } = user
    ? await supabase.from('profiles').select('username').eq('id', user.id).single()
    : { data: null }

  const isOwn = ownProfile?.username === username

  return (
    <main className="flex flex-1 justify-center min-h-screen pt-20 px-4">
      <div className="w-full max-w-lg flex flex-col gap-6 py-12">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="font-medium">{profile.display_name || profile.username}</p>
            <p className="text-sm text-gray-400">@{profile.username}</p>
          </div>
          {profile.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.display_name || profile.username || ''}
              className="w-16 h-16 rounded-full object-cover"
            />
          )}
        </div>

        {profile.bio && <p className="text-sm text-gray-600">{profile.bio}</p>}

        <div className="flex flex-col gap-1 text-xs text-gray-400">
          {profile.location && <span>{profile.location}</span>}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 underline"
            >
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        {isOwn && (
          <a
            href={`/u/${username}/edit`}
            className="text-xs text-gray-400 hover:text-gray-700 underline self-start"
          >
            Edit profile
          </a>
        )}
      </div>
    </main>
  )
}
