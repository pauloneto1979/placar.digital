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
- a selecao de bolao emite o token final com `bolaoId`, `papel` e `participanteId` ou `vinculoAdministrativoId`

## Modulo Proprietario

O modulo `src/modules/proprietario` concentra operacoes globais da plataforma:

- cadastro, alteracao, fechamento e listagem de boloes
- cadastro, alteracao e ativacao/inativacao de usuarios de sistema
- vinculo e remocao de administradores em boloes usando `boloes_usuarios`
- configuracoes gerais da plataforma

Seguranca:

- todas as rotas usam `authMiddleware`
- todas as rotas exigem `perfilGlobal = proprietario`
- usuarios de sistema aceitam apenas `proprietario` e `administrador`
- vinculos em boloes aceitam apenas administradores ativos e ficam em `boloes_usuarios`
- remocao e feita por status, sem exclusao fisica

Frontend:

- `/app/proprietario.html` e uma tela estatica de apoio
- a tela valida o token com `/api/v1/auth/me`
- o bloqueio obrigatorio permanece no backend

## Configuracoes Do Bolao

O modulo `src/modules/configuracoes_bolao` gerencia regras especificas de um bolao:

- configuracao principal ativa do bolao
- regras de pontuacao configuraveis
- criterios de desempate
- distribuicao de premios por posicao

Separacao:

- `configuracoes_gerais` pertence a plataforma
- `configuracoes_bolao` pertence a um bolao

Permissoes:

- proprietario altera qualquer bolao
- administrador altera apenas boloes vinculados em `boloes_usuarios`
- apostador visualiza apenas dados ativos do bolao selecionado no token

Politica de pontuacao:

- regras nao sao cumulativas
- a aplicacao futura deve selecionar a regra de maior prioridade
- em empate de prioridade, deve selecionar a regra de maior pontuacao

## Modulo Administrador

O modulo administrativo operacional usa os modulos existentes:

- `participantes`
- `pagamentos`
- `fases`
- `times`
- `partidas`
- `auditoria`

Permissoes:

- proprietario administra qualquer bolao
- administrador administra somente boloes vinculados em `boloes_usuarios`
- apostador/participante nao acessa operacoes administrativas
- participantes nao sao usados para validar permissao de administrador

Auditoria:

- alteracao de resultado de partida registra `auditoria_logs`
- a acao registrada e `informar_resultado`

## Modulo Apostador

O modulo do apostador usa:

- `apostas`
- `ranking`
- `partidas`
- `configuracoes_bolao`

Regras:

- apostador acessa apenas o bolao selecionado no token
- apostas usam `participanteId` do token
- apostador nao altera cadastros administrativos
- ranking e provisório ate o motor de pontuacao ser implementado

## Motor De Pontuacao

O motor fica no modulo `ranking`.

Regras:

- pontuacao nao cumulativa
- maior prioridade vence
- em empate de prioridade, maior pontuacao vence
- partidas precisam estar finalizadas e com placar
- apostas canceladas nao pontuam
- recálculo de resultado atualiza `pontuacoes_apostas`, `apostas.pontos_calculados` e `ranking`

## Ranking, Desempate E Premiacao

O ranking final/atual tambem fica no modulo `ranking`.

Responsabilidades:

- montar a base de pontos a partir de `pontuacoes_apostas`
- aplicar criterios ativos de `criterios_desempate` por ordem configurada
- persistir metricas consolidadas em `ranking`
- calcular premio previsto a partir de pagamentos pagos e `distribuicao_premios`

Desempates suportados:

- maior numero de placares exatos
- maior numero de resultados corretos
- maior numero de placares invertidos
- menor diferenca total de gols
- ordem de pagamento
- ordem alfabetica

Permissoes:

- apostador visualiza apenas o bolao selecionado no token
- administrador visualiza e recalcula apenas boloes vinculados em `boloes_usuarios`
- proprietario visualiza e recalcula qualquer bolao
