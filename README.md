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
- A integração InfinitePay está preparada, mas depende da `INFINITEPAY_HANDLE` real no `.env`.
- O servidor atualmente roda `Node 18.19.1`, enquanto o projeto declara `>=20` em `package.json`.
- Isso não impediu a operação atual, mas é um risco técnico de compatibilidade futura. A recomendação é migrar o runtime do servidor para `Node 20 LTS` antes de expandir o uso além do piloto.

## Organização

- arquitetura: `docs/architecture.md`
- migrations: `db/migrations`
- módulos de domínio: `src/modules`
- app unificado: `public/app.html`, `public/app.js`, `public/theme.css`
