create table if not exists public.mailing_list_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'website',
  status text not null default 'subscribed',
  subscribed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mailing_list_subscribers enable row level security;

drop policy if exists "public can subscribe" on public.mailing_list_subscribers;
create policy "public can subscribe" on public.mailing_list_subscribers
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "service role manage subscribers" on public.mailing_list_subscribers;
create policy "service role manage subscribers" on public.mailing_list_subscribers
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.set_updated_at_mailing_list_subscribers()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_mailing_list_subscribers on public.mailing_list_subscribers;
create trigger trg_set_updated_at_mailing_list_subscribers
before update on public.mailing_list_subscribers
for each row
execute function public.set_updated_at_mailing_list_subscribers();
