alter type status_bolao add value if not exists 'finalizado';

update boloes
set status = 'finalizado'
where status::text in ('fechado', 'inativo');

alter table boloes
  alter column status set default 'ativo';
