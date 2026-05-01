create table if not exists health_checks (
  id bigserial primary key,
  checked_at timestamptz not null default now(),
  source text not null default 'placar.digital'
);
