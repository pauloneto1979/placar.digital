alter table times
  add column if not exists football_data_team_id varchar(80);

create unique index if not exists times_football_data_team_id_unique_idx
  on times (football_data_team_id)
  where football_data_team_id is not null;

create index if not exists times_codigo_fifa_idx
  on times (codigo_fifa)
  where codigo_fifa is not null;
