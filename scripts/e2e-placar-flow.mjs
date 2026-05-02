const baseUrl = process.env.PD_API_BASE || 'http://127.0.0.1:3001/api/v1';
const ownerEmail = process.env.PD_OWNER_EMAIL;
const ownerPassword = process.env.PD_OWNER_PASSWORD;
const suffix = `${Date.now()}`;

if (!ownerEmail || !ownerPassword) {
  console.error('Defina PD_OWNER_EMAIL e PD_OWNER_PASSWORD para rodar o fluxo completo.');
  process.exit(1);
}

const state = {
  ownerToken: null,
  adminToken: null,
  bettorToken: null,
  bettorSelectionToken: null,
  bolaoId: null,
  segundoBolaoId: null,
  adminId: null,
  participanteId: null,
  faseId: null,
  timeMandanteId: null,
  timeVisitanteId: null,
  partidaId: null,
  pagamentoId: null
};

function log(step) {
  console.log(`\n== ${step}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(method, path, { token, body, expect = [200, 201] } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => null);
  const expectedStatuses = Array.isArray(expect) ? expect : [expect];

  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`${method} ${path} retornou ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function login(email, senha) {
  return request('POST', '/auth/login', { body: { email, senha } });
}

async function main() {
  const adminEmail = `admin.e2e.${suffix}@placar.test`;
  const adminPassword = `Admin@${suffix}`;
  const bettorEmail = `apostador.e2e.${suffix}@placar.test`;
  const bettorPassword = `Aposta@${suffix}`;

  log('1. Proprietario faz login');
  const ownerLogin = await login(ownerEmail, ownerPassword);
  state.ownerToken = ownerLogin.accessToken;
  assert(state.ownerToken, 'Login do proprietario nao retornou accessToken.');

  log('2. Proprietario cria dois boloes');
  const bolao = await request('POST', '/proprietario/boloes', {
    token: state.ownerToken,
    body: {
      nome: `Bolao E2E ${suffix}`,
      slug: `bolao-e2e-${suffix}`,
      descricao: 'Bolao criado pelo teste automatizado.',
      dataInicio: new Date().toISOString(),
      dataFim: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'ativo'
    }
  });
  state.bolaoId = bolao.id;

  const segundoBolao = await request('POST', '/proprietario/boloes', {
    token: state.ownerToken,
    body: {
      nome: `Bolao E2E Extra ${suffix}`,
      slug: `bolao-e2e-extra-${suffix}`,
      descricao: 'Bolao extra para validar selecao do apostador.',
      status: 'ativo'
    }
  });
  state.segundoBolaoId = segundoBolao.id;

  log('3. Proprietario cria administrador e vincula ao primeiro bolao');
  const admin = await request('POST', '/proprietario/usuarios', {
    token: state.ownerToken,
    body: {
      nome: `Admin E2E ${suffix}`,
      email: adminEmail,
      senha: adminPassword,
      perfil: 'administrador',
      status: 'ativo'
    }
  });
  state.adminId = admin.id;

  await request('POST', `/proprietario/boloes/${state.bolaoId}/administradores`, {
    token: state.ownerToken,
    body: { usuarioId: state.adminId }
  });

  log('4. Admin faz login no bolao vinculado');
  const adminLogin = await login(adminEmail, adminPassword);
  state.adminToken = adminLogin.accessToken;
  assert(state.adminToken, 'Login do admin com um bolao deveria retornar accessToken.');

  log('5. Admin cria participante e credencial apostador');
  const participante = await request('POST', `/participantes/boloes/${state.bolaoId}`, {
    token: state.adminToken,
    body: {
      nome: `Apostador E2E ${suffix}`,
      email: bettorEmail,
      telefone: '11999999999',
      status: 'ativo',
      senhaInicial: bettorPassword
    }
  });
  state.participanteId = participante.id;
  assert(participante.usuarioId, 'Participante deveria retornar usuarioId vinculado.');
  assert(participante.credencialApostador?.criada === true, 'Credencial de apostador deveria ter sido criada.');

  log('6. Proprietario vincula mesmo apostador a outro bolao para validar selecao');
  await request('POST', `/participantes/boloes/${state.segundoBolaoId}`, {
    token: state.ownerToken,
    body: {
      nome: `Apostador E2E ${suffix}`,
      email: bettorEmail,
      telefone: '11999999999',
      status: 'ativo'
    }
  });

  log('7. Apostador faz login e seleciona bolao');
  const bettorLogin = await login(bettorEmail, bettorPassword);
  assert(bettorLogin.status === 'bolao_selection_required', 'Apostador com dois boloes deveria exigir selecao.');
  state.bettorSelectionToken = bettorLogin.selectionToken;

  const bettorSelection = await request('POST', '/auth/selecionar-bolao', {
    body: {
      selectionToken: state.bettorSelectionToken,
      bolaoId: state.bolaoId
    }
  });
  state.bettorToken = bettorSelection.accessToken;
  assert(bettorSelection.selectedBolao?.participanteId === state.participanteId, 'Token final deve conter participanteId do bolao selecionado.');

  log('8. Admin cria fase, times e partida');
  const fase = await request('POST', `/fases/boloes/${state.bolaoId}`, {
    token: state.adminToken,
    body: { nome: `Fase E2E ${suffix}`, ordem: 1, tipo: 'grupos', status: 'ativa' }
  });
  state.faseId = fase.id;

  const mandante = await request('POST', `/times/boloes/${state.bolaoId}`, {
    token: state.adminToken,
    body: { nome: `Mandante E2E ${suffix}`, sigla: 'MDE', pais: 'BR', status: 'ativo' }
  });
  state.timeMandanteId = mandante.id;

  const visitante = await request('POST', `/times/boloes/${state.bolaoId}`, {
    token: state.adminToken,
    body: { nome: `Visitante E2E ${suffix}`, sigla: 'VTE', pais: 'BR', status: 'ativo' }
  });
  state.timeVisitanteId = visitante.id;

  const partida = await request('POST', `/partidas/boloes/${state.bolaoId}`, {
    token: state.adminToken,
    body: {
      faseId: state.faseId,
      timeMandanteId: state.timeMandanteId,
      timeVisitanteId: state.timeVisitanteId,
      dataHora: new Date(Date.now() + 3600000).toISOString(),
      estadio: 'Estadio E2E',
      status: 'agendada'
    }
  });
  state.partidaId = partida.id;

  log('9. Admin configura pontuacao, desempate e premiacao');
  await request('POST', `/configuracoes-bolao/${state.bolaoId}/configuracao`, {
    token: state.adminToken,
    body: {
      minutosAntecedenciaAposta: 0,
      tipoDistribuicaoPremio: 'percentual',
      observacoesRegras: 'Teste E2E',
      ativo: true
    }
  });

  await request('POST', `/configuracoes-bolao/${state.bolaoId}/regras-pontuacao`, {
    token: state.adminToken,
    body: { codigo: 'PLACAR_EXATO', descricao: 'Placar exato', pontos: 10, prioridade: 100, ativo: true }
  });
  await request('POST', `/configuracoes-bolao/${state.bolaoId}/regras-pontuacao`, {
    token: state.adminToken,
    body: { codigo: 'RESULTADO_CORRETO', descricao: 'Resultado correto', pontos: 5, prioridade: 50, ativo: true }
  });
  await request('POST', `/configuracoes-bolao/${state.bolaoId}/regras-pontuacao`, {
    token: state.adminToken,
    body: { codigo: 'PLACAR_INVERTIDO', descricao: 'Placar invertido', pontos: 2, prioridade: 10, ativo: true }
  });
  await request('POST', `/configuracoes-bolao/${state.bolaoId}/criterios-desempate`, {
    token: state.adminToken,
    body: { codigo: 'MAIOR_PLACARES_EXATOS', descricao: 'Mais placares exatos', ordem: 1, ativo: true }
  });
  await request('POST', `/configuracoes-bolao/${state.bolaoId}/distribuicao-premios`, {
    token: state.adminToken,
    body: { posicao: 1, percentual: 100, descricao: 'Campeao', ativo: true }
  });

  log('10. Admin registra pagamento pago');
  const pagamento = await request('POST', `/pagamentos/boloes/${state.bolaoId}`, {
    token: state.adminToken,
    body: {
      participanteId: state.participanteId,
      status: 'pago',
      valor: 100,
      formaPagamento: 'manual',
      observacao: 'Pagamento E2E'
    }
  });
  state.pagamentoId = pagamento.id;

  log('11. Apostador registra aposta');
  const aposta = await request('POST', `/apostas/boloes/${state.bolaoId}`, {
    token: state.bettorToken,
    body: {
      partidaId: state.partidaId,
      palpiteMandante: 2,
      palpiteVisitante: 1
    }
  });
  assert(aposta.participanteId === state.participanteId, 'Aposta deve pertencer ao participante do token.');

  log('12. Admin informa resultado e dispara pontuacao/ranking/notificacoes');
  await request('POST', `/partidas/boloes/${state.bolaoId}/${state.partidaId}/resultado`, {
    token: state.adminToken,
    body: { placarMandante: 2, placarVisitante: 1 }
  });

  log('13. Valida ranking e premiacao');
  const ranking = await request('GET', `/ranking/boloes/${state.bolaoId}/atual`, { token: state.bettorToken });
  const meuRanking = ranking.find((item) => item.participanteId === state.participanteId);
  assert(meuRanking?.pontosAtuais === 10, `Ranking deveria ter 10 pontos, recebeu ${meuRanking?.pontosAtuais}.`);
  assert(meuRanking?.valorPremioPrevisto === 100, `Premio previsto deveria ser 100, recebeu ${meuRanking?.valorPremioPrevisto}.`);

  const premiacao = await request('GET', `/ranking/boloes/${state.bolaoId}/premiacao`, { token: state.bettorToken });
  assert(premiacao.totalArrecadado === 100, `Arrecadacao deveria ser 100, recebeu ${premiacao.totalArrecadado}.`);

  log('14. Valida notificacoes');
  const minhasNotificacoes = await request('GET', `/notificacoes/boloes/${state.bolaoId}/minhas`, { token: state.bettorToken });
  const tipos = minhasNotificacoes.map((item) => item.tipo);
  assert(tipos.includes('PAGAMENTO_CONFIRMADO'), 'Notificacao de pagamento confirmado nao encontrada.');
  assert(tipos.includes('RESULTADO_LANCADO'), 'Notificacao de resultado lancado nao encontrada.');
  assert(tipos.includes('RANKING_ATUALIZADO'), 'Notificacao de ranking atualizado nao encontrada.');

  log('15. Valida bloqueios de permissao');
  await request('POST', `/fases/boloes/${state.bolaoId}`, {
    token: state.bettorToken,
    body: { nome: 'Fase indevida', ordem: 99 },
    expect: 403
  });
  await request('GET', `/participantes/boloes/${state.segundoBolaoId}`, {
    token: state.adminToken,
    expect: 403
  });

  console.log('\nFluxo completo validado com sucesso.');
  console.log(JSON.stringify({
    bolaoId: state.bolaoId,
    segundoBolaoId: state.segundoBolaoId,
    adminEmail,
    bettorEmail
  }, null, 2));
}

main().catch((error) => {
  console.error('\nFalha no fluxo E2E:');
  console.error(error.message);
  process.exit(1);
});
