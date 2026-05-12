const { HttpError } = require('../../shared/errors/http-error');
const { ensureCanAdminBolao } = require('../../shared/permissions/bolao-access');
const { hashPassword } = require('../../shared/utils/password');
const { assertBettorPassword } = require('../../shared/utils/password-policy');
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
  const confirmarSenhaInicial = clean(body.confirmarSenhaInicial || body.confirmar_senha_inicial || body.confirmarSenha || body.confirmPassword);
  const enviarConvite = body.enviarConvite === true || body.enviar_convite === true;

  if (senhaInicial && !confirmarSenhaInicial) {
    throw new HttpError(400, 'missing_bettor_password_confirmation', 'Confirme a senha do apostador.');
  }

  if (confirmarSenhaInicial && senhaInicial !== confirmarSenhaInicial) {
    throw new HttpError(400, 'bettor_password_confirmation_mismatch', 'A confirmacao da senha do apostador nao confere.');
  }

  return { bolaoId, nome, email, telefone, status, senhaInicial, enviarConvite };
}

function createParticipantesService(repository, options = {}) {
  const transactionalEmailService = options.transactionalEmailService || null;
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

    if (existing && !existing.ativo && !data.allowInactiveCredential) {
      throw new HttpError(409, 'inactive_bettor_credential', 'Credencial de apostador existente esta inativa.');
    }

    if (existing) {
      let senhaAtualizada = false;
      if (data.senhaInicial) {
        await repository.updateUsuarioApostadorPassword(existing.id, hashPassword(data.senhaInicial));
        senhaAtualizada = true;
      }
      return {
        usuario: existing,
        credencialCriada: false,
        senhaTemporaria: null,
        senhaAtualizada
      };
    }

    const hasInitialPassword = Boolean(data.senhaInicial);
    if (hasInitialPassword) {
      assertBettorPassword(data.senhaInicial);
    }
    const senhaTemporaria = data.senhaInicial;
    const usuario = await repository.createUsuarioApostador({
      nome: data.nome,
      email: data.email,
      senhaHash: hashPassword(senhaTemporaria || crypto.randomBytes(24).toString('hex')),
      ativo: hasInitialPassword
    });

    return {
      usuario,
      credencialCriada: true,
      senhaTemporaria: null
    };
  }

  async function tentarEnviarConvite(participante) {
    if (!transactionalEmailService) return { sent: false, reason: 'transactional_email_not_configured' };
    try {
      return await transactionalEmailService.enviarConviteParticipante(participante.id);
    } catch (error) {
      return { sent: false, reason: error.code || error.message || 'email_error' };
    }
  }

  function attachCredencialInfo(participante, credencial) {
    return {
      ...participante,
      credencialApostador: {
        usuarioId: credencial.usuario.id,
        email: credencial.usuario.email,
        criada: credencial.credencialCriada,
        senhaTemporaria: credencial.senhaTemporaria,
        senhaAtualizada: Boolean(credencial.senhaAtualizada)
      }
    };
  }

  function invitePayload(body = {}) {
    const nome = clean(body.nome);
    const email = normalizeEmail(body.email);
    const reenviar = body.reenviar === true || body.resend === true;

    if (!nome || !email) throw new HttpError(400, 'invalid_invite_payload', 'Nome e email sao obrigatorios.');
    if (!email.includes('@')) throw new HttpError(400, 'invalid_participant_email', 'Email invalido.');

    return { nome, email, reenviar };
  }

  async function sendInviteForExisting(participante, status, reenviar) {
    if (!reenviar) {
      return {
        status,
        participante,
        emailConvite: null
      };
    }

    const usuario = await repository.findUsuarioByEmail(participante.email);
    if (usuario && !usuario.ativo) {
      throw new HttpError(409, 'inactive_bettor_credential', 'Credencial de apostador existente esta inativa.');
    }

    const emailConvite = await tentarEnviarConvite(participante);
    if (!emailConvite.sent) {
      throw new HttpError(422, 'participant_invite_not_sent', 'Nao foi possivel enviar o convite por e-mail.');
    }
    return {
      status: status === 'active_access' ? 'active_access_resent' : 'invite_resent',
      participante,
      emailConvite
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
      const participante = await repository.create({ ...data, usuarioId: credencial.usuario.id, status: data.senhaInicial ? data.status : 'convidado' });
      const result = attachCredencialInfo(participante, credencial);
      const shouldInvite = !data.senhaInicial || data.enviarConvite;
      return { ...result, emailConvite: shouldInvite ? await tentarEnviarConvite(participante) : null };
    },
    async invite(bolaoId, body, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      const data = invitePayload(body);
      const existingParticipant = await repository.findByEmail(bolaoId, data.email);
      if (existingParticipant) {
        const active = existingParticipant.status === 'ativo';
        return sendInviteForExisting(existingParticipant, active ? 'active_access' : 'already_in_pool', data.reenviar);
      }

      const credencial = await resolveCredencialApostador({ ...data, senhaInicial: '' });
      const participante = await repository.create({
        bolaoId,
        usuarioId: credencial.usuario.id,
        nome: data.nome,
        email: data.email,
        telefone: '',
        status: 'convidado'
      });
      const emailConvite = await tentarEnviarConvite(participante);
      if (!emailConvite.sent) {
        throw new HttpError(422, 'participant_invite_not_sent', 'Nao foi possivel enviar o convite por e-mail.');
      }
      return {
        status: credencial.credencialCriada ? 'created_invited' : 'existing_user_invited',
        participante: attachCredencialInfo(participante, credencial),
        emailConvite
      };
    },
    async update(bolaoId, id, body, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      await ensureResource(id, bolaoId);
      const data = payload(body, bolaoId);
      await ensureUniqueEmail(bolaoId, data.email, id);
      const credencial = await resolveCredencialApostador(data);
      const participante = await repository.update(id, { ...data, usuarioId: credencial.usuario.id });
      const result = attachCredencialInfo(participante, credencial);
      return { ...result, emailConvite: data.enviarConvite ? await tentarEnviarConvite(participante) : null };
    },
    async updateStatus(bolaoId, id, body, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      await ensureResource(id, bolaoId);
      if (!STATUS.includes(body.status)) throw new HttpError(400, 'invalid_participant_status', 'Status invalido.');
      return repository.updateStatus(id, body.status);
    },
    async sendInvite(bolaoId, id, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      const participante = await ensureResource(id, bolaoId);
      if (participante.status === 'ativo') {
        throw new HttpError(409, 'participant_access_already_active', 'Participante ja possui acesso ativo.');
      }
      const usuario = await repository.findUsuarioByEmail(participante.email);
      if (usuario && !usuario.ativo) {
        throw new HttpError(409, 'inactive_bettor_credential', 'Credencial de apostador existente esta inativa.');
      }
      const emailConvite = await tentarEnviarConvite(participante);
      if (!emailConvite.sent) {
        throw new HttpError(422, 'participant_invite_not_sent', 'Nao foi possivel enviar o convite por e-mail.');
      }
      return { participanteId: participante.id, emailConvite };
    }
  };
}

module.exports = { createParticipantesService };
