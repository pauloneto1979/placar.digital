alter table usuarios
  drop constraint if exists usuarios_perfil_sistema_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notificacoes_participante_bolao_fk'
  ) then
    alter table notificacoes
      add constraint notificacoes_participante_bolao_fk
      foreign key (participante_id, bolao_id)
      references participantes(id, bolao_id)
      on delete cascade;
  end if;
end;
$$;
