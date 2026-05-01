begin;

create unique index if not exists usuarios_email_lower_unique_idx on usuarios (lower(email));

commit;
