begin;

alter table email_configuracoes
  drop constraint if exists email_configuracoes_from_email_check;

alter table email_configuracoes
  drop constraint if exists email_configuracoes_reply_to_check;

alter table email_configuracoes
  add constraint email_configuracoes_from_email_check
  check (smtp_from_email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$');

alter table email_configuracoes
  add constraint email_configuracoes_reply_to_check
  check (
    smtp_reply_to is null
    or smtp_reply_to = ''
    or smtp_reply_to ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  );

commit;
