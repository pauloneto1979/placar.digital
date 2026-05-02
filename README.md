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
- `GET /api/v1/notificacoes/boloes/:bolaoId/minhas`
- `PATCH /api/v1/notificacoes/boloes/:bolaoId/:id/lida`
- `GET /api/v1/notificacoes/boloes/:bolaoId`
- `POST /api/v1/notificacoes/boloes/:bolaoId/manual/todos`
- `POST /api/v1/notificacoes/boloes/:bolaoId/:id/cancelar`
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
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/005_boloes_usuarios_admin_links.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/006_administrador_operacional.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/007_apostador_module.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/008_motor_pontuacao.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/009_ranking_premiacao.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/010_notificacoes.sql
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/011_revisao_consistencia.sql
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
- administrador pode alterar apenas bolao ao qual esta vinculado em `boloes_usuarios`
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

## Modulo Administrador

Rotas operacionais protegidas por Bearer token:

- `GET|POST /api/v1/participantes/boloes/:bolaoId`
- `PUT /api/v1/participantes/boloes/:bolaoId/:id`
- `PATCH /api/v1/participantes/boloes/:bolaoId/:id/status`
- `GET|POST /api/v1/pagamentos/boloes/:bolaoId`
- `PUT /api/v1/pagamentos/boloes/:bolaoId/:id`
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
- `POST /api/v1/partidas/boloes/:bolaoId/:id/resultado`

Permissoes:

- proprietario administra qualquer bolao
- administrador administra apenas boloes vinculados em `boloes_usuarios`
- apostador nao acessa rotas administrativas

Tela estatica de apoio:

```text
/app/administrador.html
```

## Modulo Apostador

Rotas protegidas por Bearer token:

- `GET /api/v1/apostas/boloes/:bolaoId/dashboard`
- `GET /api/v1/apostas/boloes/:bolaoId/jogos`
- `POST /api/v1/apostas/boloes/:bolaoId`
- `PUT /api/v1/apostas/boloes/:bolaoId`
- `GET /api/v1/apostas/boloes/:bolaoId/minhas`
- `GET /api/v1/apostas/boloes/:bolaoId/regras`
- `GET /api/v1/ranking/boloes/:bolaoId/atual`
- `GET /api/v1/ranking/boloes/:bolaoId/provisorio`
- `GET /api/v1/ranking/boloes/:bolaoId/meu`
- `GET /api/v1/ranking/boloes/:bolaoId/premiacao`
- `GET /api/v1/ranking/boloes/:bolaoId/regras`
- `GET /api/v1/notificacoes/boloes/:bolaoId/minhas`
- `PATCH /api/v1/notificacoes/boloes/:bolaoId/:id/lida`
- `POST /api/v1/ranking/boloes/:bolaoId/recalcular`
- `POST /api/v1/ranking/boloes/:bolaoId/partidas/:partidaId/recalcular`

Permissoes:

- apostador usa apenas o `bolaoId` e `participanteId` do token
- proprietario e administrador podem visualizar dados do bolao
- somente apostador pode registrar ou alterar aposta

Tela estatica de apoio:

```text
/app/apostador.html
```

## Motor de Pontuacao

O motor aplica apenas uma regra por aposta. A regra vencedora e a de maior `prioridade`; em empate, a de maior `pontos`.

Regras iniciais:

- `PLACAR_EXATO`
- `RESULTADO_CORRETO`
- `PLACAR_INVERTIDO`

O recálculo acontece automaticamente quando o administrador informa resultado de uma partida e também pode ser disparado manualmente pelas rotas de ranking.

## Ranking, Desempate E Premiacao

O ranking atual usa as pontuacoes persistidas em `pontuacoes_apostas` e reconstrui `ranking` com:

- total de pontos
- total de apostas validas calculadas
- placares exatos
- resultados corretos
- placares invertidos
- diferenca total de gols
- ordem de pagamento
- posicao
- premio previsto

Desempate:

- pontos sempre ordenam primeiro
- criterios ativos de `criterios_desempate` sao aplicados por `ordem`
- codigos contendo `EXATO`, `RESULTADO`, `INVERTIDO`, `DIFERENCA`, `PAGAMENTO` ou `ALFABET` sao reconhecidos
- se ainda houver empate, o nome do participante decide

Premiacao:

- considera apenas pagamentos com `status = 'pago'`
- usa distribuicoes ativas em `distribuicao_premios`
- valida que a soma dos percentuais ativos nao ultrapasse 100%
- posicoes sem distribuicao recebem premio previsto zero

## Notificacoes

O modulo `notificacoes` registra mensagens internas para integracao futura com email, WhatsApp ou push.

Tipos iniciais:

- `JOGO_VAI_COMECAR`
- `APOSTA_ENCERRANDO`
- `RESULTADO_LANCADO`
- `RANKING_ATUALIZADO`
- `PAGAMENTO_CONFIRMADO`

Rotas:

- apostador lista suas notificacoes em `GET /api/v1/notificacoes/boloes/:bolaoId/minhas`
- apostador marca como lida em `PATCH /api/v1/notificacoes/boloes/:bolaoId/:id/lida`
- proprietario/administrador lista o bolao em `GET /api/v1/notificacoes/boloes/:bolaoId`
- proprietario/administrador cria aviso manual para todos em `POST /api/v1/notificacoes/boloes/:bolaoId/manual/todos`
- proprietario/administrador cancela pendente em `POST /api/v1/notificacoes/boloes/:bolaoId/:id/cancelar`

Geracao automatica:

- resultado de partida lancado
- ranking recalculado
- pagamento marcado como pago

Se `configuracoes_gerais` tiver `notificacoes.ativas = false`, novas notificacoes automaticas nao sao geradas.

## Organizacao

O padrao de arquitetura esta documentado em `docs/architecture.md`.
