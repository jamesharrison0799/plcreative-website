create table links (
  id uuid default gen_random_uuid() primary key,
  url text not null,
  title text not null,
  description text,
  order_index int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table links enable row level security;

create policy "Public read access" on links for select using (true);
create policy "Admin full access" on links for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
) with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
