begin;

do $$
begin
  if exists (
    select 1
    from partidas
    where football_data_match_id is not null
    group by bolao_id, football_data_match_id
    having count(*) > 1
  ) then
    raise exception 'Existem partidas duplicadas com o mesmo football_data_match_id dentro do mesmo bolao. Corrija os dados antes de aplicar a migration 018.';
  end if;
end;
$$;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = current_schema()
      and t.relname = 'partidas'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) = 'UNIQUE (football_data_match_id)'
  loop
    execute format('alter table partidas drop constraint %I', constraint_name);
  end loop;
end;
$$;

do $$
declare
  index_name text;
begin
  for index_name in
    select i.relname
    from pg_index ix
    join pg_class t on t.oid = ix.indrelid
    join pg_class i on i.oid = ix.indexrelid
    join lateral unnest(ix.indkey) as key(attnum) on true
    join pg_attribute a on a.attrelid = t.oid and a.attnum = key.attnum
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = current_schema()
      and t.relname = 'partidas'
      and ix.indisunique = true
      and ix.indnatts = 1
      and a.attname = 'football_data_match_id'
  loop
    execute format('drop index if exists %I', index_name);
  end loop;
end;
$$;

drop index if exists partidas_football_data_match_id_unique;
drop index if exists partidas_football_data_match_id_idx;

create unique index if not exists partidas_bolao_football_data_match_id_unique
  on partidas (bolao_id, football_data_match_id)
  where football_data_match_id is not null;

create index if not exists partidas_football_data_match_id_idx
  on partidas (football_data_match_id)
  where football_data_match_id is not null;

commit;
