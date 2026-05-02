alter table pagamentos
  add column if not exists gateway varchar(40),
  add column if not exists order_nsu varchar(120),
  add column if not exists checkout_url text,
  add column if not exists status_gateway varchar(80),
  add column if not exists webhook_payload jsonb;

create unique index if not exists pagamentos_order_nsu_unique_idx
  on pagamentos (order_nsu)
  where order_nsu is not null;

create index if not exists pagamentos_gateway_status_idx
  on pagamentos (gateway, status_gateway);
