begin;

create table if not exists email_configuracoes (
  id uuid primary key default gen_random_uuid(),
  smtp_host varchar(255) not null,
  smtp_port integer not null,
  smtp_secure boolean not null default false,
  smtp_user varchar(255) not null,
  smtp_password text,
  smtp_from_name varchar(255) not null,
  smtp_from_email varchar(255) not null,
  smtp_reply_to varchar(255),
  smtp_enabled boolean not null default false,
  provider_name varchar(80) not null default 'hostgator',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_configuracoes_port_check check (smtp_port between 1 and 65535),
  constraint email_configuracoes_from_email_check check (smtp_from_email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  constraint email_configuracoes_reply_to_check check (smtp_reply_to is null or smtp_reply_to = '' or smtp_reply_to ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
);

create index if not exists email_configuracoes_enabled_idx on email_configuracoes (smtp_enabled);

create or replace function set_email_configuracoes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists email_configuracoes_set_updated_at on email_configuracoes;
create trigger email_configuracoes_set_updated_at
before update on email_configuracoes
for each row execute procedure set_email_configuracoes_updated_at();

commit;
