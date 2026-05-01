# placar.digital

Sistema de bolao esportivo multi-tenant, preparado para operar como SaaS com perfis de Proprietario, Administrador e Apostador.

Esta etapa cria apenas a fundacao tecnica: estrutura modular, API base, ambiente e conexao PostgreSQL. Regras de negocio serao implementadas nas proximas etapas.

## Stack

- Node.js
- Express
- PostgreSQL
- Arquitetura modular por dominio

## Infraestrutura informada

- PostgreSQL: `192.168.0.119`
- Servidor Linux: `192.168.0.119`
- Edicao no servidor: `nano`
- GitHub: `https://github.com/pauloneto1979/placar.digital.git`

## Configuracao local

1. Instale as dependencias:

   ```bash
   npm install
   ```

2. Crie o arquivo `.env` a partir do exemplo:

   ```bash
   cp .env.example .env
   ```

3. Ajuste `DATABASE_URL` com usuario, senha, banco e porta reais do PostgreSQL.

4. Inicie a aplicacao:

   ```bash
   npm run dev
   ```

## Rotas iniciais

- `GET /`
- `GET /api/v1/health`
- `GET /api/v1/auth`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/selecionar-bolao`
- `GET /api/v1/auth/me`
- `GET /api/v1/proprietario/boloes`
- `POST /api/v1/proprietario/boloes`
- `PUT /api/v1/proprietario/boloes/:id`
- `POST /api/v1/proprietario/boloes/:id/fechar`
- `GET /api/v1/proprietario/usuarios`
- `POST /api/v1/proprietario/usuarios`
- `PUT /api/v1/proprietario/usuarios/:id`
- `PATCH /api/v1/proprietario/usuarios/:id/status`
- `GET /api/v1/proprietario/boloes/:bolaoId/administradores`
- `POST /api/v1/proprietario/boloes/:bolaoId/administradores`
- `DELETE /api/v1/proprietario/boloes/:bolaoId/administradores/:usuarioId`
- `GET /api/v1/proprietario/configuracoes-gerais`
- `PUT /api/v1/proprietario/configuracoes-gerais`
- `GET /api/v1/usuarios`
- `GET /api/v1/boloes`
- `GET /api/v1/participantes`
- `GET /api/v1/fases`
- `GET /api/v1/times`
- `GET /api/v1/partidas`
- `GET /api/v1/apostas`
- `GET /api/v1/ranking`
- `GET /api/v1/pagamentos`
- `GET /api/v1/configuracoes-bolao`
- `GET /api/v1/configuracoes-bolao/:bolaoId`
- `GET /api/v1/configuracoes-bolao/:bolaoId/configuracao`
- `POST /api/v1/configuracoes-bolao/:bolaoId/configuracao`
- `PUT /api/v1/configuracoes-bolao/:bolaoId/configuracao/:configuracaoId`
- `GET /api/v1/configuracoes-bolao/:bolaoId/regras-pontuacao`
- `POST /api/v1/configuracoes-bolao/:bolaoId/regras-pontuacao`
- `PUT /api/v1/configuracoes-bolao/:bolaoId/regras-pontuacao/:regraId`
- `DELETE /api/v1/configuracoes-bolao/:bolaoId/regras-pontuacao/:regraId`
- `GET /api/v1/configuracoes-bolao/:bolaoId/criterios-desempate`
- `POST /api/v1/configuracoes-bolao/:bolaoId/criterios-desempate`
- `PUT /api/v1/configuracoes-bolao/:bolaoId/criterios-desempate/:criterioId`
- `DELETE /api/v1/configuracoes-bolao/:bolaoId/criterios-desempate/:criterioId`
- `GET /api/v1/configuracoes-bolao/:bolaoId/distribuicao-premios`
- `POST /api/v1/configuracoes-bolao/:bolaoId/distribuicao-premios`
- `PUT /api/v1/configuracoes-bolao/:bolaoId/distribuicao-premios/:distribuicaoId`
- `DELETE /api/v1/configuracoes-bolao/:bolaoId/distribuicao-premios/:distribuicaoId`
- `GET /api/v1/configuracoes-gerais`
- `GET /api/v1/notificacoes`
- `GET /api/v1/auditoria`

## Banco de dados

As migrations ficam em `db/migrations`.

A migration inicial cria usuarios, participantes, boloes, configuracoes, regras de pontuacao, fases, times, partidas, apostas, ranking, pagamentos, notificacoes e auditoria.

No servidor Linux:

```bash
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/001_initial_schema.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/002_auth_email_indexes.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/003_proprietario_module.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/004_configuracoes_bolao.sql
```

## Autenticacao

O login por email usa `POST /api/v1/auth/login`:

```json
{
  "email": "usuario@email.com",
  "senha": "senha"
}
```

Fluxo apos login:

- Proprietario recebe `accessToken` direto.
- Administrador ou apostador com um unico bolao recebe `accessToken` ja vinculado ao bolao.
- Administrador ou apostador com mais de um bolao recebe `selectionToken` e lista de `boloes`.

Para selecionar o bolao:

```json
{
  "selectionToken": "token",
  "bolaoId": "uuid-do-bolao"
}
```

As senhas devem ser armazenadas em `usuarios.senha_hash` no formato PBKDF2 gerado pelo utilitario `src/shared/utils/password.js`.

## Modulo Proprietario

O modulo do proprietario fica em `/api/v1/proprietario` e exige Bearer token com `perfilGlobal` igual a `proprietario`.

A tela estatica de apoio fica em:

```text
/app/proprietario.html
```

Ela tambem valida o perfil no frontend usando `GET /api/v1/auth/me`, mas a protecao oficial continua no backend.

## Configuracoes do Bolao

O modulo `configuracoes_bolao` pertence a um bolao especifico, diferente das configuracoes gerais da plataforma.

Seguranca:

- todas as rotas exigem Bearer token
- proprietario pode alterar qualquer bolao
- administrador pode alterar apenas bolao ao qual esta vinculado
- apostador pode visualizar configuracoes ativas do bolao selecionado no token

Exemplo de configuracao principal:

```json
{
  "minutosAntecedenciaAposta": 15,
  "tipoDistribuicaoPremio": "percentual",
  "observacoesRegras": "Apostas bloqueiam 15 minutos antes da partida.",
  "ativo": true
}
```

Exemplo de regra de pontuacao:

```json
{
  "codigo": "PLACAR_EXATO",
  "descricao": "Acertou o placar exato",
  "pontos": 10,
  "prioridade": 100,
  "ativo": true
}
```

A pontuacao configurada e nao cumulativa. Quando mais de uma regra se aplicar, o calculo futuro devera usar a maior prioridade e depois a maior pontuacao.

## Organizacao

O padrao de arquitetura esta documentado em `docs/architecture.md`.
