alter type tipo_notificacao add value if not exists 'JOGO_VAI_COMECAR';
alter type tipo_notificacao add value if not exists 'APOSTA_ENCERRANDO';
alter type tipo_notificacao add value if not exists 'RESULTADO_LANCADO';
alter type tipo_notificacao add value if not exists 'RANKING_ATUALIZADO';
alter type tipo_notificacao add value if not exists 'PAGAMENTO_CONFIRMADO';

alter type canal_notificacao add value if not exists 'sistema';

alter type status_notificacao add value if not exists 'erro';
alter type status_notificacao add value if not exists 'cancelada';
alter type status_notificacao add value if not exists 'enviada_sistema';

alter table notificacoes
  add column if not exists participante_id uuid references participantes(id) on delete cascade,
  add column if not exists data_agendada timestamptz,
  add column if not exists data_envio timestamptz,
  add column if not exists erro text,
  add column if not exists criado_em timestamptz not null default now();

update notificacoes
set criado_em = criado_at
where criado_em is null and criado_at is not null;

update notificacoes
set data_envio = enviada_at
where data_envio is null and enviada_at is not null;

create index if not exists notificacoes_bolao_participante_idx on notificacoes (bolao_id, participante_id);
create index if not exists notificacoes_bolao_usuario_idx on notificacoes (bolao_id, usuario_id);
create index if not exists notificacoes_bolao_status_idx on notificacoes (bolao_id, status);
