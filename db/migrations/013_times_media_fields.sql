alter table times
  add column if not exists bandeira_url text,
  add column if not exists codigo_fifa varchar(12);

update times
set codigo_fifa = nullif(trim(sigla), '')
where codigo_fifa is null
  and sigla is not null;
