create table if not exists public.links_settings (
  id int primary key,
  title_image_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

insert into public.links_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.links_settings enable row level security;

create policy "Public read links settings" on public.links_settings
for select
using (true);

create policy "Admin manage links settings" on public.links_settings
for all
using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
)
with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);