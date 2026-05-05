alter table public.links_settings
  add column if not exists title_image_size integer not null default 100,
  add column if not exists title_image_padding_top integer not null default 0,
  add column if not exists title_image_padding_right integer not null default 0,
  add column if not exists title_image_padding_bottom integer not null default 0,
  add column if not exists title_image_padding_left integer not null default 0;