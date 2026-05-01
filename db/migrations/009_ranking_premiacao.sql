alter table ranking
  add column if not exists acertos_invertidos integer not null default 0,
  add column if not exists diferenca_gols_total integer not null default 0,
  add column if not exists ordem_pagamento timestamptz,
  add column if not exists premio_previsto numeric(12,2) not null default 0;

alter table ranking
  drop constraint if exists ranking_acertos_invertidos_check,
  add constraint ranking_acertos_invertidos_check check (acertos_invertidos >= 0);

alter table ranking
  drop constraint if exists ranking_diferenca_gols_total_check,
  add constraint ranking_diferenca_gols_total_check check (diferenca_gols_total >= 0);

alter table ranking
  drop constraint if exists ranking_premio_previsto_check,
  add constraint ranking_premio_previsto_check check (premio_previsto >= 0);

create index if not exists ranking_bolao_pontos_idx on ranking (bolao_id, pontos_total desc, posicao);
