import { requireAdmin } from '@/lib/admin'
import { updateUserRoleAction } from '@/app/admin/actions'

interface Profile {
  id: string
  username: string | null
  display_name: string | null
  role: string
  bot: boolean
  avatar_url: string | null
  created_at: string
}

export default async function AdminUsersPage() {
  const { supabase } = await requireAdmin()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, role, bot, avatar_url, created_at')
    .order('created_at', { ascending: false })
    .returns<Profile[]>()

  const users = profiles ?? []
  const humans = users.filter((u) => !u.bot)
  const bots = users.filter((u) => u.bot)

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-foreground/40">Admin</p>
        <h1 className="mt-2 text-lg">Users</h1>
        <p className="mt-2 text-sm text-foreground/50">{humans.length} human · {bots.length} bot</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm">Human accounts</h2>
        {humans.length === 0 && <p className="text-sm text-foreground/40">None.</p>}
        {humans.map((profile) => (
          <div key={profile.id} className="flex flex-wrap items-center justify-between gap-4 border border-foreground/10 p-4">
            <div className="flex items-center gap-3 min-w-0">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="size-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="size-8 rounded-full border border-foreground/15 bg-foreground/5 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm truncate">{profile.display_name || profile.username || 'Unknown'}</p>
                <p className="text-xs text-foreground/40 truncate">@{profile.username ?? profile.id}</p>
              </div>
            </div>

            <form action={updateUserRoleAction} className="flex items-center gap-2 shrink-0">
              <input type="hidden" name="user_id" value={profile.id} />
              <select
                name="role"
                defaultValue={profile.role}
                className="border border-foreground/10 bg-background px-3 py-1.5 text-xs outline-none focus:border-foreground/30"
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <button
                type="submit"
                className="border border-foreground/10 px-3 py-1.5 text-xs hover:bg-foreground/5"
              >
                Save
              </button>
            </form>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm">Bot accounts</h2>
        {bots.length === 0 && <p className="text-sm text-foreground/40">None.</p>}
        {bots.map((profile) => (
          <div key={profile.id} className="flex items-center gap-3 border border-foreground/10 p-4 opacity-60">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="size-7 rounded-full object-cover shrink-0" />
            ) : (
              <div className="size-7 rounded-full border border-foreground/15 bg-foreground/5 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs truncate">{profile.display_name || profile.username || 'Bot'}</p>
              <p className="text-xs text-foreground/40 truncate">bot · @{profile.username ?? profile.id}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
