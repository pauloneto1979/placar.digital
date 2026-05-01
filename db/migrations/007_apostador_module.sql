alter type status_aposta add value if not exists 'aberta';
alter type status_aposta add value if not exists 'travada';

alter table apostas
  alter column status set default 'aberta';

create index if not exists apostas_participante_status_idx on apostas (participante_id, status);
create index if not exists apostas_bolao_participante_idx on apostas (bolao_id, participante_id);
