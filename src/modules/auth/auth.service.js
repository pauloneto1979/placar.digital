const { env } = require('../../config/env');
const { HttpError } = require('../../shared/errors/http-error');
const { verifyPassword } = require('../../shared/utils/password');
const { sign, verify } = require('../../shared/utils/token');

function sanitizeUser(user) {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    perfilGlobal: user.perfil_global
  };
}

function formatBolao(row) {
  return {
    id: row.bolao_id,
    nome: row.bolao_nome,
    slug: row.bolao_slug,
    status: row.bolao_status,
    participanteId: row.participante_id,
    vinculoAdministrativoId: row.vinculo_administrativo_id,
    papel: row.papel
  };
}

function resolveLoginFlow(user, boloes) {
  if (user.perfil_global === 'proprietario') {
    return {
      requiresBolaoSelection: false,
      selectedBolao: null
    };
  }

  if (boloes.length === 0) {
    return {
      requiresBolaoSelection: false,
      selectedBolao: null
    };
  }

  if (boloes.length === 1) {
    return {
      requiresBolaoSelection: false,
      selectedBolao: boloes[0]
    };
  }

  return {
    requiresBolaoSelection: true,
    selectedBolao: null
  };
}

function createAuthService(repository) {
  async function audit(data) {
    try {
      await repository.createAuditLog(data);
    } catch (error) {
      console.error('Falha ao registrar auditoria de auth:', error.message);
    }
  }

  function createAccessToken(user, selectedBolao) {
    return sign(
      {
        type: 'access',
        usuarioId: user.id,
        email: user.email,
        perfilGlobal: user.perfil_global,
        bolaoId: selectedBolao ? selectedBolao.id : null,
        participanteId: selectedBolao ? selectedBolao.participanteId : null,
        vinculoAdministrativoId: selectedBolao ? selectedBolao.vinculoAdministrativoId : null,
        papel: selectedBolao ? selectedBolao.papel : user.perfil_global
      },
      env.authTokenExpiresInSeconds
    );
  }

  function createSelectionToken(user, boloes) {
    return sign(
      {
        type: 'bolao_selection',
        usuarioId: user.id,
        email: user.email,
        perfilGlobal: user.perfil_global,
        allowedBolaoIds: boloes.map((bolao) => bolao.id)
      },
      env.authSelectionTokenExpiresInSeconds
    );
  }

  return {
    getStatus() {
      return repository.getMetadata();
    },

    async login(credentials, context = {}) {
      const email = credentials.email ? credentials.email.trim().toLowerCase() : '';
      const senha = credentials.senha || credentials.password || '';

      if (!email || !senha) {
        throw new HttpError(400, 'invalid_credentials_payload', 'Email e senha sao obrigatorios.');
      }

      const user = await repository.findUserByEmail(email);

      if (!user || !user.ativo || !verifyPassword(senha, user.senha_hash)) {
        throw new HttpError(401, 'invalid_credentials', 'Email ou senha invalidos.');
      }

      const boloes = (await repository.listUserBoloes(user.id)).map(formatBolao);
      const flow = resolveLoginFlow(user, boloes);
      await repository.updateLastLogin(user.id);
      await audit({
        usuarioId: user.id,
        entidade: 'usuarios',
        entidadeId: user.id,
        acao: 'auth.login',
        dadosNovos: {
          requiresBolaoSelection: flow.requiresBolaoSelection
        },
        ip: context.ip,
        userAgent: context.userAgent
      });

      if (flow.requiresBolaoSelection) {
        return {
          status: 'bolao_selection_required',
          user: sanitizeUser(user),
          selectionToken: createSelectionToken(user, boloes),
          boloes
        };
      }

      return {
        status: 'authenticated',
        user: sanitizeUser(user),
        boloes,
        selectedBolao: flow.selectedBolao,
        accessToken: createAccessToken(user, flow.selectedBolao)
      };
    },

    async selectBolao(payload, context = {}) {
      const selectionToken = payload.selectionToken || payload.selection_token;
      const bolaoId = payload.bolaoId || payload.bolao_id;

      if (!selectionToken || !bolaoId) {
        throw new HttpError(400, 'invalid_selection_payload', 'Token de selecao e bolaoId sao obrigatorios.');
      }

      const decoded = verify(selectionToken);

      if (decoded.type !== 'bolao_selection') {
        throw new HttpError(401, 'invalid_selection_token', 'Token de selecao invalido.');
      }

      if (!Array.isArray(decoded.allowedBolaoIds) || !decoded.allowedBolaoIds.includes(bolaoId)) {
        throw new HttpError(403, 'bolao_not_allowed', 'Usuario nao possui acesso ao bolao informado.');
      }

      const user = await repository.findUserByEmail(decoded.email);

      if (!user || !user.ativo || user.id !== decoded.usuarioId) {
        throw new HttpError(401, 'invalid_selection_token', 'Token de selecao invalido.');
      }

      const selectedBolao = repository.findUserBolao
        ? await repository.findUserBolao(user.id, bolaoId)
        : null;

      if (!selectedBolao) {
        throw new HttpError(403, 'bolao_not_allowed', 'Usuario nao possui acesso ao bolao informado.');
      }

      const formattedBolao = formatBolao(selectedBolao);
      const boloes = (await repository.listUserBoloes(user.id)).map(formatBolao);

      await audit({
        usuarioId: user.id,
        bolaoId,
        entidade: 'boloes',
        entidadeId: bolaoId,
        acao: 'auth.bolao_selecionado',
        dadosNovos: {
          participanteId: formattedBolao.participanteId,
          vinculoAdministrativoId: formattedBolao.vinculoAdministrativoId,
          papel: formattedBolao.papel
        },
        ip: context.ip,
        userAgent: context.userAgent
      });

      return {
        status: 'authenticated',
        user: sanitizeUser(user),
        boloes,
        selectedBolao: formattedBolao,
        accessToken: createAccessToken(user, formattedBolao)
      };
    },

    async switchBolao(payload, auth, context = {}) {
      const bolaoId = payload.bolaoId || payload.bolao_id;

      if (!bolaoId) {
        throw new HttpError(400, 'invalid_switch_payload', 'bolaoId e obrigatorio.');
      }

      const user = await repository.findUserByEmail(auth.email);

      if (!user || !user.ativo || user.id !== auth.usuarioId) {
        throw new HttpError(401, 'invalid_session', 'Sessao invalida.');
      }

      let selectedBolao = null;
      const boloes = (await repository.listUserBoloes(user.id)).map(formatBolao);

      if (user.perfil_global === 'proprietario') {
        const bolao = await repository.findBolaoById(bolaoId);
        if (!bolao) {
          throw new HttpError(404, 'bolao_not_found', 'Bolao nao encontrado.');
        }
        selectedBolao = {
          id: bolao.bolao_id,
          nome: bolao.bolao_nome,
          slug: bolao.bolao_slug,
          status: bolao.bolao_status,
          participanteId: null,
          vinculoAdministrativoId: null,
          papel: 'proprietario'
        };
      } else {
        const row = await repository.findUserBolao(user.id, bolaoId);
        if (!row) {
          throw new HttpError(403, 'bolao_not_allowed', 'Usuario nao possui acesso ao bolao informado.');
        }
        selectedBolao = formatBolao(row);
      }

      await audit({
        usuarioId: user.id,
        bolaoId,
        entidade: 'boloes',
        entidadeId: bolaoId,
        acao: 'auth.bolao_trocado',
        dadosNovos: {
          participanteId: selectedBolao.participanteId,
          vinculoAdministrativoId: selectedBolao.vinculoAdministrativoId,
          papel: selectedBolao.papel
        },
        ip: context.ip,
        userAgent: context.userAgent
      });

      return {
        status: 'authenticated',
        user: sanitizeUser(user),
        boloes,
        selectedBolao,
        accessToken: createAccessToken(user, selectedBolao)
      };
    },

    getSession(auth) {
      return {
        status: 'authenticated',
        user: {
          id: auth.usuarioId,
          email: auth.email,
          perfilGlobal: auth.perfilGlobal
        },
        selectedBolao: auth.bolaoId
          ? {
              id: auth.bolaoId,
              participanteId: auth.participanteId,
              vinculoAdministrativoId: auth.vinculoAdministrativoId,
              papel: auth.papel
            }
          : null
      };
    }
  };
}

module.exports = {
  createAuthService
};
