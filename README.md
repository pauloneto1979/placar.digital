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
- `GET /api/v1/configuracoes-gerais`
- `GET /api/v1/notificacoes`
- `GET /api/v1/auditoria`

## Banco de dados

As migrations ficam em `db/migrations`.

A migration inicial cria usuarios, participantes, boloes, configuracoes, regras de pontuacao, fases, times, partidas, apostas, ranking, pagamentos, notificacoes e auditoria.

No servidor Linux:

```bash
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/migrations/001_initial_schema.sql
```

## Organizacao

O padrao de arquitetura esta documentado em `docs/architecture.md`.
