alter table partidas
  add column if not exists football_data_match_id varchar(80);

create index if not exists partidas_football_data_match_id_idx
  on partidas (football_data_match_id)
  where football_data_match_id is not null;
