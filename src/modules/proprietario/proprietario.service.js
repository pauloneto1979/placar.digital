const { HttpError } = require('../../shared/errors/http-error');
const { hashPassword } = require('../../shared/utils/password');

const PERFIS_USUARIO_SISTEMA = ['proprietario', 'administrador'];
const STATUS_BOLOES = ['ativo', 'fechado', 'inativo'];
const CONFIG_KEYS = {
  tempoSessao: 'sessao.tempo_segundos',
  emailRemetente: 'email.remetente',
  notificacoesAtivas: 'notificacoes.ativas',
  gatewayPagamento: 'pagamentos.gateway'
};

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function createSlug(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 160);
}

function assertValidDateRange(dataInicio, dataFim) {
  if (dataInicio && Number.isNaN(Date.parse(dataInicio))) {
    throw new HttpError(400, 'invalid_start_date', 'Data inicio invalida.');
  }

  if (dataFim && Number.isNaN(Date.parse(dataFim))) {
    throw new HttpError(400, 'invalid_end_date', 'Data fim invalida.');
  }

  if (dataInicio && dataFim && new Date(dataFim) < new Date(dataInicio)) {
    throw new HttpError(400, 'invalid_date_range', 'Data fim deve ser maior ou igual a data inicio.');
  }
}

function parseAtivoFromStatus(status) {
  return status === 'ativo';
}

function mapConfigRows(rows) {
  const byKey = Object.fromEntries(rows.map((row) => [row.chave, row]));

  return {
    tempoSessao: byKey[CONFIG_KEYS.tempoSessao]?.valor ?? null,
    emailRemetente: byKey[CONFIG_KEYS.emailRemetente]?.valor ?? null,
    notificacoesAtivas: byKey[CONFIG_KEYS.notificacoesAtivas]?.valor ?? null,
    gatewayPagamento: byKey[CONFIG_KEYS.gatewayPagamento]?.valor ?? null
  };
}

function createProprietarioService(repository) {
  async function audit(auth, context, data) {
    try {
      await repository.createAuditLog({
        usuarioId: auth.usuarioId,
        ip: context.ip,
        userAgent: context.userAgent,
        ...data
      });
    } catch (error) {
      console.error('Falha ao registrar auditoria do proprietario:', error.message);
    }
  }

  async function ensureBolaoExists(id) {
    const bolao = await repository.findBolaoById(id);

    if (!bolao) {
      throw new HttpError(404, 'bolao_not_found', 'Bolao nao encontrado.');
    }

    return bolao;
  }

  async function ensureUsuarioSistema(id) {
    const usuario = await repository.findUsuarioById(id);

    if (!usuario) {
      throw new HttpError(404, 'usuario_not_found', 'Usuario nao encontrado.');
    }

    if (!PERFIS_USUARIO_SISTEMA.includes(usuario.perfil)) {
      throw new HttpError(422, 'invalid_system_user_profile', 'Usuario de sistema nao pode ter perfil apostador.');
    }

    return usuario;
  }

  async function ensureUniqueEmail(email, ignoreUserId = null) {
    const existing = await repository.findUsuarioByEmail(email);

    if (existing && existing.id !== ignoreUserId) {
      throw new HttpError(409, 'duplicated_email', 'Ja existe usuario cadastrado com este email.');
    }
  }

  async function buildBolaoPayload(payload, auth, existingBolao = null) {
    const nome = normalizeText(payload.nome);
    const descricao = normalizeText(payload.descricao);
    const dataInicio = payload.dataInicio || payload.data_inicio || null;
    const dataFim = payload.dataFim || payload.data_fim || null;
    const status = payload.status || existingBolao?.status || 'ativo';
    const slug = payload.slug ? createSlug(payload.slug) : createSlug(nome);

    if (!nome) {
      throw new HttpError(400, 'missing_bolao_name', 'Nome do bolao e obrigatorio.');
    }

    if (!STATUS_BOLOES.includes(status)) {
      throw new HttpError(400, 'invalid_bolao_status', 'Status do bolao deve ser ativo, fechado ou inativo.');
    }

    if (!slug) {
      throw new HttpError(400, 'invalid_bolao_slug', 'Slug do bolao invalido.');
    }

    assertValidDateRange(dataInicio, dataFim);

    const existingSlug = await repository.findBolaoBySlug(slug);

    if (existingSlug && existingSlug.id !== existingBolao?.id) {
      throw new HttpError(409, 'duplicated_bolao_slug', 'Ja existe bolao com este slug.');
    }

    return {
      proprietarioId: existingBolao?.proprietarioId || auth.usuarioId,
      nome,
      slug,
      descricao,
      dataInicio,
      dataFim,
      status,
      tipoEsporte: payload.tipoEsporte || payload.tipo_esporte || 'futebol',
      ativo: parseAtivoFromStatus(status)
    };
  }

  return {
    async listBoloes() {
      return repository.listBoloes();
    },

    async createBolao(payload, auth, context) {
      const data = await buildBolaoPayload(payload, auth);
      const bolao = await repository.createBolao(data);
      await audit(auth, context, {
        bolaoId: bolao.id,
        entidade: 'boloes',
        entidadeId: bolao.id,
        acao: 'proprietario.bolao.criado',
        dadosNovos: bolao
      });

      return bolao;
    },

    async updateBolao(id, payload, auth, context) {
      const existing = await ensureBolaoExists(id);
      const data = await buildBolaoPayload(payload, auth, existing);
      const bolao = await repository.updateBolao(id, data);
      await audit(auth, context, {
        bolaoId: bolao.id,
        entidade: 'boloes',
        entidadeId: bolao.id,
        acao: 'proprietario.bolao.atualizado',
        dadosAnteriores: existing,
        dadosNovos: bolao
      });

      return bolao;
    },

    async fecharBolao(id, auth, context) {
      const existing = await ensureBolaoExists(id);
      const bolao = await repository.fecharBolao(id);
      await audit(auth, context, {
        bolaoId: bolao.id,
        entidade: 'boloes',
        entidadeId: bolao.id,
        acao: 'proprietario.bolao.fechado',
        dadosAnteriores: existing,
        dadosNovos: bolao
      });

      return bolao;
    },

    async listUsuarios() {
      return repository.listUsuarios();
    },

    async createUsuario(payload, auth, context) {
      const nome = normalizeText(payload.nome);
      const email = normalizeEmail(payload.email);
      const perfil = payload.perfil || payload.perfil_global;
      const senha = payload.senha || payload.password;
      const ativo = payload.status ? payload.status === 'ativo' : payload.ativo !== false;

      if (!nome || !email || !senha) {
        throw new HttpError(400, 'missing_user_fields', 'Nome, email e senha sao obrigatorios.');
      }

      if (!PERFIS_USUARIO_SISTEMA.includes(perfil)) {
        throw new HttpError(400, 'invalid_user_profile', 'Perfil deve ser proprietario ou administrador.');
      }

      await ensureUniqueEmail(email);

      const usuario = await repository.createUsuario({
        nome,
        email,
        perfil,
        ativo,
        senhaHash: hashPassword(senha)
      });

      await audit(auth, context, {
        entidade: 'usuarios',
        entidadeId: usuario.id,
        acao: 'proprietario.usuario.criado',
        dadosNovos: usuario
      });

      return usuario;
    },

    async updateUsuario(id, payload, auth, context) {
      const existing = await ensureUsuarioSistema(id);
      const nome = normalizeText(payload.nome || existing.nome);
      const email = normalizeEmail(payload.email || existing.email);
      const perfil = payload.perfil || payload.perfil_global || existing.perfil;
      const ativo = payload.status ? payload.status === 'ativo' : payload.ativo ?? existing.ativo;

      if (!nome || !email) {
        throw new HttpError(400, 'missing_user_fields', 'Nome e email sao obrigatorios.');
      }

      if (!PERFIS_USUARIO_SISTEMA.includes(perfil)) {
        throw new HttpError(400, 'invalid_user_profile', 'Perfil deve ser proprietario ou administrador.');
      }

      await ensureUniqueEmail(email, id);

      const usuario = await repository.updateUsuario(id, {
        nome,
        email,
        perfil,
        ativo
      });

      await audit(auth, context, {
        entidade: 'usuarios',
        entidadeId: usuario.id,
        acao: 'proprietario.usuario.atualizado',
        dadosAnteriores: existing,
        dadosNovos: usuario
      });

      return usuario;
    },

    async updateUsuarioStatus(id, payload, auth, context) {
      const existing = await ensureUsuarioSistema(id);
      const ativo = payload.status ? payload.status === 'ativo' : payload.ativo;

      if (typeof ativo !== 'boolean') {
        throw new HttpError(400, 'invalid_user_status', 'Informe ativo boolean ou status ativo/inativo.');
      }

      const usuario = await repository.updateUsuarioStatus(id, ativo);

      await audit(auth, context, {
        entidade: 'usuarios',
        entidadeId: usuario.id,
        acao: ativo ? 'proprietario.usuario.ativado' : 'proprietario.usuario.inativado',
        dadosAnteriores: existing,
        dadosNovos: usuario
      });

      return usuario;
    },

    async vincularAdministrador(bolaoId, payload, auth, context) {
      await ensureBolaoExists(bolaoId);
      const usuarioId = payload.usuarioId || payload.usuario_id;
      const usuario = await ensureUsuarioSistema(usuarioId);

      if (usuario.perfil !== 'administrador') {
        throw new HttpError(422, 'invalid_admin_link_profile', 'Somente usuarios administradores podem ser vinculados ao bolao.');
      }

      if (!usuario.ativo) {
        throw new HttpError(422, 'inactive_admin_link', 'Nao e possivel vincular administrador inativo.');
      }

      await repository.vincularAdministrador(bolaoId, usuarioId);
      const administradores = await repository.listAdministradoresBolao(bolaoId);

      await audit(auth, context, {
        bolaoId,
        entidade: 'boloes_usuarios',
        acao: 'proprietario.bolao.administrador_vinculado',
        dadosNovos: {
          bolaoId,
          usuarioId
        }
      });

      return administradores;
    },

    async listAdministradoresBolao(bolaoId) {
      await ensureBolaoExists(bolaoId);
      return repository.listAdministradoresBolao(bolaoId);
    },

    async removerVinculoAdministrador(bolaoId, usuarioId, auth, context) {
      await ensureBolaoExists(bolaoId);
      const removed = await repository.removerVinculoAdministrador(bolaoId, usuarioId);

      if (!removed) {
        throw new HttpError(404, 'admin_link_not_found', 'Vinculo de administrador nao encontrado.');
      }

      await audit(auth, context, {
        bolaoId,
        entidade: 'boloes_usuarios',
        acao: 'proprietario.bolao.administrador_removido',
        dadosNovos: {
          bolaoId,
          usuarioId
        }
      });

      return { removed: true };
    },

    async getConfiguracoesGerais() {
      return mapConfigRows(await repository.listConfiguracoesGerais());
    },

    async updateConfiguracoesGerais(payload, auth, context) {
      const updates = [];

      if (payload.tempoSessao !== undefined) {
        const tempoSessao = Number(payload.tempoSessao);

        if (!Number.isInteger(tempoSessao) || tempoSessao <= 0) {
          throw new HttpError(400, 'invalid_session_time', 'Tempo de sessao deve ser inteiro positivo.');
        }

        updates.push(repository.upsertConfiguracaoGeral(CONFIG_KEYS.tempoSessao, tempoSessao, 'Tempo de sessao em segundos.'));
      }

      if (payload.emailRemetente !== undefined) {
        const emailRemetente = normalizeEmail(payload.emailRemetente);

        if (!emailRemetente.includes('@')) {
          throw new HttpError(400, 'invalid_sender_email', 'Email do remetente invalido.');
        }

        updates.push(repository.upsertConfiguracaoGeral(CONFIG_KEYS.emailRemetente, emailRemetente, 'Email usado como remetente da plataforma.'));
      }

      if (payload.notificacoesAtivas !== undefined) {
        if (typeof payload.notificacoesAtivas !== 'boolean') {
          throw new HttpError(400, 'invalid_notifications_flag', 'notificacoesAtivas deve ser boolean.');
        }

        updates.push(repository.upsertConfiguracaoGeral(CONFIG_KEYS.notificacoesAtivas, payload.notificacoesAtivas, 'Indica se notificacoes estao ativas.'));
      }

      if (payload.gatewayPagamento !== undefined) {
        const gatewayPagamento = normalizeText(payload.gatewayPagamento);

        if (!gatewayPagamento) {
          throw new HttpError(400, 'invalid_payment_gateway', 'Gateway de pagamento e obrigatorio.');
        }

        updates.push(repository.upsertConfiguracaoGeral(CONFIG_KEYS.gatewayPagamento, gatewayPagamento, 'Gateway de pagamento padrao.'));
      }

      await Promise.all(updates);
      const configuracoes = await this.getConfiguracoesGerais();

      await audit(auth, context, {
        entidade: 'configuracoes_gerais',
        acao: 'proprietario.configuracoes_gerais.atualizadas',
        dadosNovos: configuracoes
      });

      return configuracoes;
    }
  };
}

module.exports = {
  createProprietarioService
};
