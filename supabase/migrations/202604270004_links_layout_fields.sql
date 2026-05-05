alter table public.links
  add column if not exists position_x double precision not null default 50,
  add column if not exists position_y double precision not null default 50,
  add column if not exists velocity_x double precision not null default 0,
  add column if not exists velocity_y double precision not null default 0;
