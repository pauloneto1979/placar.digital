create table if not exists provedores_dados_esportivos (
  id uuid primary key default gen_random_uuid(),
  provider varchar(80) not null,
  enabled boolean not null default false,
  api_token text,
  sync_interval_seconds integer not null default 300,
  base_url varchar(255) not null,
  last_sync_at timestamptz,
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now(),
  constraint provedores_dados_esportivos_provider_unique unique (provider),
  constraint provedores_dados_esportivos_sync_interval_check check (sync_interval_seconds > 0)
);

insert into provedores_dados_esportivos (
  provider,
  enabled,
  api_token,
  sync_interval_seconds,
  base_url
)
values (
  'football-data',
  false,
  null,
  300,
  'https://api.football-data.org/v4'
)
on conflict (provider) do nothing;

drop trigger if exists provedores_dados_esportivos_set_updated_at on provedores_dados_esportivos;
create trigger provedores_dados_esportivos_set_updated_at
before update on provedores_dados_esportivos
for each row execute function set_updated_at();
