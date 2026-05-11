begin;

update email_templates
set
  assunto = 'Convite para participar do bolão {{nome_bolao}}',
  html = '<h1>Você foi convidado para o {{nome_bolao}}</h1><p>Olá, {{nome_apostador}}.</p><p>Use o botão abaixo para ativar sua conta e definir sua senha.</p><p><a class="cta" href="{{link}}">Ativar conta</a></p>'
where codigo = 'convite_bolao'
  and idioma = 'pt-BR';

update email_templates
set
  assunto = 'Ative sua conta no Placar.digital',
  html = '<h1>Ativação de conta</h1><p>Olá, {{nome_usuario}}.</p><p>Defina sua senha para acessar o Placar.digital.</p><p><a class="cta" href="{{link}}">Definir senha</a></p>'
where codigo = 'ativacao_conta'
  and idioma = 'pt-BR';

update email_templates
set
  assunto = 'Redefinição de senha do Placar.digital',
  html = '<h1>Redefinição de senha</h1><p>Olá, {{nome_usuario}}.</p><p>Recebemos uma solicitação para redefinir sua senha. O link expira em 30 minutos.</p><p><a class="cta" href="{{link}}">Redefinir senha</a></p>'
where codigo = 'recuperacao_senha'
  and idioma = 'pt-BR';

update email_templates
set
  assunto = 'Pagamento confirmado no bolão {{nome_bolao}}',
  html = '<h1>Pagamento confirmado</h1><p>Olá, {{nome_apostador}}.</p><p>Seu pagamento no bolão <strong>{{nome_bolao}}</strong> foi confirmado.</p><p><strong>Valor:</strong> {{valor}}</p><p><strong>Data:</strong> {{data_pagamento}}</p>'
where codigo = 'pagamento_confirmado'
  and idioma = 'pt-BR';

commit;
