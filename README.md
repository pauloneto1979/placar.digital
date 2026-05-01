# placar.digital

Projeto inicial do `placar.digital`, usando Node.js, Express e PostgreSQL.

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

3. Ajuste `DATABASE_URL` no `.env` com usuario, senha, banco e porta reais do PostgreSQL.

4. Inicie a aplicacao:

   ```bash
   npm run dev
   ```

5. Teste:

   ```bash
   curl http://localhost:3001/health
   ```

## Banco de dados

O schema inicial esta em `db/schema.sql`.

No servidor Linux, um fluxo simples com `psql` seria:

```bash
psql "postgres://USUARIO:SENHA@192.168.0.119:5432/placar_digital" -f db/schema.sql
```

## Proximos passos sugeridos

- Definir o modelo principal do placar: jogos, equipes, campeonatos e usuarios.
- Criar as credenciais reais do banco no PostgreSQL.
- Configurar deploy no servidor Linux.
