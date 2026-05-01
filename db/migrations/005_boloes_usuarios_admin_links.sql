begin;

create table if not exists boloes_usuarios (
  id uuid primary key default gen_random_uuid(),
  bolao_id uuid not null references boloes(id) on delete cascade,
  usuario_id uuid not null references usuarios(id) on delete restrict,
  perfil varchar(40) not null default 'administrador',
  ativo boolean not null default true,
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now(),
  constraint boloes_usuarios_bolao_usuario_unique unique (bolao_id, usuario_id),
  constraint boloes_usuarios_perfil_check check (perfil = 'administrador')
);

insert into boloes_usuarios (bolao_id, usuario_id, perfil, ativo, criado_at, atualizado_at)
select
  p.bolao_id,
  p.usuario_id,
  'administrador',
  p.status = 'ativo',
  p.criado_at,
  p.atualizado_at
from participantes p
join usuarios u on u.id = p.usuario_id
where p.papel = 'administrador'
  and u.perfil_global = 'administrador'
on conflict (bolao_id, usuario_id)
do update set
  ativo = excluded.ativo,
  atualizado_at = now();

create index if not exists boloes_usuarios_bolao_idx on boloes_usuarios (bolao_id);
create index if not exists boloes_usuarios_usuario_idx on boloes_usuarios (usuario_id);
create index if not exists boloes_usuarios_ativo_idx on boloes_usuarios (ativo);

drop trigger if exists boloes_usuarios_set_updated_at on boloes_usuarios;
create trigger boloes_usuarios_set_updated_at
before update on boloes_usuarios
for each row execute function set_updated_at();

commit;
