const { query } = require('../../shared/database/client');

async function getRankingProvisorio(bolaoId) {
  const result = await query(
    `
      select
        base.participante_id,
        base.nome,
        base.pontos,
        base.posicao,
        dp.percentual as percentual_premio
      from (
        select
          p.id as participante_id,
          p.nome,
          coalesce(r.pontos_total, 0)::int as pontos,
          coalesce(r.posicao, row_number() over (order by coalesce(r.pontos_total, 0) desc, p.nome asc))::int as posicao,
          p.bolao_id
        from participantes p
        left join ranking r on r.participante_id = p.id and r.bolao_id = p.bolao_id
        where p.bolao_id = $1
          and p.papel = 'apostador'
          and p.status <> 'removido'
      ) base
      left join distribuicao_premios dp on dp.bolao_id = base.bolao_id and dp.posicao = base.posicao and dp.ativo = true
      order by base.posicao asc
    `,
    [bolaoId]
  );

  return result.rows.map((row) => ({
    participanteId: row.participante_id,
    participante: row.nome,
    pontosAtuais: row.pontos,
    posicao: row.posicao,
    valorPremioPrevisto: row.percentual_premio ? { percentual: Number(row.percentual_premio) } : null
  }));
}

module.exports = {
  getRankingProvisorio
};
