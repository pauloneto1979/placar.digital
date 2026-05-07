# placar.digital

Plataforma de bolÃ£o esportivo multi-bolÃµes, preparada para operaÃ§Ã£o SaaS com trÃªs perfis distintos:

## Produção VPS

O projeto inclui uma camada operacional para produção em VPS Ubuntu 24 com Node.js LTS, PostgreSQL, Nginx, PM2, Let's Encrypt e Cloudflare:

- `ecosystem.config.js`: processo PM2 `placar-digital` com logs em `/var/log/placar.digital`.
- `.env.production.example`: variáveis obrigatórias e seguras para produção.
- `scripts/run-migrations.js`: runner de migrations versionadas com tabela `schema_migrations`.
- `ops/nginx/placar.digital.conf`: reverse proxy Nginx com gzip, cache de assets, headers e HTTP -> HTTPS.
- `ops/logrotate/placar.digital`: rotação de logs do app e Nginx.
- `ops/scripts/*.sh`: setup inicial, deploy, restart, backup, restore e atualização.
- `docs/PRODUCTION.md`: guia completo com DNS, Cloudflare, SSL, deploy, backup, restore, troubleshooting e checklists.

Guia recomendado: [`docs/PRODUCTION.md`](docs/PRODUCTION.md).

- `proprietario`
- `administrador`
- `apostador`

O projeto jÃ¡ estÃ¡ com backend, banco, autenticaÃ§Ã£o, app web unificado, ranking, pagamentos e base de notificaÃ§Ãµes funcionando. Este README descreve o estado atual para operaÃ§Ã£o e piloto controlado.

## VisÃ£o Geral

- Backend: Node.js + Express
- Banco: PostgreSQL
- Frontend: app unificado estÃ¡tico servido em `/app`
- Processo publicado: `pm2` com nome `placar-digital`
- RepositÃ³rio: `https://github.com/pauloneto1979/placar.digital.git`
- Servidor informado: `192.168.0.119`

## Perfis E Acesso

### ProprietÃ¡rio

Pode acessar:

- gestÃ£o de bolÃµes
- gestÃ£o de usuÃ¡rios do sistema
- vÃ­nculo de administradores aos bolÃµes
- configuraÃ§Ãµes gerais da plataforma
- visÃ£o operacional de qualquer bolÃ£o

### Administrador

Pode acessar apenas bolÃµes em que esteja vinculado na tabela `boloes_usuarios`.

Pode operar:

- participantes
- pagamentos
- fases
- times
- partidas
- configuraÃ§Ãµes do bolÃ£o
- regras de pontuaÃ§Ã£o
- critÃ©rios de desempate
- distribuiÃ§Ã£o de prÃªmios

### Apostador

Pode acessar apenas o bolÃ£o selecionado no token e apenas com `participanteId` vÃ¡lido.

Pode usar:

- placar inicial
- jogos
- apostas
- ranking
- regras do bolÃ£o
- notificaÃ§Ãµes
- meu perfil

## App Web

O frontend publicado usa app unificado:

- login: `/app/login.html`
- seleÃ§Ã£o de bolÃ£o: `/app/selecao-bolao.html`
- app principal: `/app/app.html`

O tema visual Ã© centralizado em `public/theme.css` e cobre login, seleÃ§Ã£o de bolÃ£o, home, ranking, apostas, partidas e telas administrativas. A abordagem atual Ã© mobile-first, com botÃµes maiores, cards consistentes, formulÃ¡rios responsivos, estados vazios padronizados e mensagens de erro/sucesso no mesmo padrÃ£o visual.

A barra superior e os controles auxiliares usam o mesmo padrÃ£o visual do app: seletor de idioma em formato de pÃ­lula com Ã­cone de globo, e aÃ§Ãµes de perfil/saÃ­da com botÃµes de Ã­cone acessÃ­veis.

A Home/Placar do apostador funciona como dashboard premium do bolÃ£o ativo:

- posiÃ§Ã£o atual, pontuaÃ§Ã£o, diferenÃ§a para o lÃ­der e palpites pendentes
- prÃ³ximo jogo com brasÃµes/bandeiras, data, status do palpite e contador regressivo
- prÃ³ximos jogos do bolÃ£o com status visual do palpite
- Ãºltimos resultados quando houver placar informado
- top 3 do ranking reaproveitando o ranking atual

O ranking do app foi atualizado para uma visualizaÃ§Ã£o mais competitiva e responsiva:

- top 3 com medalhas
- destaque visual para o apostador logado
- diferenÃ§a de pontos para o lÃ­der
- avatar fallback por iniciais
- layout em cards no mobile e lista ampla no desktop

As pÃ¡ginas antigas:

- `/app/proprietario.html`
- `/app/administrador.html`
- `/app/apostador.html`

redirecionam para o app principal.

## Fluxo De Login

### 1. Login

Endpoint:

```http
POST /api/v1/auth/login
```

Payload:

```json
{
  "email": "usuario@email.com",
  "senha": "Senha@123"
}
```

Comportamento:

- `proprietario`: entra direto
- `administrador` com 1 bolÃ£o: entra direto
- `apostador` com 1 bolÃ£o: entra direto
- `administrador` ou `apostador` com mais de 1 bolÃ£o: recebe `selectionToken` e segue para seleÃ§Ã£o de bolÃ£o

### 2. SeleÃ§Ã£o De BolÃ£o

Endpoint:

```http
POST /api/v1/auth/selecionar-bolao
```

Payload:

```json
{
  "selectionToken": "token-temporario",
  "bolaoId": "uuid-do-bolao"
}
```

### 3. Troca De BolÃ£o No App

Endpoint:

```http
POST /api/v1/auth/trocar-bolao
```

Payload:

```json
{
  "bolaoId": "uuid-do-bolao"
}
```

## Meu Perfil

O app principal possui manutenÃ§Ã£o do prÃ³prio usuÃ¡rio logado.

Endpoints:

- `GET /api/v1/auth/me`
- `GET /api/v1/auth/meu-perfil`
- `PUT /api/v1/auth/meu-perfil`
- `PUT /api/v1/auth/minha-senha`

Regras:

- o usuÃ¡rio altera apenas os prÃ³prios dados
- email Ã© somente leitura
- troca de senha exige senha atual
- perfil e vÃ­nculos com bolÃ£o nÃ£o sÃ£o alterados por essa tela

## Credenciais Do Apostador

Modelo adotado:

- `participantes.usuario_id` referencia `usuarios.id`

Isso mantÃ©m a separaÃ§Ã£o entre:

- usuÃ¡rio de login
- participante dentro do bolÃ£o

Regras:

- o mesmo usuÃ¡rio apostador pode participar de mÃºltiplos bolÃµes
- administrador e proprietÃ¡rio nÃ£o viram participante automaticamente
- permissÃµes administrativas continuam sendo validadas por `boloes_usuarios`

## ConfiguraÃ§Ãµes Do BolÃ£o E Prioridade

As regras de pontuaÃ§Ã£o sÃ£o configurÃ¡veis por bolÃ£o.

Regra correta de prioridade:

- `1 = mais importante`
- a pontuaÃ§Ã£o nÃ£o Ã© cumulativa
- quando mais de uma regra se aplica, vence a menor prioridade numÃ©rica
- em empate de prioridade, vence a maior pontuaÃ§Ã£o

Exemplo:

```json
{
  "codigo": "PLACAR_EXATO",
  "descricao": "Acertou o placar exato",
  "pontos": 10,
  "prioridade": 1,
  "ativo": true
}
```

## InfinitePay

A integraÃ§Ã£o com InfinitePay Checkout jÃ¡ estÃ¡ preparada no backend.

VariÃ¡veis esperadas no `.env`:

```env
INFINITEPAY_API_URL=https://api.checkout.infinitepay.io
INFINITEPAY_HANDLE=sua_infinite_tag_sem_cifrao
```

Fluxo atual:

- criar pagamento
- gerar link InfinitePay
- receber webhook
- marcar pagamento como `pago`
- gerar notificaÃ§Ã£o `PAGAMENTO_CONFIRMADO`

Endpoint de webhook:

```http
POST /api/v1/pagamentos/webhooks/infinitepay
```

## Provedores De Dados Esportivos

O backend agora possui uma camada interna para configuraÃ§Ã£o de provedores esportivos externos, permitindo trocar o provedor ativo sem alterar as regras de negÃ³cio do bolÃ£o.

Tabela usada:

- `provedores_dados_esportivos`

Campos principais:

- `provider`
- `enabled`
- `api_token`
- `sync_interval_seconds`
- `base_url`
- `last_sync_at`

Provedor suportado no momento:

- `football-data`

Arquitetura jÃ¡ preparada para expansÃ£o futura:

- `api-football`
- `rapidapi`
- `outros`

Regras atuais:

- o `api_token` fica somente no backend
- o token nÃ£o deve ser exposto no frontend
- o token nÃ£o deve ser escrito em logs
- se o provedor estiver desabilitado, o job de sincronizaÃ§Ã£o nÃ£o deve executar
- quando a sincronizaÃ§Ã£o estiver desabilitada ou invÃ¡lida, a factory registra apenas um aviso controlado, sem vazar segredos

Migration adicionada:

```bash
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/014_sports_data_providers.sql
```

Registro inicial criado pela migration:

- `provider = football-data`
- `enabled = false`
- `sync_interval_seconds = 300`
- `base_url = https://api.football-data.org/v4`

Exemplo para desativar:

```sql
update provedores_dados_esportivos
set enabled = false
where provider = 'football-data';
```

O provider tambÃ©m pode ser configurado pelo painel web:

- menu `ConfiguraÃ§Ãµes`
- seÃ§Ã£o `Provedores esportivos`
- disponÃ­vel para `proprietario` e `administrador`
- exibe apenas token mascarado, nunca o token completo
- permite alterar `base_url`, `sync_interval_seconds`, `api_token` e ativar/desativar o provider

Endpoints administrativos:

- `GET /api/v1/provedores-esportivos`
- `PUT /api/v1/provedores-esportivos/:provider`
- `PATCH /api/v1/provedores-esportivos/:provider/status`
- `GET /api/v1/provedores-esportivos/football-data/partidas`

Esses endpoints sÃ£o protegidos por autenticaÃ§Ã£o e aceitam apenas `proprietario` ou `administrador`. As respostas sÃ£o sanitizadas e nunca retornam `api_token` completo.

Busca de partidas externas football-data.org:

```http
GET /api/v1/provedores-esportivos/football-data/partidas?dateFrom=2026-06-01&dateTo=2026-06-07&competition=PL&status=SCHEDULED
Authorization: Bearer TOKEN
```

Filtros opcionais:

- `dateFrom`: data no formato `YYYY-MM-DD`
- `dateTo`: data no formato `YYYY-MM-DD`
- `competition`: codigo/id aceito pela football-data.org, enviado ao provider como `competitions`
- `status`: `SCHEDULED`, `LIVE`, `IN_PLAY`, `PAUSED`, `FINISHED`, `POSTPONED`, `SUSPENDED` ou `CANCELLED`

Resposta resumida:

```json
{
  "count": 1,
  "filters": {
    "dateFrom": "2026-06-01",
    "dateTo": "2026-06-07",
    "competition": "PL",
    "status": "SCHEDULED"
  },
  "partidas": [
    {
      "externalMatchId": "123456",
      "competition": {
        "id": 2021,
        "name": "Premier League",
        "code": "PL"
      },
      "status": "SCHEDULED",
      "utcDate": "2026-06-01T19:00:00Z",
      "mandante": {
        "name": "Home Team"
      },
      "visitante": {
        "name": "Away Team"
      },
      "placar": {
        "fullTime": {
          "home": null,
          "away": null
        }
      },
      "faseRodada": {
        "stage": "REGULAR_SEASON",
        "matchday": 1
      }
    }
  ]
}
```

Vinculo de partida local com partida externa:

```http
PATCH /api/v1/partidas/:id/vinculo-externo
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "provider": "football-data",
  "externalMatchId": 123456
}
```

Remover vinculo externo:

```http
DELETE /api/v1/partidas/:id/vinculo-externo
Authorization: Bearer TOKEN
```

Regras de vinculo:

- somente `proprietario` ou `administrador` autorizado no bolao da partida local pode vincular/desvincular
- a partida local precisa existir
- `externalMatchId` deve ser numerico
- o mesmo `externalMatchId` nao pode estar vinculado a outra partida local
- a busca e os vinculos nunca retornam nem registram `api_token`
- vincular/desvincular nao altera placar nem dispara recÃ¡lculo
- o recÃ¡lculo continua ocorrendo apenas quando a sincronizaÃ§Ã£o externa atualizar resultado confirmado com mudanÃ§a relevante

Tela administrativa:

- fluxo principal: menu `Partidas`, botao `Buscar partidas externas`
- o administrador/proprietario informa filtros, seleciona uma ou mais partidas da football-data.org e clica em `Importar selecionadas`
- a importacao cria automaticamente times ausentes quando houver correspondencia segura e cria a partida local ja vinculada por `football_data_match_id`
- partidas externas ja importadas no bolao carregado aparecem destacadas e bloqueadas na lista de importacao
- se o `football_data_match_id` ja existir em outra partida local, a importacao ignora o item e retorna no resumo como duplicidade
- a tela antiga `Configuracoes > Vinculacao de partidas externas` foi removida do frontend; os endpoints antigos permanecem disponiveis para compatibilidade tecnica
- `Configuracoes` no app unificado fica visivel apenas para `proprietario`

Seguranca operacional:

- usuarios `proprietario` e `administrador` exigem senha com no minimo 8 caracteres, 1 letra maiuscula, 1 letra minuscula e 1 numero
- apostadores precisam ter senha informada ao criar uma nova credencial; nao ha exigencia de caractere especial
- o token do provedor football-data fica mascarado por padrao no frontend, so pode ser revelado por `proprietario` e nao e retornado em listagens publicas
- novo bolao criado pelo modulo proprietario recebe automaticamente configuracao principal, regras de pontuacao, criterios de desempate e distribuicao de premios padrao

Endpoint de importacao:

```http
POST /api/v1/partidas/importar-externas
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "bolaoId": "uuid-do-bolao",
  "provider": "football-data",
  "matches": [
    {
      "externalMatchId": 123456
    }
  ]
}
```

O frontend envia os dados das partidas retornadas pela busca para reduzir chamadas ao provider. Se a importacao receber apenas `externalMatchId`, o backend tenta buscar os detalhes diretamente na football-data.org usando o provider ativo.

Codigos de competicao suportados no dropdown:

- `WC` - FIFA World Cup
- `CL` - UEFA Champions League
- `BL1` - Bundesliga
- `DED` - Eredivisie
- `BSA` - Campeonato Brasileiro Serie A
- `PD` - Primera Division
- `FL1` - Ligue 1
- `ELC` - Championship
- `PPL` - Primeira Liga
- `EC` - European Championship
- `SA` - Serie A
- `PL` - Premier League

Ao selecionar `Todas as competicoes`, o frontend nao envia `competition` para a API.

Modulo interno criado:

- `src/modules/provedores_esportivos/provedores_esportivos.repository.js`
- `src/modules/provedores_esportivos/provedores_esportivos.service.js`
- `src/modules/provedores_esportivos/provider-factory.js`
- `src/modules/provedores_esportivos/football-data-sync.service.js`
- `src/modules/provedores_esportivos/sports-data-sync.job.js`

A factory interna resolve o provedor ativo para jobs futuros de sincronizaÃ§Ã£o e tambÃ©m permite marcar `last_sync_at` apÃ³s uma execuÃ§Ã£o bem-sucedida.

### SincronizaÃ§Ã£o Football-Data.org

O job interno de dados esportivos Ã© iniciado junto com o servidor e acorda a cada 1 minuto.

Regras da sincronizaÃ§Ã£o atual:

- executa apenas quando o provider ativo for `football-data`
- exige `enabled = true`
- exige `api_token` preenchido
- usa `base_url` da tabela `provedores_dados_esportivos`
- respeita `sync_interval_seconds`, com mÃ­nimo efetivo de 60 segundos
- faz no mÃ¡ximo 1 chamada HTTP por execuÃ§Ã£o
- consulta `GET {base_url}/matches`
- envia o header `X-Auth-Token`
- nÃ£o registra o token em logs
- trata HTTP `429` como rate limit com aviso controlado
- atualiza `last_sync_at` apenas quando a consulta ao provider Ã© bem-sucedida
- protege contra execuÃ§Ã£o simultÃ¢nea no mesmo processo

A sincronizaÃ§Ã£o nÃ£o cria partidas automaticamente. Ela atualiza somente partidas jÃ¡ cadastradas e vinculadas pelo campo:

- `partidas.football_data_match_id`

Quando um jogo externo chega como `FINISHED` e possui placar completo em `score.fullTime.home` e `score.fullTime.away`, o sistema:

- atualiza o placar da partida vinculada
- marca `resultado_confirmado = true`
- reaproveita o fluxo atual de resultado para auditoria, recÃ¡lculo de pontuaÃ§Ã£o, ranking e notificaÃ§Ãµes

Se nÃ£o houver mudanÃ§a relevante em status, data/hora ou placar, nada Ã© salvo e nenhum recÃ¡lculo Ã© disparado.

## Principais Endpoints

### Auth

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/selecionar-bolao`
- `POST /api/v1/auth/trocar-bolao`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/meu-perfil`
- `PUT /api/v1/auth/meu-perfil`
- `PUT /api/v1/auth/minha-senha`

### ProprietÃ¡rio

- `GET|POST /api/v1/proprietario/boloes`
- `PUT /api/v1/proprietario/boloes/:id`
- `POST /api/v1/proprietario/boloes/:id/fechar`
- `GET|POST /api/v1/proprietario/usuarios`
- `PUT /api/v1/proprietario/usuarios/:id`
- `PATCH /api/v1/proprietario/usuarios/:id/status`
- `GET|POST /api/v1/proprietario/boloes/:bolaoId/administradores`
- `DELETE /api/v1/proprietario/boloes/:bolaoId/administradores/:usuarioId`
- `GET|PUT /api/v1/proprietario/configuracoes-gerais`

### Administrador

- `GET|POST /api/v1/participantes/boloes/:bolaoId`
- `PUT /api/v1/participantes/boloes/:bolaoId/:id`
- `PATCH /api/v1/participantes/boloes/:bolaoId/:id/status`
- `GET|POST /api/v1/pagamentos/boloes/:bolaoId`
- `PUT /api/v1/pagamentos/boloes/:bolaoId/:id`
- `POST /api/v1/pagamentos/boloes/:bolaoId/:id/infinitepay/link`
- `POST /api/v1/pagamentos/boloes/:bolaoId/:id/marcar-pago`
- `POST /api/v1/pagamentos/boloes/:bolaoId/:id/voltar-pendente`
- `POST /api/v1/pagamentos/boloes/:bolaoId/:id/cancelar`
- `GET|POST /api/v1/fases/boloes/:bolaoId`
- `PUT /api/v1/fases/boloes/:bolaoId/:id`
- `PATCH /api/v1/fases/boloes/:bolaoId/:id/status`
- `GET|POST /api/v1/times/boloes/:bolaoId`
- `PUT /api/v1/times/boloes/:bolaoId/:id`
- `PATCH /api/v1/times/boloes/:bolaoId/:id/status`
- `GET|POST /api/v1/partidas/boloes/:bolaoId`
- `PUT /api/v1/partidas/boloes/:bolaoId/:id`
- `POST /api/v1/partidas/importar-externas`
- `PATCH /api/v1/partidas/:id/vinculo-externo`
- `DELETE /api/v1/partidas/:id/vinculo-externo`

Campos de time atualmente suportados:

- `nome`
- `sigla`
- `codigoFifa`
- `footballDataTeamId`
- `escudoUrl`
- `bandeiraUrl`
- `pais`
- `status`

### ConfiguraÃ§Ãµes Do BolÃ£o

- `GET|POST /api/v1/configuracoes-bolao/:bolaoId/configuracao`
- `PUT /api/v1/configuracoes-bolao/:bolaoId/configuracao/:configuracaoId`
- `GET|POST /api/v1/configuracoes-bolao/:bolaoId/regras-pontuacao`
- `PUT /api/v1/configuracoes-bolao/:bolaoId/regras-pontuacao/:regraId`
- `DELETE /api/v1/configuracoes-bolao/:bolaoId/regras-pontuacao/:regraId`
- `GET|POST /api/v1/configuracoes-bolao/:bolaoId/criterios-desempate`
- `PUT /api/v1/configuracoes-bolao/:bolaoId/criterios-desempate/:criterioId`
- `DELETE /api/v1/configuracoes-bolao/:bolaoId/criterios-desempate/:criterioId`
- `GET|POST /api/v1/configuracoes-bolao/:bolaoId/distribuicao-premios`
- `PUT /api/v1/configuracoes-bolao/:bolaoId/distribuicao-premios/:distribuicaoId`
- `DELETE /api/v1/configuracoes-bolao/:bolaoId/distribuicao-premios/:distribuicaoId`

### Apostador

- `GET /api/v1/apostas/boloes/:bolaoId/dashboard`
- `GET /api/v1/apostas/boloes/:bolaoId/jogos`
- `GET /api/v1/apostas/boloes/:bolaoId/minhas`
- `POST /api/v1/apostas/boloes/:bolaoId`
- `PUT /api/v1/apostas/boloes/:bolaoId`
- `GET /api/v1/ranking/boloes/:bolaoId/atual`
- `GET /api/v1/ranking/boloes/:bolaoId/meu`
- `GET /api/v1/ranking/boloes/:bolaoId/premiacao`
- `GET /api/v1/ranking/boloes/:bolaoId/regras`
- `GET /api/v1/notificacoes/boloes/:bolaoId/minhas`
- `PATCH /api/v1/notificacoes/boloes/:bolaoId/:id/lida`

## Banco E Migrations

As migrations ficam em `db/migrations`.

Ordem atual de aplicaÃ§Ã£o:

```bash
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/001_initial_schema.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/002_auth_email_indexes.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/003_proprietario_module.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/004_configuracoes_bolao.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/005_boloes_usuarios_admin_links.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/006_administrador_operacional.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/007_apostador_module.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/008_motor_pontuacao.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/009_ranking_premiacao.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/010_notificacoes.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/011_revisao_consistencia.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/012_infinitepay_checkout.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/013_times_media_fields.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/014_sports_data_providers.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/015_partidas_football_data_match_id.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/016_times_football_data_team_id.sql
```

## Setup Local

```bash
npm install
cp .env.example .env
npm run dev
```

VariÃ¡veis mÃ­nimas:

- `DATABASE_URL`
- `AUTH_TOKEN_SECRET`
- `AUTH_TOKEN_EXPIRES_IN_SECONDS`
- `AUTH_SELECTION_TOKEN_EXPIRES_IN_SECONDS`
- `INFINITEPAY_API_URL`
- `INFINITEPAY_HANDLE`

## Deploy E PM2

DiretÃ³rio atual no servidor:

```bash
/home/administre/placar.digital
```

Comandos usuais de deploy:

```bash
cd /home/administre/placar.digital
git pull --ff-only origin main
npm install
node --check app.js
node --check public/app.js
pm2 restart placar-digital
pm2 status placar-digital
```

Health checks Ãºteis:

- `GET /api/v1/health`
- `GET /app/login.html`
- `GET /app/app.html`

## Roteiro BÃ¡sico De OperaÃ§Ã£o

### ProprietÃ¡rio

1. Criar bolÃ£o
2. Criar administrador
3. Vincular administrador ao bolÃ£o
4. Ajustar configuraÃ§Ãµes gerais

### Administrador

1. Criar participantes
2. Confirmar ou gerar credenciais do apostador
3. Configurar fases, times e partidas
   os times agora podem receber `escudo_url`, `bandeira_url` e `codigo_fifa/sigla` para exibiÃ§Ã£o visual no app
4. Configurar regras do bolÃ£o
5. Acompanhar pagamentos
6. LanÃ§ar resultados

### Apostador

1. Fazer login
2. Selecionar bolÃ£o, se houver mais de um
3. Consultar regras, jogos e ranking
4. Registrar ou alterar apostas dentro do prazo
5. Acompanhar notificaÃ§Ãµes e perfil

## ObservaÃ§Ãµes Operacionais

- O backend e o frontend publicados estÃ£o prontos para piloto controlado.
- Partidas, palpites e listas de times exibem escudo ou bandeira quando configurados, com fallback visual para sigla/iniciais.
- O dashboard premium da Home usa endpoints existentes e respeita sempre o bolÃ£o selecionado.
- O ranking mantÃ©m a mesma regra de cÃ¡lculo de pontos e usa apenas melhorias visuais e de leitura no frontend.
- A leitura de ranking (`GET /api/v1/ranking/boloes/:bolaoId/atual`) nÃ£o recalcula nem grava dados. O ranking Ã© atualizado pelos fluxos de resultado confirmado ou pelos endpoints POST de recÃ¡lculo.
- Ao editar uma partida, o recÃ¡lculo automÃ¡tico ocorre apenas quando hÃ¡ mudanÃ§a relevante no resultado: placar, status ou confirmaÃ§Ã£o do resultado. AlteraÃ§Ãµes em dados operacionais como data, estÃ¡dio ou outros campos nÃ£o relacionados ao resultado nÃ£o geram novo recÃ¡lculo, auditoria ou notificaÃ§Ã£o.
- A rotina Football-Data.org atualiza somente partidas vinculadas por `football_data_match_id` e dispara o recÃ¡lculo apenas quando o resultado externo muda a partida de forma relevante.
- O upgrade visual global nÃ£o altera regras de negÃ³cio, endpoints, autenticaÃ§Ã£o, pontuaÃ§Ã£o ou banco de dados.
- A integraÃ§Ã£o InfinitePay estÃ¡ preparada, mas depende da `INFINITEPAY_HANDLE` real no `.env`.
- Provedores esportivos externos sÃ£o configurados no banco pela tabela `provedores_dados_esportivos`. O provedor ativo Ã© resolvido por factory interna, e a leitura da configuraÃ§Ã£o nÃ£o expÃµe `api_token`.
- O servidor atualmente roda `Node 18.19.1`, enquanto o projeto declara `>=20` em `package.json`.
- Isso nÃ£o impediu a operaÃ§Ã£o atual, mas Ã© um risco tÃ©cnico de compatibilidade futura. A recomendaÃ§Ã£o Ã© migrar o runtime do servidor para `Node 20 LTS` antes de expandir o uso alÃ©m do piloto.

## OrganizaÃ§Ã£o

- arquitetura: `docs/architecture.md`
- migrations: `db/migrations`
- mÃ³dulos de domÃ­nio: `src/modules`
- provedores esportivos: `src/modules/provedores_esportivos`
- app unificado: `public/app.html`, `public/app.js`, `public/theme.css`

