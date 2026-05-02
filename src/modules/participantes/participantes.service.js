const { HttpError } = require('../../shared/errors/http-error');
const { ensureCanAdminBolao } = require('../../shared/permissions/bolao-access');
const { hashPassword } = require('../../shared/utils/password');
const crypto = require('crypto');

const STATUS = ['convidado', 'ativo', 'bloqueado', 'removido'];

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value) {
  return clean(value).toLowerCase();
}

function payload(body, bolaoId) {
  const nome = clean(body.nome);
  const email = normalizeEmail(body.email);
  const telefone = clean(body.telefone);
  const status = body.status || 'ativo';

  if (!nome || !email) throw new HttpError(400, 'invalid_participant_payload', 'Nome e email sao obrigatorios.');
  if (!email.includes('@')) throw new HttpError(400, 'invalid_participant_email', 'Email invalido.');
  if (!STATUS.includes(status)) throw new HttpError(400, 'invalid_participant_status', 'Status invalido.');

  const senhaInicial = clean(body.senhaInicial || body.senha_inicial || body.senha || body.password);

  return { bolaoId, nome, email, telefone, status, senhaInicial };
}

function generateTemporaryPassword() {
  return crypto.randomBytes(12).toString('base64url');
}

function createParticipantesService(repository) {
  async function ensureResource(id, bolaoId) {
    const item = await repository.findById(id);
    if (!item || item.bolaoId !== bolaoId) throw new HttpError(404, 'participant_not_found', 'Participante nao encontrado.');
    return item;
  }

  async function ensureUniqueEmail(bolaoId, email, ignoreId = null) {
    const existing = await repository.findByEmail(bolaoId, email);
    if (existing && existing.id !== ignoreId) throw new HttpError(409, 'duplicated_participant_email', 'Email ja cadastrado neste bolao.');
  }

  async function resolveCredencialApostador(data) {
    const existing = await repository.findUsuarioByEmail(data.email);

    if (existing && existing.perfilGlobal !== 'apostador') {
      throw new HttpError(
        409,
        'participant_email_belongs_to_system_user',
        'Email ja pertence a usuario proprietario/administrador. Use outro email ou ajuste o cadastro de usuario antes de vincular participante.'
      );
    }

    if (existing && !existing.ativo) {
      throw new HttpError(409, 'inactive_bettor_credential', 'Credencial de apostador existente esta inativa.');
    }

    if (existing) {
      return {
        usuario: existing,
        credencialCriada: false,
        senhaTemporaria: null
      };
    }

    const senhaTemporaria = data.senhaInicial || generateTemporaryPassword();
    const usuario = await repository.createUsuarioApostador({
      nome: data.nome,
      email: data.email,
      senhaHash: hashPassword(senhaTemporaria)
    });

    return {
      usuario,
      credencialCriada: true,
      senhaTemporaria: data.senhaInicial ? null : senhaTemporaria
    };
  }

  function attachCredencialInfo(participante, credencial) {
    return {
      ...participante,
      credencialApostador: {
        usuarioId: credencial.usuario.id,
        email: credencial.usuario.email,
        criada: credencial.credencialCriada,
        senhaTemporaria: credencial.senhaTemporaria
      }
    };
  }

  return {
    getStatus() {
      return { module: 'participantes', implemented: true };
    },
    async list(bolaoId, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      return repository.listByBolao(bolaoId);
    },
    async create(bolaoId, body, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      const data = payload(body, bolaoId);
      await ensureUniqueEmail(bolaoId, data.email);
      const credencial = await resolveCredencialApostador(data);
      const participante = await repository.create({ ...data, usuarioId: credencial.usuario.id });
      return attachCredencialInfo(participante, credencial);
    },
    async update(bolaoId, id, body, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      await ensureResource(id, bolaoId);
      const data = payload(body, bolaoId);
      await ensureUniqueEmail(bolaoId, data.email, id);
      const credencial = await resolveCredencialApostador(data);
      const participante = await repository.update(id, { ...data, usuarioId: credencial.usuario.id });
      return attachCredencialInfo(participante, credencial);
    },
    async updateStatus(bolaoId, id, body, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      await ensureResource(id, bolaoId);
      if (!STATUS.includes(body.status)) throw new HttpError(400, 'invalid_participant_status', 'Status invalido.');
      return repository.updateStatus(id, body.status);
    }
  };
}

module.exports = { createParticipantesService };
