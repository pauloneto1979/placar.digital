begin;

insert into email_templates (codigo, idioma, assunto, html, ativo, padrao_sistema)
values
  (
    'admin_vinculado_bolao',
    'pt-BR',
    'Você foi associado ao bolão {{nome_bolao}}',
    '<h1>Acesso administrativo liberado</h1><p>Olá, {{nome_admin}}.</p><p>Você foi associado como administrador do bolão <strong>{{nome_bolao}}</strong>.</p><p><strong>Responsável:</strong> {{responsavel}}</p><p><strong>Data/hora:</strong> {{data_hora}}</p><p><a class="cta" href="{{link}}">Acessar Placar.digital</a></p>',
    true,
    true
  ),
  (
    'admin_removido_bolao',
    'pt-BR',
    'Você foi removido do bolão {{nome_bolao}}',
    '<h1>Acesso administrativo removido</h1><p>Olá, {{nome_admin}}.</p><p>Seu vínculo administrativo com o bolão <strong>{{nome_bolao}}</strong> foi removido.</p><p><strong>Responsável:</strong> {{responsavel}}</p><p><strong>Data/hora:</strong> {{data_hora}}</p><p><a class="cta" href="{{link}}">Acessar Placar.digital</a></p>',
    true,
    true
  )
on conflict (codigo, idioma) do update
set assunto = excluded.assunto,
    html = excluded.html,
    ativo = true,
    padrao_sistema = true,
    updated_at = now();

commit;
