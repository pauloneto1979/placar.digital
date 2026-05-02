# Testes Do Fluxo Completo

Este roteiro valida o fluxo principal do Placar.digital de ponta a ponta.

## Preparacao

1. Aplique todas as migrations ate `011_revisao_consistencia.sql`.
2. Inicie a API com `npm run dev`.
3. Tenha uma credencial de proprietario ativa em `usuarios`.
4. Use `Authorization: Bearer <token>` nas rotas protegidas.

## Roteiro Manual No Postman

1. Login proprietario:
   `POST /api/v1/auth/login`

2. Criar bolao:
   `POST /api/v1/proprietario/boloes`

3. Criar administrador:
   `POST /api/v1/proprietario/usuarios`

4. Vincular administrador:
   `POST /api/v1/proprietario/boloes/:bolaoId/administradores`

5. Login administrador:
   `POST /api/v1/auth/login`

6. Criar participante com credencial:
   `POST /api/v1/participantes/boloes/:bolaoId`

7. Criar segundo bolao e cadastrar o mesmo email de apostador nele para validar selecao.

8. Login apostador:
   `POST /api/v1/auth/login`
   Deve retornar `bolao_selection_required` se houver mais de um bolao.

9. Selecionar bolao:
   `POST /api/v1/auth/selecionar-bolao`
   O token final deve conter `bolaoId`, `papel = apostador` e `participanteId`.

10. Criar fase:
    `POST /api/v1/fases/boloes/:bolaoId`

11. Criar dois times:
    `POST /api/v1/times/boloes/:bolaoId`

12. Criar partida:
    `POST /api/v1/partidas/boloes/:bolaoId`

13. Configurar bolao:
    `POST /api/v1/configuracoes-bolao/:bolaoId/configuracao`

14. Criar regras:
    `POST /api/v1/configuracoes-bolao/:bolaoId/regras-pontuacao`
    Use `PLACAR_EXATO`, `RESULTADO_CORRETO` e `PLACAR_INVERTIDO`.

15. Criar desempate:
    `POST /api/v1/configuracoes-bolao/:bolaoId/criterios-desempate`

16. Criar premiacao:
    `POST /api/v1/configuracoes-bolao/:bolaoId/distribuicao-premios`

17. Criar pagamento pago:
    `POST /api/v1/pagamentos/boloes/:bolaoId`

18. Apostador registra aposta:
    `POST /api/v1/apostas/boloes/:bolaoId`

19. Admin informa resultado:
    `POST /api/v1/partidas/boloes/:bolaoId/:partidaId/resultado`

20. Validar ranking:
    `GET /api/v1/ranking/boloes/:bolaoId/atual`

21. Validar premiacao:
    `GET /api/v1/ranking/boloes/:bolaoId/premiacao`

22. Validar notificacoes:
    `GET /api/v1/notificacoes/boloes/:bolaoId/minhas`

23. Validar bloqueios:
    - token de apostador em `POST /api/v1/fases/boloes/:bolaoId` deve retornar `403`
    - token de admin sem vinculo em outro bolao deve retornar `403`
    - token de apostador tentando acessar outro `bolaoId` deve retornar `403`

## Teste Automatizado Opcional

Execute contra uma API real:

```bash
set PD_API_BASE=http://127.0.0.1:3001/api/v1
set PD_OWNER_EMAIL=proprietario@email.com
set PD_OWNER_PASSWORD=senha
npm run test:e2e:flow
```

No PowerShell:

```powershell
$env:PD_API_BASE = "http://127.0.0.1:3001/api/v1"
$env:PD_OWNER_EMAIL = "proprietario@email.com"
$env:PD_OWNER_PASSWORD = "senha"
npm run test:e2e:flow
```

O script cria dados com sufixo unico e valida:

- criacao de bolao
- criacao e vinculo de administrador
- credencial de apostador
- selecao de bolao
- fase, times e partida
- configuracoes do bolao
- aposta
- resultado, pontuacao, ranking e premiacao
- notificacoes automaticas
- bloqueios de permissao
