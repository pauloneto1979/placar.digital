alter type metodo_pagamento add value if not exists 'manual';

alter type status_partida add value if not exists 'finalizada';
alter type status_partida add value if not exists 'inativa';

alter table participantes
  alter column usuario_id drop not null,
  add column if not exists nome varchar(160),
  add column if not exists email varchar(255),
  add column if not exists telefone varchar(30);

update participantes p
set
  nome = coalesce(p.nome, u.nome),
  email = coalesce(p.email, u.email),
  telefone = coalesce(p.telefone, u.telefone)
from usuarios u
where p.usuario_id = u.id;

alter table participantes
  alter column nome set not null,
  alter column email set not null;

create unique index if not exists participantes_bolao_email_unique_idx
  on participantes (bolao_id, lower(email));

alter table fases
  add column if not exists tipo varchar(40) not null default 'outro',
  add column if not exists ativo boolean not null default true;

alter table partidas
  add column if not exists estadio varchar(160),
  add column if not exists ativo boolean not null default true;

alter table pagamentos
  add column if not exists observacao text;

create index if not exists participantes_bolao_email_idx on participantes (bolao_id, email);
create index if not exists fases_bolao_tipo_idx on fases (bolao_id, tipo);
create index if not exists times_ativo_idx on times (ativo);
create index if not exists partidas_bolao_status_idx on partidas (bolao_id, status);
