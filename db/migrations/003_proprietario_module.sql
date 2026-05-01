alter type status_bolao add value if not exists 'fechado';
alter type status_bolao add value if not exists 'inativo';

alter table boloes
  alter column status set default 'ativo';

alter table usuarios
  alter column perfil_global set default 'administrador';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'usuarios_perfil_sistema_check'
  ) then
    alter table usuarios
      add constraint usuarios_perfil_sistema_check
      check (perfil_global in ('proprietario', 'administrador'));
  end if;
end;
$$;
