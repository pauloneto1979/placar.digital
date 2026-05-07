# placar.digital

Plataforma de bolão esportivo multi-bolões, preparada para operação SaaS com três perfis distintos:

- `proprietario`
- `administrador`
- `apostador`

O projeto já está com backend, banco, autenticação, app web unificado, ranking, pagamentos e base de notificações funcionando. Este README descreve o estado atual para operação e piloto controlado.

## Visão Geral

- Backend: Node.js + Express
- Banco: PostgreSQL
- Frontend: app unificado estático servido em `/app`
- Processo publicado: `pm2` com nome `placar-digital`
- Repositório: `https://github.com/pauloneto1979/placar.digital.git`
- Servidor informado: `192.168.0.119`

## Perfis E Acesso

### Proprietário

Pode acessar:

- gestão de bolões
- gestão de usuários do sistema
- vínculo de administradores aos bolões
- configurações gerais da plataforma
- visão operacional de qualquer bolão

### Administrador

Pode acessar apenas bolões em que esteja vinculado na tabela `boloes_usuarios`.

Pode operar:

- participantes
- pagamentos
- fases
- times
- partidas
- configurações do bolão
- regras de pontuação
- critérios de desempate
- distribuição de prêmios

### Apostador

Pode acessar apenas o bolão selecionado no token e apenas com `participanteId` válido.

Pode usar:

- placar inicial
- jogos
- apostas
- ranking
- regras do bolão
- notificações
- meu perfil

## App Web

O frontend publicado usa app unificado:

- login: `/app/login.html`
- seleção de bolão: `/app/selecao-bolao.html`
- app principal: `/app/app.html`

O tema visual é centralizado em `public/theme.css` e cobre login, seleção de bolão, home, ranking, apostas, partidas e telas administrativas. A abordagem atual é mobile-first, com botões maiores, cards consistentes, formulários responsivos, estados vazios padronizados e mensagens de erro/sucesso no mesmo padrão visual.

A barra superior e os controles auxiliares usam o mesmo padrão visual do app: seletor de idioma em formato de pílula com ícone de globo, e ações de perfil/saída com botões de ícone acessíveis.

A Home/Placar do apostador funciona como dashboard premium do bolão ativo:

- posição atual, pontuação, diferença para o líder e palpites pendentes
- próximo jogo com brasões/bandeiras, data, status do palpite e contador regressivo
- próximos jogos do bolão com status visual do palpite
- últimos resultados quando houver placar informado
- top 3 do ranking reaproveitando o ranking atual

O ranking do app foi atualizado para uma visualização mais competitiva e responsiva:

- top 3 com medalhas
- destaque visual para o apostador logado
- diferença de pontos para o líder
- avatar fallback por iniciais
- layout em cards no mobile e lista ampla no desktop

As páginas antigas:

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
- `administrador` com 1 bolão: entra direto
- `apostador` com 1 bolão: entra direto
- `administrador` ou `apostador` com mais de 1 bolão: recebe `selectionToken` e segue para seleção de bolão

### 2. Seleção De Bolão

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

### 3. Troca De Bolão No App

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

O app principal possui manutenção do próprio usuário logado.

Endpoints:

- `GET /api/v1/auth/me`
- `GET /api/v1/auth/meu-perfil`
- `PUT /api/v1/auth/meu-perfil`
- `PUT /api/v1/auth/minha-senha`

Regras:

- o usuário altera apenas os próprios dados
- email é somente leitura
- troca de senha exige senha atual
- perfil e vínculos com bolão não são alterados por essa tela

## Credenciais Do Apostador

Modelo adotado:

- `participantes.usuario_id` referencia `usuarios.id`

Isso mantém a separação entre:

- usuário de login
- participante dentro do bolão

Regras:

- o mesmo usuário apostador pode participar de múltiplos bolões
- administrador e proprietário não viram participante automaticamente
- permissões administrativas continuam sendo validadas por `boloes_usuarios`

## Configurações Do Bolão E Prioridade

As regras de pontuação são configuráveis por bolão.

Regra correta de prioridade:

- `1 = mais importante`
- a pontuação não é cumulativa
- quando mais de uma regra se aplica, vence a menor prioridade numérica
- em empate de prioridade, vence a maior pontuação

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

A integração com InfinitePay Checkout já está preparada no backend.

Variáveis esperadas no `.env`:

```env
INFINITEPAY_API_URL=https://api.checkout.infinitepay.io
INFINITEPAY_HANDLE=sua_infinite_tag_sem_cifrao
```

Fluxo atual:

- criar pagamento
- gerar link InfinitePay
- receber webhook
- marcar pagamento como `pago`
- gerar notificação `PAGAMENTO_CONFIRMADO`

Endpoint de webhook:

```http
POST /api/v1/pagamentos/webhooks/infinitepay
```

## Provedores De Dados Esportivos

O backend agora possui uma camada interna para configuração de provedores esportivos externos, permitindo trocar o provedor ativo sem alterar as regras de negócio do bolão.

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

Arquitetura já preparada para expansão futura:

- `api-football`
- `rapidapi`
- `outros`

Regras atuais:

- o `api_token` fica somente no backend
- o token não deve ser exposto no frontend
- o token não deve ser escrito em logs
- se o provedor estiver desabilitado, o job de sincronização não deve executar
- quando a sincronização estiver desabilitada ou inválida, a factory registra apenas um aviso controlado, sem vazar segredos

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

O provider também pode ser configurado pelo painel web:

- menu `Configurações`
- seção `Provedores esportivos`
- disponível para `proprietario` e `administrador`
- exibe apenas token mascarado, nunca o token completo
- permite alterar `base_url`, `sync_interval_seconds`, `api_token` e ativar/desativar o provider

Endpoints administrativos:

- `GET /api/v1/provedores-esportivos`
- `PUT /api/v1/provedores-esportivos/:provider`
- `PATCH /api/v1/provedores-esportivos/:provider/status`
- `GET /api/v1/provedores-esportivos/football-data/partidas`

Esses endpoints são protegidos por autenticação e aceitam apenas `proprietario` ou `administrador`. As respostas são sanitizadas e nunca retornam `api_token` completo.

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
- vincular/desvincular nao altera placar nem dispara recálculo
- o recálculo continua ocorrendo apenas quando a sincronização externa atualizar resultado confirmado com mudança relevante

Módulo interno criado:

- `src/modules/provedores_esportivos/provedores_esportivos.repository.js`
- `src/modules/provedores_esportivos/provedores_esportivos.service.js`
- `src/modules/provedores_esportivos/provider-factory.js`
- `src/modules/provedores_esportivos/football-data-sync.service.js`
- `src/modules/provedores_esportivos/sports-data-sync.job.js`

A factory interna resolve o provedor ativo para jobs futuros de sincronização e também permite marcar `last_sync_at` após uma execução bem-sucedida.

### Sincronização Football-Data.org

O job interno de dados esportivos é iniciado junto com o servidor e acorda a cada 1 minuto.

Regras da sincronização atual:

- executa apenas quando o provider ativo for `football-data`
- exige `enabled = true`
- exige `api_token` preenchido
- usa `base_url` da tabela `provedores_dados_esportivos`
- respeita `sync_interval_seconds`, com mínimo efetivo de 60 segundos
- faz no máximo 1 chamada HTTP por execução
- consulta `GET {base_url}/matches`
- envia o header `X-Auth-Token`
- não registra o token em logs
- trata HTTP `429` como rate limit com aviso controlado
- atualiza `last_sync_at` apenas quando a consulta ao provider é bem-sucedida
- protege contra execução simultânea no mesmo processo

A sincronização não cria partidas automaticamente. Ela atualiza somente partidas já cadastradas e vinculadas pelo campo:

- `partidas.football_data_match_id`

Quando um jogo externo chega como `FINISHED` e possui placar completo em `score.fullTime.home` e `score.fullTime.away`, o sistema:

- atualiza o placar da partida vinculada
- marca `resultado_confirmado = true`
- reaproveita o fluxo atual de resultado para auditoria, recálculo de pontuação, ranking e notificações

Se não houver mudança relevante em status, data/hora ou placar, nada é salvo e nenhum recálculo é disparado.

## Principais Endpoints

### Auth

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/selecionar-bolao`
- `POST /api/v1/auth/trocar-bolao`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/meu-perfil`
- `PUT /api/v1/auth/meu-perfil`
- `PUT /api/v1/auth/minha-senha`

### Proprietário

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
- `PATCH /api/v1/partidas/:id/vinculo-externo`
- `DELETE /api/v1/partidas/:id/vinculo-externo`

Campos de time atualmente suportados:

- `nome`
- `sigla`
- `codigoFifa`
- `escudoUrl`
- `bandeiraUrl`
- `pais`
- `status`

### Configurações Do Bolão

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

Ordem atual de aplicação:

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
```

## Setup Local

```bash
npm install
cp .env.example .env
npm run dev
```

Variáveis mínimas:

- `DATABASE_URL`
- `AUTH_TOKEN_SECRET`
- `AUTH_TOKEN_EXPIRES_IN_SECONDS`
- `AUTH_SELECTION_TOKEN_EXPIRES_IN_SECONDS`
- `INFINITEPAY_API_URL`
- `INFINITEPAY_HANDLE`

## Deploy E PM2

Diretório atual no servidor:

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

Health checks úteis:

- `GET /api/v1/health`
- `GET /app/login.html`
- `GET /app/app.html`

## Roteiro Básico De Operação

### Proprietário

1. Criar bolão
2. Criar administrador
3. Vincular administrador ao bolão
4. Ajustar configurações gerais

### Administrador

1. Criar participantes
2. Confirmar ou gerar credenciais do apostador
3. Configurar fases, times e partidas
   os times agora podem receber `escudo_url`, `bandeira_url` e `codigo_fifa/sigla` para exibição visual no app
4. Configurar regras do bolão
5. Acompanhar pagamentos
6. Lançar resultados

### Apostador

1. Fazer login
2. Selecionar bolão, se houver mais de um
3. Consultar regras, jogos e ranking
4. Registrar ou alterar apostas dentro do prazo
5. Acompanhar notificações e perfil

## Observações Operacionais

- O backend e o frontend publicados estão prontos para piloto controlado.
- Partidas, palpites e listas de times exibem escudo ou bandeira quando configurados, com fallback visual para sigla/iniciais.
- O dashboard premium da Home usa endpoints existentes e respeita sempre o bolão selecionado.
- O ranking mantém a mesma regra de cálculo de pontos e usa apenas melhorias visuais e de leitura no frontend.
- A leitura de ranking (`GET /api/v1/ranking/boloes/:bolaoId/atual`) não recalcula nem grava dados. O ranking é atualizado pelos fluxos de resultado confirmado ou pelos endpoints POST de recálculo.
- Ao editar uma partida, o recálculo automático ocorre apenas quando há mudança relevante no resultado: placar, status ou confirmação do resultado. Alterações em dados operacionais como data, estádio ou outros campos não relacionados ao resultado não geram novo recálculo, auditoria ou notificação.
- A rotina Football-Data.org atualiza somente partidas vinculadas por `football_data_match_id` e dispara o recálculo apenas quando o resultado externo muda a partida de forma relevante.
- O upgrade visual global não altera regras de negócio, endpoints, autenticação, pontuação ou banco de dados.
- A integração InfinitePay está preparada, mas depende da `INFINITEPAY_HANDLE` real no `.env`.
- Provedores esportivos externos são configurados no banco pela tabela `provedores_dados_esportivos`. O provedor ativo é resolvido por factory interna, e a leitura da configuração não expõe `api_token`.
- O servidor atualmente roda `Node 18.19.1`, enquanto o projeto declara `>=20` em `package.json`.
- Isso não impediu a operação atual, mas é um risco técnico de compatibilidade futura. A recomendação é migrar o runtime do servidor para `Node 20 LTS` antes de expandir o uso além do piloto.

## Organização

- arquitetura: `docs/architecture.md`
- migrations: `db/migrations`
- módulos de domínio: `src/modules`
- provedores esportivos: `src/modules/provedores_esportivos`
- app unificado: `public/app.html`, `public/app.js`, `public/theme.css`
