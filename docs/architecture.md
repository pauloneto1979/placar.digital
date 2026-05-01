# Padrao de organizacao

O Placar.digital comeca como uma API modular em Node.js, Express e PostgreSQL.

## Perfis previstos

- Proprietario
- Administrador
- Apostador

## Camadas por modulo

Cada dominio em `src/modules` segue o mesmo desenho:

- `*.routes.js`: declara rotas HTTP do modulo
- `*.controller.js`: traduz requisicao/resposta HTTP
- `*.service.js`: recebera regras de negocio nas proximas etapas
- `*.repository.js`: ponto de acesso ao PostgreSQL
- `index.js`: exporta a interface publica do modulo

## Modulos

- `auth`
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

## Rotas base

- `GET /`: status da aplicacao
- `GET /api/v1/health`: status da API e conexao com banco
- `GET /api/v1/{modulo}`: status estrutural do modulo

## Banco de dados

As migrations SQL ficam em `db/migrations`.

A migration inicial segue estas regras:

- usuarios e participantes sao entidades diferentes
- o sistema suporta multiplos boloes
- configuracoes globais ficam separadas das configuracoes por bolao
- regras de pontuacao ficam em tabela propria e sao configuraveis por bolao
- pagamentos pertencem a uma participacao em um bolao
- auditoria e obrigatoria para registrar eventos relevantes

## Autenticacao por email

O modulo `auth` expoe:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/selecionar-bolao`
- `GET /api/v1/auth/me`

Fluxo:

- proprietario autentica e recebe token direto
- administrador ou apostador com um bolao recebe token com contexto do bolao
- administrador ou apostador com mais de um bolao recebe token temporario de selecao
- a selecao de bolao emite o token final com `bolaoId`, `participanteId` e `papel`

## Modulo Proprietario

O modulo `src/modules/proprietario` concentra operacoes globais da plataforma:

- cadastro, alteracao, fechamento e listagem de boloes
- cadastro, alteracao e ativacao/inativacao de usuarios de sistema
- vinculo e remocao de administradores em boloes
- configuracoes gerais da plataforma

Seguranca:

- todas as rotas usam `authMiddleware`
- todas as rotas exigem `perfilGlobal = proprietario`
- usuarios de sistema aceitam apenas `proprietario` e `administrador`
- vinculos em boloes aceitam apenas administradores ativos
- remocao e feita por status, sem exclusao fisica

Frontend:

- `/app/proprietario.html` e uma tela estatica de apoio
- a tela valida o token com `/api/v1/auth/me`
- o bloqueio obrigatorio permanece no backend
