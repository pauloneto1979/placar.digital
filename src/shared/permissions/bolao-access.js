const { query } = require('../database/client');
const { HttpError } = require('../errors/http-error');

async function bolaoExists(bolaoId) {
  const result = await query('select id from boloes where id = $1 limit 1', [bolaoId]);
  return result.rowCount > 0;
}

async function isAdministradorVinculado(usuarioId, bolaoId) {
  const result = await query(
    `
      select 1
      from boloes_usuarios bu
      join usuarios u on u.id = bu.usuario_id
      where bu.usuario_id = $1
        and bu.bolao_id = $2
        and bu.perfil = 'administrador'
        and bu.ativo = true
        and u.perfil_global = 'administrador'
        and u.ativo = true
      limit 1
    `,
    [usuarioId, bolaoId]
  );

  return result.rowCount > 0;
}

async function ensureCanAdminBolao(auth, bolaoId) {
  if (!(await bolaoExists(bolaoId))) {
    throw new HttpError(404, 'bolao_not_found', 'Bolao nao encontrado.');
  }

  if (auth.perfilGlobal === 'proprietario') {
    return;
  }

  if (auth.perfilGlobal === 'administrador' && (await isAdministradorVinculado(auth.usuarioId, bolaoId))) {
    return;
  }

  throw new HttpError(403, 'forbidden_bolao_admin', 'Usuario sem permissao administrativa para este bolao.');
}

module.exports = {
  ensureCanAdminBolao,
  isAdministradorVinculado
};
