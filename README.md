# Placar.digital

Placar.digital é um sistema SaaS de bolão esportivo multi-bolões, com app web unificado, API Node.js/Express e banco PostgreSQL. O projeto atende três perfis principais:

- **Proprietário**: acesso total à plataforma.
- **Administrador**: operação dos bolões aos quais está vinculado.
- **Apostador**: acesso ao bolão por vínculo de participante.

O sistema já possui autenticação por e-mail, seleção de bolão, administração operacional, apostas, pontuação, ranking, premiação, pagamentos, notificações, integração InfinitePay preparada, integração football-data.org, configuração SMTP via tela administrativa e interface mobile-first com tema premium dark/neon.

## 1. Visão Geral

Funcionalidades implementadas:

- App unificado em `public/app.html`, com navegação por permissões.
- Login em `public/login.html`.
- Seleção pós-login de bolão em `public/selecao-bolao.html`.
- Multilíngue com `pt-BR`, `en-US` e `es-ES`.
- Dashboard premium do bolão com cards de desempenho, próximos jogos, últimos resultados e top 3.
- Ranking premium responsivo com medalhas, destaque do usuário logado, critérios principais e prêmio estimado.
- Cadastro e gestão de bolões.
- Cadastro e gestão de usuários administrativos.
- Vínculo administrador ↔ bolão pela tabela `boloes_usuarios`.
- Cadastro de participantes/apostadores com criação/vínculo de credencial de login.
- Fases, times, partidas, pagamentos, apostas, regras, ranking e notificações.
- Upload/URL de brasão dos times, com preview, fallback visual e validação.
- Times vinculados por bolão; novos bolões começam sem times e recebem times por cadastro manual ou importação.
- Importação de partidas externas pela tela de Partidas.
- Sincronização automática de partidas vinculadas com football-data.org.
- Status de atualização exibido no dashboard/partidas a partir da última sincronização do provider.
- Configuração sanitizada de provedores esportivos.
- Configuração SMTP via tela administrativa.

## 2. Arquitetura

Stack atual:

- Node.js
- Express
- PostgreSQL
- Frontend estático em HTML/CSS/JavaScript
- PM2 em ambiente de publicação atual
- Integrações externas preparadas:
  - football-data.org
  - InfinitePay Checkout
  - SMTP via Nodemailer

Estrutura principal:

```text
app.js
db/migrations
db/schema.sql
public/app.html
public/app.js
public/login.html
public/login.js
public/selecao-bolao.html
public/selecao-bolao.js
public/theme.css
public/i18n
src/config
src/http
src/modules
src/shared
```

Módulos principais em `src/modules`:

- `auth`
- `proprietario`
- `usuarios`
- `boloes`
- `participantes`
- `fases`
- `times`
- `partidas`
- `apostas`
- `ranking`
- `pagamentos`
- `configuracoes_bolao`
- `configuracoes_gerais`
- `notificacoes`
- `auditoria`
- `provedores_esportivos`
- `email`

## Estrutura esportiva multicampeonato

O modelo esportivo evoluiu para suportar bolões de múltiplos campeonatos sem remover a estrutura antiga.

Hierarquia atual:

```text
Competição
→ Temporada
→ Fase
→ Grupo opcional
→ Rodada opcional
→ Partidas
```

Tabelas principais:

- `competicoes`: cadastro reutilizável de campeonatos, com provider/código externo quando existir.
- `competicoes_temporadas`: temporada/edição da competição, como Copa do Mundo 2026 ou Brasileirão 2026.
- `fases`: permanece compatível com bolões existentes e passa a aceitar `temporada_id`, `codigo`, `tipo_fase` e `provider_stage`.
- `grupos`: grupos opcionais por fase.
- `rodadas`: rodadas/matchdays opcionais por fase.
- `partidas`: passa a referenciar `competicao_id`, `temporada_id`, `fase_id`, `grupo_id` e `rodada_id`.

Compatibilidade:

- Bolões antigos recebem backfill para `Competição personalizada` e `Temporada padrão`.
- Campos antigos continuam coexistindo.
- O motor de pontuação e o ranking não foram alterados.
- A importação football-data cria ou reutiliza competição, temporada, fase, grupo e rodada automaticamente quando esses dados vêm do provider.

## 3. Perfis e Permissões

### Proprietário

- Acesso total à plataforma.
- Pode criar e alterar bolões.
- Pode criar e alterar usuários proprietários/administradores.
- Pode vincular administradores a bolões.
- Pode acessar Configurações.
- Pode configurar provedores esportivos.
- Pode configurar SMTP/e-mail.
- Pode administrar qualquer bolão sem vínculo administrativo.

### Administrador

- É usuário de sistema.
- Acessa apenas bolões vinculados em `boloes_usuarios`.
- Pode operar participantes, pagamentos, fases, times, partidas, regras, importação externa e ranking nos bolões vinculados.
- Não deve usar a tabela de participantes para validar permissão administrativa.
- Não acessa configurações globais.

### Apostador

- É usuário com `perfil_global = apostador`.
- Acesso ocorre por vínculo com participante.
- O token final contém `bolaoId`, `papel = apostador` e `participanteId`.
- Visualiza jogos, regras, ranking, notificações e suas apostas.
- Não acessa módulos administrativos.

## 4. Frontend/App

O frontend ativo é o app unificado:

- `/app/app.html`
- `/app/login.html`
- `/app/selecao-bolao.html`

Arquivos principais:

- `public/app.js`: app unificado, navegação, telas e integrações frontend.
- `public/theme.css`: tema global dark/neon mobile-first.
- `public/i18n/i18n.js`: camada de tradução.
- `public/i18n/pt-BR.json`
- `public/i18n/en-US.json`
- `public/i18n/es-ES.json`

Características visuais:

- Tema premium dark/neon.
- Layout mobile-first.
- Menu unificado por permissões.
- Controles superiores compactos para idioma, perfil e logout.
- Seletor de bolão ativo.
- Cards responsivos.
- Botões em padrão glass/premium.
- Top 3 responsivo.
- Ranking em cards/lista moderna.
- Upload premium de brasão.

Arquivos legados como `proprietario.html`, `administrador.html` e `apostador.html`, quando existirem, não representam o fluxo principal atual.

## 5. Autenticação

Rotas principais:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/selecionar-bolao`
- `POST /api/v1/auth/trocar-bolao`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/meu-perfil`
- `PUT /api/v1/auth/meu-perfil`
- `PUT /api/v1/auth/minha-senha`

Fluxo:

1. Usuário informa credenciais.
2. Se proprietário, pode acessar a plataforma com visão global.
3. Se administrador com um bolão, o bolão pode ser selecionado automaticamente.
4. Se administrador com múltiplos bolões, seleciona bolão após login.
5. Se apostador com um vínculo de participante, recebe token final com `bolaoId` e `participanteId`.
6. Se apostador com múltiplos vínculos, escolhe o bolão após login.

Política de senha:

- Proprietário e administrador:
  - mínimo de 8 caracteres;
  - ao menos 1 letra maiúscula;
  - ao menos 1 letra minúscula;
  - ao menos 1 número;
  - não exige caractere especial.
- Apostador:
  - senha obrigatória;
  - sem política rígida de complexidade.

## 6. Bolões

Bolões são a unidade principal de isolamento do sistema.

Campos principais:

- nome
- descrição
- data início
- data fim
- status
- valor de participação, quando aplicável

Ao criar bolão, o sistema cria configurações padrão quando previsto pelo fluxo atual:

- regras de pontuação padrão;
- critérios de desempate padrão;
- distribuição de premiação padrão.

O vínculo administrador ↔ bolão é feito em `boloes_usuarios`.

## 7. Apostas

Rotas principais:

- `GET /api/v1/apostas/boloes/:bolaoId/dashboard`
- `GET /api/v1/apostas/boloes/:bolaoId/jogos`
- `POST /api/v1/apostas/boloes/:bolaoId`
- `PUT /api/v1/apostas/boloes/:bolaoId`
- `GET /api/v1/apostas/boloes/:bolaoId/minhas`
- `GET /api/v1/apostas/boloes/:bolaoId/regras`

Regras principais:

- Uma aposta por participante por partida.
- Apostador só aposta no bolão selecionado.
- Aposta respeita o prazo configurado em `minutos_antecedencia_aposta`.
- Partidas finalizadas, canceladas ou inativas não aceitam aposta.
- A tela recarrega o palpite salvo após gravação.

## 8. Ranking

Rotas principais:

- `GET /api/v1/ranking/boloes/:bolaoId/atual`
- `GET /api/v1/ranking/boloes/:bolaoId/provisorio`
- `GET /api/v1/ranking/boloes/:bolaoId/meu`
- `GET /api/v1/ranking/boloes/:bolaoId/premiacao`
- `GET /api/v1/ranking/boloes/:bolaoId/regras`
- `POST /api/v1/ranking/boloes/:bolaoId/recalcular`
- `POST /api/v1/ranking/boloes/:bolaoId/partidas/:partidaId/recalcular`

Estado atual:

- A leitura do ranking é somente leitura.
- `GET /ranking/boloes/:bolaoId/atual` não recalcula nem grava no banco.
- O recálculo ocorre ao informar/alterar resultado relevante de partida ou pelos endpoints POST de recálculo.
- Pontuação não cumulativa:
  - aplica a regra de maior prioridade;
  - em empate, maior pontuação.
- Ranking considera pontos, acertos, diferença de gols, ordem de pagamento e ordem alfabética conforme critérios configurados.
- Premiação prevista é calculada com base nos pagamentos pagos e na distribuição ativa.

## 9. Football-Data.org

Integração implementada:

- Configuração do provider em `provedores_dados_esportivos`.
- Provider inicial: `football-data`.
- Job automático a cada 1 minuto.
- Respeita `sync_interval_seconds`, nunca abaixo de 60 segundos.
- Faz no máximo 1 chamada por execução do job.
- Usa `X-Auth-Token`, sem logar token.
- A atualização de status/placar é periódica. O sistema não usa WebSocket nem tempo real instantâneo nesta etapa.
- O dashboard e a tela de Partidas exibem a última sincronização quando o provider está ativo.
- Atualiza somente partidas já vinculadas por `football_data_match_id`.
- Não cria partidas automaticamente pelo job.
- Se uma partida vinculada chega como finalizada e com placar alterado, reaproveita o fluxo de atualização de resultado e recálculo.

Campos importantes:

- `partidas.football_data_match_id`
- `times.football_data_team_id`

## 10. Providers Externos

Rotas principais:

- `GET /api/v1/provedores-esportivos`
- `GET /api/v1/provedores-esportivos/:provider/token`
- `PUT /api/v1/provedores-esportivos/:provider`
- `PATCH /api/v1/provedores-esportivos/:provider/status`
- `GET /api/v1/provedores-esportivos/football-data/partidas`

Segurança:

- O token não é retornado em listagens normais.
- Token é mascarado por padrão.
- Apenas proprietário pode visualizar token completo.
- Token não é gravado em logs.

## 11. Importação de Partidas Externas

Fluxo principal atual:

1. Entrar em `Partidas`.
2. Clicar em `Buscar partidas externas`.
3. Informar filtros:
   - data inicial;
   - data final;
   - competição;
   - status.
4. Buscar partidas na football-data.org.
5. Selecionar uma ou várias partidas.
6. Clicar em `Importar selecionadas`.

Recursos implementados:

- Toolbar superior com:
  - selecionar todas;
  - contador de selecionadas;
  - importar selecionadas.
- Checkbox no canto esquerdo do card/linha.
- Seleção múltipla.
- Partidas já importadas no bolão atual aparecem identificadas e bloqueadas.
- Resumo final mostra:
  - partidas criadas;
  - partidas ignoradas;
  - times criados;
  - avisos.
- Motivos de partidas ignoradas são detalhados.
- Status externos são traduzidos conforme idioma selecionado.
- Datas são tratadas como intervalo local fechado para evitar perda por fuso horário.

Rotas:

- `POST /api/v1/partidas/importar-externas`
- `PATCH /api/v1/partidas/:id/vinculo-externo`
- `DELETE /api/v1/partidas/:id/vinculo-externo`

Regra multi-bolão:

- O mesmo `football_data_match_id` pode existir em bolões diferentes.
- O mesmo `football_data_match_id` não pode repetir dentro do mesmo bolão.
- A unicidade correta é `UNIQUE (bolao_id, football_data_match_id)`.

## 12. Multitenancy

O sistema é multi-tenant por bolão.

Regras:

- Proprietário acessa todos os bolões.
- Administrador acessa apenas bolões vinculados em `boloes_usuarios`.
- Apostador acessa apenas bolões em que possui participante vinculado.
- Participantes não validam permissão administrativa.
- Ranking, apostas, partidas, pagamentos e notificações devem respeitar o `bolaoId` ativo.

Correção importante:

- A importação football-data deixou de tratar `football_data_match_id` como chave global.
- A mesma partida externa pode ser importada em bolões diferentes.
- A duplicidade só bloqueia dentro do mesmo bolão.

## 13. Segurança

Controles implementados:

- JWT/autenticação via middleware.
- Autorização por perfil.
- Escopo por `bolaoId`.
- Administrador validado via `boloes_usuarios`.
- Apostador validado via participante vinculado.
- Sem exclusão física em fluxos principais; usa status ativo/inativo/cancelado.
- Senhas administrativas com complexidade mínima.
- Tokens externos mascarados.
- Senha SMTP mascarada.
- Webhook InfinitePay separado.
- Logs não devem expor tokens ou senhas.

## 14. Pagamentos

Rotas principais:

- `GET /api/v1/pagamentos/boloes/:bolaoId`
- `POST /api/v1/pagamentos/boloes/:bolaoId`
- `PUT /api/v1/pagamentos/boloes/:bolaoId/:id`
- `POST /api/v1/pagamentos/boloes/:bolaoId/:id/infinitepay/link`
- `POST /api/v1/pagamentos/boloes/:bolaoId/:id/marcar-pago`
- `POST /api/v1/pagamentos/boloes/:bolaoId/:id/voltar-pendente`
- `POST /api/v1/pagamentos/boloes/:bolaoId/:id/cancelar`
- `POST /api/v1/pagamentos/webhooks/infinitepay`

InfinitePay:

- Integração preparada com Checkout.
- Usa `order_nsu` com ID interno do pagamento.
- Salva gateway, URL de checkout, status gateway e payload do webhook.
- Ao confirmar pagamento aprovado, marca pagamento como pago e gera notificação `PAGAMENTO_CONFIRMADO`.

Variáveis:

- `INFINITEPAY_API_URL`
- `INFINITEPAY_HANDLE`

## 15. Email SMTP

Módulo implementado em `src/modules/email`.

Tabela:

- `email_configuracoes`

Rotas protegidas apenas para proprietário:

- `GET /api/v1/email/configuracao`
- `PUT /api/v1/email/configuracao`
- `POST /api/v1/email/teste`

Campos:

- `smtp_host`
- `smtp_port`
- `smtp_secure`
- `smtp_user`
- `smtp_password`
- `smtp_from_name`
- `smtp_from_email`
- `smtp_reply_to`
- `smtp_enabled`
- `provider_name`

Características:

- Usa `nodemailer`.
- Carrega configuração do banco em runtime.
- Não depende exclusivamente de `.env`.
- Senha SMTP não retorna completa ao frontend.
- Senha é exibida mascarada.
- Campo vazio ou mascarado não apaga senha já salva.
- Teste de envio valida conexão, autenticação e envio.
- Compatível com HostGator SMTP:
  - porta 465 com SSL/TLS;
  - porta 587 com STARTTLS.

Assunto do teste:

```text
Teste de configuração de e-mail
```

Mensagem do teste:

```text
Seu serviço de envio de e-mail do Placar.digital foi configurado com sucesso.
```

### Notificações transacionais por e-mail

A primeira camada transacional usa o SMTP configurado no banco e fica em `src/modules/email`.

Eventos implementados:

- convite de participação no bolão;
- ativação/definição de senha;
- recuperação de senha;
- confirmação de pagamento.

Rotas públicas seguras:

- `POST /api/v1/auth/recuperar-senha`
- `POST /api/v1/auth/validar-token`
- `POST /api/v1/auth/ativar-conta`
- `POST /api/v1/auth/redefinir-senha`

Tabelas:

- `auth_tokens`: tokens seguros, com hash SHA-256, expiração obrigatória e uso único;
- `email_templates`: templates por código e idioma, com fallback para `pt-BR`;
- `notificacoes`: log/auditoria do envio por e-mail, com status, tentativas, erro e payload sanitizado.

Regras de segurança:

- tokens completos não são gravados em logs;
- senhas nunca são enviadas por e-mail;
- recuperação de senha não revela se o e-mail existe;
- token expirado, inválido ou reutilizado é rejeitado;
- SMTP e credenciais não são expostos nas respostas.

Páginas auxiliares:

- `/app/ativacao.html`
- `/app/redefinir-senha.html`

Links enviados por e-mail usam a URL pública configurada em `Configurações > Configurações gerais > URL pública do app`. Se essa configuração estiver vazia, o sistema usa o fallback `APP_BASE_URL` do `.env`.

## 16. Deploy

Estado operacional conhecido:

- Servidor atual em rede local: `192.168.0.146`
- SSH: porta `22`
- Usuário conhecido do ambiente: `administre`
- Diretório do projeto no servidor: `~/placar.digital`
- Porta Node/app: `3002`
- Processo PM2: `placar-digital`
- URL local do app:
  - `http://192.168.0.146:3002/app/login.html`
  - `http://192.168.0.146:3002/app/app.html`

Domínio público:

- O domínio público definitivo não está documentado como ativo neste README.
- Em testes anteriores foi usado acesso por IP local e, em alguns momentos, `admerp.com.br` para SSH/porta alternativa.
- Antes de publicar em produção pública, confirmar DNS, firewall, proxy e HTTPS.

Node.js:

- `package.json` declara `node >=20`.
- O servidor já foi observado usando Node `18.19.1`.
- O app pode rodar em Node 18 em piloto, mas isso é risco técnico.
- Recomendado atualizar o runtime para Node 20 LTS antes de produção real.

Fluxo real de deploy:

```bash
cd ~/placar.digital
git pull --ff-only origin main
npm install
node --check app.js
node --check public/app.js
pm2 restart placar-digital --update-env
pm2 save
pm2 status
```

Aplicar migration manualmente quando houver nova migration:

```bash
sudo -u postgres psql -d placar_digital -f db/migrations/NOME_DA_MIGRATION.sql
```

Health check:

```bash
curl -i http://localhost:3002/api/v1/health
curl -i http://localhost:3002/app/login.html
```

Logs:

```bash
pm2 logs placar-digital
pm2 flush placar-digital
```

## 17. Migrations

Migrations existentes:

| Migration | Descrição |
|---|---|
| `001_initial_schema.sql` | Estrutura inicial do banco. |
| `002_auth_email_indexes.sql` | Índices de autenticação/e-mail. |
| `003_proprietario_module.sql` | Ajustes do módulo proprietário. |
| `004_configuracoes_bolao.sql` | Configurações do bolão. |
| `005_boloes_usuarios_admin_links.sql` | Vínculo administrador ↔ bolão. |
| `006_administrador_operacional.sql` | Base operacional administrativa. |
| `007_apostador_module.sql` | Módulo apostador/apostas. |
| `008_motor_pontuacao.sql` | Motor de pontuação. |
| `009_ranking_premiacao.sql` | Ranking, desempate e premiação. |
| `010_notificacoes.sql` | Notificações. |
| `011_revisao_consistencia.sql` | Revisões de consistência. |
| `012_infinitepay_checkout.sql` | InfinitePay Checkout. |
| `013_times_media_fields.sql` | Brasões, bandeiras e códigos de times. |
| `014_sports_data_providers.sql` | Provedores esportivos. |
| `015_partidas_football_data_match_id.sql` | Campo de vínculo football-data em partidas. |
| `016_times_football_data_team_id.sql` | Campo externo football-data em times. |
| `017_email_configuracoes.sql` | Configuração SMTP/e-mail. |
| `018_partidas_football_data_match_id_por_bolao.sql` | Unicidade multi-tenant por bolão para partidas externas. |
| `019_boloes_times.sql` | Vínculo multi-tenant entre bolões e times. |
| `020_email_configuracoes_email_constraints.sql` | Constraints adicionais para configuração SMTP/e-mail. |
| `021_estrutura_esportiva_multicampeonato.sql` | Estrutura de competição, temporada, grupos, rodadas e vínculos esportivos em partidas. |
| `022_notificacoes_email_transacionais.sql` | Tokens, templates e auditoria para notificações transacionais por e-mail. |

### Migration 017

Cria a tabela `email_configuracoes`, usada pela tela `Configurações > E-mail`.

### Migration 018

Corrige a regra multi-tenant da importação externa.

Ela:

- verifica se já existem duplicidades dentro do mesmo bolão;
- remove constraint/índice unique global em `football_data_match_id`, se existir;
- cria índice único parcial em `(bolao_id, football_data_match_id)`;
- mantém índice auxiliar por `football_data_match_id` para sincronização.

Regra final:

```sql
UNIQUE (bolao_id, football_data_match_id)
WHERE football_data_match_id IS NOT NULL
```

### Migration 019

Cria a tabela `boloes_times` para controlar quais times pertencem a cada bolão. A migration faz backfill dos bolões existentes para preservar a operação atual, mas bolões criados depois da migration iniciam sem times. Times passam a ser vinculados ao bolão ao cadastrar manualmente ou ao importar partidas externas.

### Migration 021

Cria a estrutura esportiva multicampeonato:

- `competicoes`
- `competicoes_temporadas`
- `grupos`
- `rodadas`
- novos campos esportivos em `boloes`, `fases` e `partidas`

Backfill:

- bolões existentes apontam para `Competição personalizada` e `Temporada padrão`;
- fases existentes recebem `temporada_id`, `codigo` e `tipo_fase` quando possível;
- partidas existentes herdam `competicao_id` e `temporada_id` do bolão.

Regra de compatibilidade:

- football-data preenche a nova estrutura nas importações novas;
- dados antigos continuam funcionais mesmo sem grupo ou rodada;
- a pontuação e o ranking permanecem usando as mesmas tabelas e regras.

### Migration 022

Cria a base transacional de e-mails:

- `auth_tokens`
- `email_templates`
- novos campos de auditoria em `notificacoes`

Tokens:

- são armazenados como hash SHA-256;
- possuem expiração obrigatória;
- são de uso único;
- não devem aparecer completos em logs ou respostas.

Templates iniciais:

- `convite_bolao`
- `ativacao_conta`
- `recuperacao_senha`
- `pagamento_confirmado`

## 18. Troubleshooting

### Importação externa ignorada

Verificar o resumo da importação. O sistema deve informar o motivo:

- já existe neste bolão;
- partida local duplicada por mandante/visitante/data;
- time ambíguo;
- mandante e visitante resolvidos como mesmo time.

Se a partida existir em outro bolão, isso não deve bloquear a importação no bolão atual.

### football-data.org e limite de datas

A API football-data.org pode limitar consultas por período e plano. Se receber erro HTTP 400:

- reduzir intervalo de datas;
- conferir competição;
- remover status vazio;
- validar token;
- verificar logs do backend sem expor token.

### Timezone UTC

A busca externa trata datas como intervalo local fechado:

- início: `00:00:00`
- fim: `23:59:59`

Isso evita perder partidas por conversão UTC.

Na edição manual de partidas, o frontend preenche o `datetime-local` usando o horário local visível ao usuário. Assim, abrir uma partida marcada para 15:00, alterar outro campo e salvar mantém 15:00, sem aplicar conversão UTC duplicada. Partidas importadas da football-data continuam chegando em UTC e são exibidas no horário local do navegador/app.

### PM2

Se aparecer `EADDRINUSE`, há mais de um processo usando a porta 3002:

```bash
pm2 status
sudo ss -ltnp | grep ':3002'
ps -fp PID
pm2 restart placar-digital --update-env
```

Não mudar a porta sem autorização.

### Cache do navegador

Se alterações visuais não aparecerem:

- limpar cache;
- atualizar com recarregamento forçado;
- confirmar se o servidor está servindo `public/app.js` atualizado.

### Node 18 vs 20

O projeto pede Node >=20. Se `npm install` mostrar `EBADENGINE` com Node 18, atualizar para Node 20 LTS quando possível.

### SMTP

Erros comuns:

- autenticação: usuário/senha incorretos;
- conexão: host, porta ou SSL/TLS incorretos;
- timeout: firewall, DNS ou bloqueio do provedor;
- porta 465: usar SSL/TLS;
- porta 587: usar STARTTLS.

### InfinitePay

Verificar:

- `INFINITEPAY_API_URL`
- `INFINITEPAY_HANDLE`
- status do pagamento;
- payload do webhook;
- `order_nsu` igual ao ID interno do pagamento.

### Permissões de bolão

Se administrador não visualiza bolão:

- conferir vínculo em `boloes_usuarios`;
- conferir status do usuário;
- conferir token após troca/seleção de bolão;
- não usar participantes para validar permissão administrativa.

## 19. Roadmap Futuro

Itens planejados, ainda não implementados:

- UX mobile-first avançada.
- Bottom navigation.
- PWA.
- Animações premium.
- Experiência touch de apostas.
- Notificações push reais.
- Integração WhatsApp.
- Fila de envio de e-mails.
- Editor visual de templates de e-mail.
- Integração PIX.
- Melhorias de performance e cache.
- Observabilidade estruturada.
- Publicação final com Nginx, HTTPS e domínio definitivo.

## 20. Comandos Úteis

Instalar dependências:

```bash
npm install
```

Rodar localmente:

```bash
npm start
```

Validar sintaxe:

```bash
node --check app.js
node --check public/app.js
```

Executar teste E2E manual automatizado, se ambiente estiver preparado:

```bash
npm run test:e2e:flow
```

Aplicar schema completo em ambiente novo:

```bash
psql -d placar_digital -f db/schema.sql
```

## 21. Observações Finais

- O app unificado é o fluxo oficial.
- O sistema está adequado para piloto controlado.
- Antes de produção pública, revisar runtime Node 20, HTTPS, domínio, backup, firewall e política de logs.
- Não há documentação de HTTPS/Nginx ativa neste README porque a infraestrutura de produção anterior foi removida por decisão do projeto.
