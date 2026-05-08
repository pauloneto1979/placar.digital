const { query } = require('../../shared/database/client');

function map(row, options = {}) {
  const item = {
    id: row.id,
    smtpHost: row.smtp_host,
    smtpPort: row.smtp_port,
    smtpSecure: row.smtp_secure,
    smtpUser: row.smtp_user,
    smtpFromName: row.smtp_from_name,
    smtpFromEmail: row.smtp_from_email,
    smtpReplyTo: row.smtp_reply_to,
    smtpEnabled: row.smtp_enabled,
    providerName: row.provider_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  if (options.includeSecret) {
    item.smtpPassword = row.smtp_password || '';
  }

  return item;
}

async function getLatest(options = {}) {
  const result = await query('select * from email_configuracoes order by updated_at desc limit 1');
  return result.rows[0] ? map(result.rows[0], options) : null;
}

async function upsert(data) {
  const existing = await getLatest({ includeSecret: true });
  if (!existing) {
    const result = await query(
      `
        insert into email_configuracoes (
          smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password,
          smtp_from_name, smtp_from_email, smtp_reply_to, smtp_enabled, provider_name
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        returning *
      `,
      [
        data.smtpHost,
        data.smtpPort,
        data.smtpSecure,
        data.smtpUser,
        data.smtpPassword || null,
        data.smtpFromName,
        data.smtpFromEmail,
        data.smtpReplyTo || null,
        data.smtpEnabled,
        data.providerName
      ]
    );
    return map(result.rows[0], { includeSecret: true });
  }

  const result = await query(
    `
      update email_configuracoes
      set
        smtp_host = $2,
        smtp_port = $3,
        smtp_secure = $4,
        smtp_user = $5,
        smtp_password = case when $6::boolean then $7 else smtp_password end,
        smtp_from_name = $8,
        smtp_from_email = $9,
        smtp_reply_to = $10,
        smtp_enabled = $11,
        provider_name = $12
      where id = $1
      returning *
    `,
    [
      existing.id,
      data.smtpHost,
      data.smtpPort,
      data.smtpSecure,
      data.smtpUser,
      data.updatePassword,
      data.smtpPassword || null,
      data.smtpFromName,
      data.smtpFromEmail,
      data.smtpReplyTo || null,
      data.smtpEnabled,
      data.providerName
    ]
  );

  return map(result.rows[0], { includeSecret: true });
}

module.exports = {
  getLatest,
  upsert
};
