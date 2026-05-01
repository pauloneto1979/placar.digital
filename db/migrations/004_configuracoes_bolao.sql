begin;

alter table regras_pontuacao
  add column if not exists codigo varchar(80),
  add column if not exists descricao text,
  add column if not exists prioridade integer not null default 0;

update regras_pontuacao
set codigo = upper(replace(nome, ' ', '_'))
where codigo is null;

alter table regras_pontuacao
  alter column codigo set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'regras_pontuacao_bolao_codigo_unique'
  ) then
    alter table regras_pontuacao
      add constraint regras_pontuacao_bolao_codigo_unique unique (bolao_id, codigo);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'regras_pontuacao_prioridade_check'
  ) then
    alter table regras_pontuacao
      add constraint regras_pontuacao_prioridade_check check (prioridade >= 0);
  end if;
end;
$$;

create table if not exists configuracoes_principais_bolao (
  id uuid primary key default gen_random_uuid(),
  bolao_id uuid not null references boloes(id) on delete cascade,
  minutos_antecedencia_aposta integer not null default 0,
  tipo_distribuicao_premio varchar(60) not null default 'percentual',
  observacoes_regras text,
  ativo boolean not null default true,
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now(),
  constraint configuracoes_principais_minutos_check check (minutos_antecedencia_aposta >= 0)
);

create unique index if not exists configuracoes_principais_bolao_ativa_unique
  on configuracoes_principais_bolao (bolao_id)
  where ativo = true;

create table if not exists criterios_desempate (
  id uuid primary key default gen_random_uuid(),
  bolao_id uuid not null references boloes(id) on delete cascade,
  codigo varchar(80) not null,
  descricao text not null,
  ordem integer not null,
  ativo boolean not null default true,
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now(),
  constraint criterios_desempate_ordem_check check (ordem > 0),
  constraint criterios_desempate_bolao_codigo_unique unique (bolao_id, codigo),
  constraint criterios_desempate_bolao_ordem_unique unique (bolao_id, ordem)
);

create table if not exists distribuicao_premios (
  id uuid primary key default gen_random_uuid(),
  bolao_id uuid not null references boloes(id) on delete cascade,
  posicao integer not null,
  percentual numeric(5,2) not null,
  descricao text,
  ativo boolean not null default true,
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now(),
  constraint distribuicao_premios_posicao_check check (posicao > 0),
  constraint distribuicao_premios_percentual_check check (percentual >= 0 and percentual <= 100),
  constraint distribuicao_premios_bolao_posicao_unique unique (bolao_id, posicao)
);

create index if not exists configuracoes_principais_bolao_idx on configuracoes_principais_bolao (bolao_id);
create index if not exists criterios_desempate_bolao_idx on criterios_desempate (bolao_id);
create index if not exists distribuicao_premios_bolao_idx on distribuicao_premios (bolao_id);

drop trigger if exists regras_pontuacao_set_updated_at on regras_pontuacao;
create trigger regras_pontuacao_set_updated_at
before update on regras_pontuacao
for each row execute function set_updated_at();

drop trigger if exists configuracoes_principais_bolao_set_updated_at on configuracoes_principais_bolao;
create trigger configuracoes_principais_bolao_set_updated_at
before update on configuracoes_principais_bolao
for each row execute function set_updated_at();

drop trigger if exists criterios_desempate_set_updated_at on criterios_desempate;
create trigger criterios_desempate_set_updated_at
before update on criterios_desempate
for each row execute function set_updated_at();

drop trigger if exists distribuicao_premios_set_updated_at on distribuicao_premios;
create trigger distribuicao_premios_set_updated_at
before update on distribuicao_premios
for each row execute function set_updated_at();

commit;
