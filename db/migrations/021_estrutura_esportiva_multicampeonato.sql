begin;

create table if not exists competicoes (
  id uuid primary key default gen_random_uuid(),
  nome varchar(160) not null,
  codigo varchar(40),
  provider varchar(80) not null default 'manual',
  provider_competition_id varchar(80),
  tipo_competicao varchar(40) not null default 'customizada',
  ativo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now()
);

create unique index if not exists competicoes_provider_external_unique
  on competicoes (provider, provider_competition_id)
  where provider_competition_id is not null;

create unique index if not exists competicoes_provider_codigo_unique
  on competicoes (provider, lower(codigo))
  where codigo is not null;

create table if not exists competicoes_temporadas (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references competicoes(id) on delete cascade,
  nome varchar(160) not null,
  ano_inicio integer,
  ano_fim integer,
  provider_season_id varchar(80),
  ativo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now()
);

create unique index if not exists competicoes_temporadas_provider_unique
  on competicoes_temporadas (competicao_id, provider_season_id)
  where provider_season_id is not null;

create unique index if not exists competicoes_temporadas_nome_unique
  on competicoes_temporadas (competicao_id, lower(nome));

alter table boloes
  add column if not exists competicao_id uuid references competicoes(id) on delete set null,
  add column if not exists temporada_id uuid references competicoes_temporadas(id) on delete set null;

alter table fases
  add column if not exists temporada_id uuid references competicoes_temporadas(id) on delete set null,
  add column if not exists codigo varchar(80),
  add column if not exists tipo_fase varchar(40),
  add column if not exists provider_stage varchar(80),
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists grupos (
  id uuid primary key default gen_random_uuid(),
  fase_id uuid not null references fases(id) on delete cascade,
  codigo varchar(80),
  nome varchar(160) not null,
  ordem integer not null default 0,
  provider_group varchar(80),
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now()
);

create unique index if not exists grupos_fase_codigo_unique
  on grupos (fase_id, lower(codigo))
  where codigo is not null;

create unique index if not exists grupos_fase_nome_unique
  on grupos (fase_id, lower(nome));

create table if not exists rodadas (
  id uuid primary key default gen_random_uuid(),
  fase_id uuid not null references fases(id) on delete cascade,
  numero integer,
  nome varchar(160) not null,
  ordem integer not null default 0,
  provider_matchday varchar(80),
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now()
);

create unique index if not exists rodadas_fase_numero_unique
  on rodadas (fase_id, numero)
  where numero is not null;

create unique index if not exists rodadas_fase_nome_unique
  on rodadas (fase_id, lower(nome));

alter table partidas
  add column if not exists competicao_id uuid references competicoes(id) on delete set null,
  add column if not exists temporada_id uuid references competicoes_temporadas(id) on delete set null,
  add column if not exists grupo_id uuid references grupos(id) on delete set null,
  add column if not exists rodada_id uuid references rodadas(id) on delete set null;

insert into competicoes (nome, codigo, provider, tipo_competicao, metadata)
values ('Competicao personalizada', 'CUSTOM', 'manual', 'customizada', '{"origem":"backfill"}'::jsonb)
on conflict do nothing;

insert into competicoes_temporadas (competicao_id, nome, ativo, metadata)
select id, 'Temporada padrao', true, '{"origem":"backfill"}'::jsonb
from competicoes
where provider = 'manual' and codigo = 'CUSTOM'
on conflict do nothing;

update boloes b
set
  competicao_id = coalesce(b.competicao_id, c.id),
  temporada_id = coalesce(b.temporada_id, t.id)
from competicoes c
join competicoes_temporadas t on t.competicao_id = c.id
where c.provider = 'manual'
  and c.codigo = 'CUSTOM'
  and t.nome = 'Temporada padrao'
  and (b.competicao_id is null or b.temporada_id is null);

update fases f
set
  temporada_id = coalesce(f.temporada_id, b.temporada_id),
  codigo = coalesce(
    f.codigo,
    upper(trim(both '_' from regexp_replace(coalesce(f.nome, 'FASE'), '[^[:alnum:]]+', '_', 'g')))
  ),
  tipo_fase = coalesce(f.tipo_fase, f.tipo, 'outro')
from boloes b
where f.bolao_id = b.id;

update partidas p
set
  competicao_id = coalesce(p.competicao_id, b.competicao_id),
  temporada_id = coalesce(p.temporada_id, b.temporada_id)
from boloes b
where p.bolao_id = b.id
  and (p.competicao_id is null or p.temporada_id is null);

update partidas p
set temporada_id = coalesce(p.temporada_id, f.temporada_id)
from fases f
where p.fase_id = f.id
  and p.temporada_id is null;

create index if not exists boloes_competicao_idx on boloes (competicao_id);
create index if not exists boloes_temporada_idx on boloes (temporada_id);
create index if not exists fases_temporada_idx on fases (temporada_id);
create index if not exists fases_provider_stage_idx on fases (temporada_id, provider_stage);
create index if not exists grupos_fase_idx on grupos (fase_id);
create index if not exists rodadas_fase_idx on rodadas (fase_id);
create index if not exists partidas_competicao_idx on partidas (competicao_id);
create index if not exists partidas_temporada_idx on partidas (temporada_id);
create index if not exists partidas_grupo_idx on partidas (grupo_id);
create index if not exists partidas_rodada_idx on partidas (rodada_id);

drop trigger if exists competicoes_set_updated_at on competicoes;
create trigger competicoes_set_updated_at
before update on competicoes
for each row execute function set_updated_at();

drop trigger if exists competicoes_temporadas_set_updated_at on competicoes_temporadas;
create trigger competicoes_temporadas_set_updated_at
before update on competicoes_temporadas
for each row execute function set_updated_at();

drop trigger if exists grupos_set_updated_at on grupos;
create trigger grupos_set_updated_at
before update on grupos
for each row execute function set_updated_at();

drop trigger if exists rodadas_set_updated_at on rodadas;
create trigger rodadas_set_updated_at
before update on rodadas
for each row execute function set_updated_at();

commit;
