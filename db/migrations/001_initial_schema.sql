begin;

create extension if not exists pgcrypto;

create type perfil_global_usuario as enum (
  'proprietario',
  'administrador',
  'apostador'
);

create type papel_participante as enum (
  'proprietario',
  'administrador',
  'apostador'
);

create type status_bolao as enum (
  'rascunho',
  'ativo',
  'encerrado',
  'cancelado'
);

create type status_participante as enum (
  'convidado',
  'ativo',
  'bloqueado',
  'removido'
);

create type status_fase as enum (
  'pendente',
  'ativa',
  'encerrada'
);

create type status_partida as enum (
  'agendada',
  'em_andamento',
  'encerrada',
  'cancelada'
);

create type status_aposta as enum (
  'registrada',
  'bloqueada',
  'calculada',
  'cancelada'
);

create type tipo_regra_pontuacao as enum (
  'placar_exato',
  'resultado',
  'gols_time',
  'empate',
  'vencedor',
  'bonus'
);

create type status_pagamento as enum (
  'pendente',
  'pago',
  'vencido',
  'cancelado',
  'estornado'
);

create type metodo_pagamento as enum (
  'pix',
  'dinheiro',
  'cartao',
  'transferencia',
  'outro'
);

create type tipo_notificacao as enum (
  'sistema',
  'bolao',
  'pagamento',
  'aposta',
  'ranking'
);

create type canal_notificacao as enum (
  'email',
  'whatsapp',
  'push',
  'interno'
);

create type status_notificacao as enum (
  'pendente',
  'enviada',
  'falhou',
  'lida'
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.atualizado_at = now();
  return new;
end;
$$ language plpgsql;

create table usuarios (
  id uuid primary key default gen_random_uuid(),
  nome varchar(160) not null,
  email varchar(255) not null,
  senha_hash varchar(255) not null,
  telefone varchar(30),
  perfil_global perfil_global_usuario not null default 'apostador',
  ativo boolean not null default true,
  ultimo_login_at timestamptz,
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now(),
  constraint usuarios_email_unique unique (email)
);

create table boloes (
  id uuid primary key default gen_random_uuid(),
  proprietario_id uuid not null references usuarios(id) on delete restrict,
  nome varchar(160) not null,
  slug varchar(180) not null,
  descricao text,
  status status_bolao not null default 'rascunho',
  tipo_esporte varchar(80) not null,
  data_inicio timestamptz,
  data_fim timestamptz,
  valor_participacao numeric(12,2) not null default 0,
  ativo boolean not null default true,
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now(),
  constraint boloes_slug_unique unique (slug),
  constraint boloes_valor_participacao_check check (valor_participacao >= 0),
  constraint boloes_datas_check check (data_fim is null or data_inicio is null or data_fim >= data_inicio)
);

create table participantes (
  id uuid primary key default gen_random_uuid(),
  bolao_id uuid not null references boloes(id) on delete cascade,
  usuario_id uuid not null references usuarios(id) on delete restrict,
  papel papel_participante not null default 'apostador',
  status status_participante not null default 'convidado',
  apelido varchar(120),
  aceitou_termos_at timestamptz,
  entrou_at timestamptz not null default now(),
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now(),
  constraint participantes_bolao_usuario_unique unique (bolao_id, usuario_id),
  constraint participantes_id_bolao_unique unique (id, bolao_id)
);

create table configuracoes_gerais (
  id uuid primary key default gen_random_uuid(),
  chave varchar(160) not null,
  valor jsonb not null default '{}'::jsonb,
  descricao text,
  ativo boolean not null default true,
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now(),
  constraint configuracoes_gerais_chave_unique unique (chave)
);

create table configuracoes_bolao (
  id uuid primary key default gen_random_uuid(),
  bolao_id uuid not null references boloes(id) on delete cascade,
  chave varchar(160) not null,
  valor jsonb not null default '{}'::jsonb,
  descricao text,
  ativo boolean not null default true,
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now(),
  constraint configuracoes_bolao_chave_unique unique (bolao_id, chave)
);

create table regras_pontuacao (
  id uuid primary key default gen_random_uuid(),
  bolao_id uuid not null references boloes(id) on delete cascade,
  nome varchar(160) not null,
  tipo tipo_regra_pontuacao not null,
  pontos integer not null,
  criterios jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now(),
  constraint regras_pontuacao_pontos_check check (pontos >= 0),
  constraint regras_pontuacao_ordem_check check (ordem >= 0)
);

create table fases (
  id uuid primary key default gen_random_uuid(),
  bolao_id uuid not null references boloes(id) on delete cascade,
  nome varchar(160) not null,
  ordem integer not null default 0,
  status status_fase not null default 'pendente',
  inicio_at timestamptz,
  fim_at timestamptz,
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now(),
  constraint fases_ordem_check check (ordem >= 0),
  constraint fases_datas_check check (fim_at is null or inicio_at is null or fim_at >= inicio_at),
  constraint fases_bolao_ordem_unique unique (bolao_id, ordem),
  constraint fases_id_bolao_unique unique (id, bolao_id)
);

create table times (
  id uuid primary key default gen_random_uuid(),
  nome varchar(160) not null,
  sigla varchar(12),
  escudo_url text,
  pais varchar(100),
  ativo boolean not null default true,
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now(),
  constraint times_nome_unique unique (nome)
);

create table partidas (
  id uuid primary key default gen_random_uuid(),
  bolao_id uuid not null references boloes(id) on delete cascade,
  fase_id uuid,
  time_mandante_id uuid not null references times(id) on delete restrict,
  time_visitante_id uuid not null references times(id) on delete restrict,
  inicio_at timestamptz not null,
  status status_partida not null default 'agendada',
  placar_mandante integer,
  placar_visitante integer,
  resultado_confirmado boolean not null default false,
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now(),
  constraint partidas_times_diferentes_check check (time_mandante_id <> time_visitante_id),
  constraint partidas_placar_mandante_check check (placar_mandante is null or placar_mandante >= 0),
  constraint partidas_placar_visitante_check check (placar_visitante is null or placar_visitante >= 0),
  constraint partidas_id_bolao_unique unique (id, bolao_id),
  constraint partidas_fase_bolao_fk foreign key (fase_id, bolao_id) references fases(id, bolao_id) on delete restrict
);

create table apostas (
  id uuid primary key default gen_random_uuid(),
  bolao_id uuid not null references boloes(id) on delete cascade,
  participante_id uuid not null references participantes(id) on delete cascade,
  partida_id uuid not null references partidas(id) on delete cascade,
  placar_mandante integer not null,
  placar_visitante integer not null,
  pontos_calculados integer not null default 0,
  status status_aposta not null default 'registrada',
  registrada_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now(),
  constraint apostas_participante_partida_unique unique (participante_id, partida_id),
  constraint apostas_placar_mandante_check check (placar_mandante >= 0),
  constraint apostas_placar_visitante_check check (placar_visitante >= 0),
  constraint apostas_pontos_calculados_check check (pontos_calculados >= 0),
  constraint apostas_participante_bolao_fk foreign key (participante_id, bolao_id) references participantes(id, bolao_id) on delete cascade,
  constraint apostas_partida_bolao_fk foreign key (partida_id, bolao_id) references partidas(id, bolao_id) on delete cascade
);

create table ranking (
  id uuid primary key default gen_random_uuid(),
  bolao_id uuid not null references boloes(id) on delete cascade,
  participante_id uuid not null references participantes(id) on delete cascade,
  pontos_total integer not null default 0,
  apostas_total integer not null default 0,
  acertos_exatos integer not null default 0,
  acertos_resultado integer not null default 0,
  posicao integer,
  atualizado_at timestamptz not null default now(),
  constraint ranking_bolao_participante_unique unique (bolao_id, participante_id),
  constraint ranking_pontos_total_check check (pontos_total >= 0),
  constraint ranking_apostas_total_check check (apostas_total >= 0),
  constraint ranking_acertos_exatos_check check (acertos_exatos >= 0),
  constraint ranking_acertos_resultado_check check (acertos_resultado >= 0),
  constraint ranking_posicao_check check (posicao is null or posicao > 0),
  constraint ranking_participante_bolao_fk foreign key (participante_id, bolao_id) references participantes(id, bolao_id) on delete cascade
);

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  bolao_id uuid not null references boloes(id) on delete cascade,
  participante_id uuid not null references participantes(id) on delete restrict,
  valor numeric(12,2) not null,
  moeda varchar(3) not null default 'BRL',
  status status_pagamento not null default 'pendente',
  metodo metodo_pagamento not null default 'pix',
  referencia_externa varchar(255),
  vencimento_at timestamptz,
  pago_at timestamptz,
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now(),
  constraint pagamentos_valor_check check (valor >= 0),
  constraint pagamentos_moeda_check check (char_length(moeda) = 3),
  constraint pagamentos_participante_bolao_fk foreign key (participante_id, bolao_id) references participantes(id, bolao_id) on delete restrict
);

create table notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id) on delete set null,
  bolao_id uuid references boloes(id) on delete cascade,
  tipo tipo_notificacao not null,
  canal canal_notificacao not null,
  titulo varchar(180) not null,
  mensagem text not null,
  status status_notificacao not null default 'pendente',
  payload jsonb,
  enviada_at timestamptz,
  lida_at timestamptz,
  criado_at timestamptz not null default now()
);

create table auditoria_logs (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id) on delete set null,
  bolao_id uuid references boloes(id) on delete cascade,
  entidade varchar(120) not null,
  entidade_id uuid,
  acao varchar(160) not null,
  dados_anteriores jsonb,
  dados_novos jsonb,
  ip varchar(45),
  user_agent text,
  criado_at timestamptz not null default now()
);

create index usuarios_email_idx on usuarios (email);
create index boloes_proprietario_idx on boloes (proprietario_id);
create index participantes_bolao_idx on participantes (bolao_id);
create index participantes_usuario_idx on participantes (usuario_id);
create index configuracoes_bolao_bolao_idx on configuracoes_bolao (bolao_id);
create index regras_pontuacao_bolao_idx on regras_pontuacao (bolao_id);
create index fases_bolao_idx on fases (bolao_id);
create index partidas_bolao_idx on partidas (bolao_id);
create index partidas_fase_idx on partidas (fase_id);
create index partidas_inicio_idx on partidas (inicio_at);
create index apostas_bolao_idx on apostas (bolao_id);
create index apostas_partida_idx on apostas (partida_id);
create index ranking_bolao_posicao_idx on ranking (bolao_id, posicao);
create index pagamentos_bolao_idx on pagamentos (bolao_id);
create index pagamentos_participante_idx on pagamentos (participante_id);
create index pagamentos_status_idx on pagamentos (status);
create index notificacoes_usuario_idx on notificacoes (usuario_id);
create index notificacoes_bolao_idx on notificacoes (bolao_id);
create index notificacoes_status_idx on notificacoes (status);
create index auditoria_logs_usuario_idx on auditoria_logs (usuario_id);
create index auditoria_logs_bolao_idx on auditoria_logs (bolao_id);
create index auditoria_logs_entidade_idx on auditoria_logs (entidade, entidade_id);
create index auditoria_logs_criado_at_idx on auditoria_logs (criado_at);

create trigger usuarios_set_updated_at
before update on usuarios
for each row execute function set_updated_at();

create trigger boloes_set_updated_at
before update on boloes
for each row execute function set_updated_at();

create trigger participantes_set_updated_at
before update on participantes
for each row execute function set_updated_at();

create trigger configuracoes_gerais_set_updated_at
before update on configuracoes_gerais
for each row execute function set_updated_at();

create trigger configuracoes_bolao_set_updated_at
before update on configuracoes_bolao
for each row execute function set_updated_at();

create trigger regras_pontuacao_set_updated_at
before update on regras_pontuacao
for each row execute function set_updated_at();

create trigger fases_set_updated_at
before update on fases
for each row execute function set_updated_at();

create trigger times_set_updated_at
before update on times
for each row execute function set_updated_at();

create trigger partidas_set_updated_at
before update on partidas
for each row execute function set_updated_at();

create trigger apostas_set_updated_at
before update on apostas
for each row execute function set_updated_at();

create trigger ranking_set_updated_at
before update on ranking
for each row execute function set_updated_at();

create trigger pagamentos_set_updated_at
before update on pagamentos
for each row execute function set_updated_at();

commit;
