begin;

create table if not exists auth_tokens (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  tipo varchar(40) not null,
  token varchar(128) not null,
  expiracao timestamptz not null,
  utilizado_em timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint auth_tokens_tipo_check check (tipo in ('convite', 'ativacao', 'recuperacao_senha')),
  constraint auth_tokens_expiracao_check check (expiracao > created_at),
  constraint auth_tokens_token_unique unique (token)
);

create index if not exists auth_tokens_usuario_idx on auth_tokens (usuario_id);
create index if not exists auth_tokens_tipo_token_idx on auth_tokens (tipo, token);
create index if not exists auth_tokens_expiracao_idx on auth_tokens (expiracao);

create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  codigo varchar(80) not null,
  idioma varchar(10) not null default 'pt-BR',
  assunto varchar(180) not null,
  html text not null,
  ativo boolean not null default true,
  padrao_sistema boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_templates_codigo_idioma_unique unique (codigo, idioma)
);

alter table notificacoes
  add column if not exists tipo_evento varchar(80),
  add column if not exists destinatario varchar(255),
  add column if not exists assunto varchar(180),
  add column if not exists erro text,
  add column if not exists tentativas integer not null default 0;

create index if not exists notificacoes_tipo_evento_idx on notificacoes (tipo_evento);
create index if not exists notificacoes_destinatario_idx on notificacoes (destinatario);

insert into email_templates (codigo, idioma, assunto, html, ativo, padrao_sistema)
values
  (
    'convite_bolao',
    'pt-BR',
    'Convite para participar do bolão {{nome_bolao}}',
    '<h1>Você foi convidado para o {{nome_bolao}}</h1><p>Olá, {{nome_apostador}}.</p><p>Use o botão abaixo para ativar sua conta e definir sua senha.</p><p><a class="cta" href="{{link}}">Ativar conta</a></p>',
    true,
    true
  ),
  (
    'ativacao_conta',
    'pt-BR',
    'Ative sua conta no Placar.digital',
    '<h1>Ativação de conta</h1><p>Olá, {{nome_usuario}}.</p><p>Defina sua senha para acessar o Placar.digital.</p><p><a class="cta" href="{{link}}">Definir senha</a></p>',
    true,
    true
  ),
  (
    'recuperacao_senha',
    'pt-BR',
    'Redefinição de senha do Placar.digital',
    '<h1>Redefinição de senha</h1><p>Olá, {{nome_usuario}}.</p><p>Recebemos uma solicitação para redefinir sua senha. O link expira em 30 minutos.</p><p><a class="cta" href="{{link}}">Redefinir senha</a></p>',
    true,
    true
  ),
  (
    'pagamento_confirmado',
    'pt-BR',
    'Pagamento confirmado no bolão {{nome_bolao}}',
    '<h1>Pagamento confirmado</h1><p>Olá, {{nome_apostador}}.</p><p>Seu pagamento no bolão <strong>{{nome_bolao}}</strong> foi confirmado.</p><p><strong>Valor:</strong> {{valor}}</p><p><strong>Data:</strong> {{data_pagamento}}</p>',
    true,
    true
  )
on conflict (codigo, idioma) do nothing;

commit;
