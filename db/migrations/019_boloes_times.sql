begin;

create table if not exists boloes_times (
  id uuid primary key default gen_random_uuid(),
  bolao_id uuid not null references boloes(id) on delete cascade,
  time_id uuid not null references times(id) on delete cascade,
  criado_at timestamptz not null default now(),
  atualizado_at timestamptz not null default now(),
  constraint boloes_times_bolao_time_unique unique (bolao_id, time_id)
);

create index if not exists boloes_times_bolao_idx on boloes_times (bolao_id);
create index if not exists boloes_times_time_idx on boloes_times (time_id);

insert into boloes_times (bolao_id, time_id)
select b.id, t.id
from boloes b
cross join times t
where not exists (
  select 1
  from boloes_times bt
  where bt.bolao_id = b.id
    and bt.time_id = t.id
);

drop trigger if exists boloes_times_set_updated_at on boloes_times;
create trigger boloes_times_set_updated_at
before update on boloes_times
for each row execute function set_updated_at();

commit;
