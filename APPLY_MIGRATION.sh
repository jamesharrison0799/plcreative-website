#!/bin/bash

# This script helps you manually run the SQL migration in Supabase
# You'll need to get your service role key from the Supabase dashboard:
# 1. Go to https://supabase.com/dashboard
# 2. Select your project
# 3. Settings > API > Service Role (secret)

echo "To apply the links table migration:"
echo "1. Visit: https://supabase.com/dashboard"
echo "2. Select project: mbyfthldaoggvlgytjuz"
echo "3. Click 'SQL Editor' in the left sidebar"
echo "4. Click 'New query'"
echo "5. Paste and run this SQL:"
echo ""
echo "---START SQL---"
cat << 'EOF'
create table if not exists links (
  id uuid default gen_random_uuid() primary key,
  url text not null,
  title text not null,
  description text,
  order_index int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table links enable row level security;

drop policy if exists "Public read access" on links;
drop policy if exists "Admin full access" on links;

create policy "Public read access" on links for select using (true);
create policy "Admin full access" on links for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
) with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
EOF
echo ""
echo "---END SQL---"
echo ""
echo "Once the table is created, admins can add links at:"
echo "https://plcreative.love/admin/links"
