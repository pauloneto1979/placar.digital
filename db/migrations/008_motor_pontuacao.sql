create table if not exists pontuacoes_apostas (
  id uuid primary key default gen_random_uuid(),
  bolao_id uuid not null references boloes(id) on delete cascade,
  partida_id uuid not null references partidas(id) on delete cascade,
  participante_id uuid not null references participantes(id) on delete cascade,
  aposta_id uuid not null references apostas(id) on delete cascade,
  regra_pontuacao_id uuid references regras_pontuacao(id) on delete set null,
  codigo_regra_aplicada varchar(80),
  pontos integer not null default 0,
  calculado_em timestamptz not null default now(),
  constraint pontuacoes_apostas_unique unique (aposta_id)
);

create index if not exists pontuacoes_apostas_bolao_idx on pontuacoes_apostas (bolao_id);
create index if not exists pontuacoes_apostas_partida_idx on pontuacoes_apostas (partida_id);
create index if not exists pontuacoes_apostas_participante_idx on pontuacoes_apostas (participante_id);
