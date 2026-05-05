create table if not exists public.request_rate_limits (
  key text primary key,
  window_started_at timestamptz not null default now(),
  hits integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.request_rate_limits enable row level security;

create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_hits integer;
begin
  if p_limit <= 0 or p_window_seconds <= 0 then
    return false;
  end if;

  insert into public.request_rate_limits as rl (key, window_started_at, hits, updated_at)
  values (p_key, v_now, 1, v_now)
  on conflict (key) do update
  set
    window_started_at = case
      when rl.window_started_at <= v_now - make_interval(secs => p_window_seconds) then v_now
      else rl.window_started_at
    end,
    hits = case
      when rl.window_started_at <= v_now - make_interval(secs => p_window_seconds) then 1
      else rl.hits + 1
    end,
    updated_at = v_now
  returning hits into v_hits;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to anon, authenticated, service_role;
