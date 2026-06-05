import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const ALLOWED_TABLES = ['clientes', 'reservas', 'check_ins', 'check_outs', 'usuarios_sistema'];
const ALLOWED_OPERATIONS = ['INSERT', 'UPDATE', 'DELETE'];

const handleError = (res, error) => {
  return res.status(500).json({ error: error.message });
};

export const listarLogsAtividades = async (req, res) => {
  try {
    const { tabela, operacao, usuarioId, usuarioLogin } = req.query;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const where = [];
    const replacements = { limit };

    if (tabela) {
      if (!ALLOWED_TABLES.includes(tabela)) {
        return res.status(400).json({ error: 'Tabela inválida para logs.' });
      }
      where.push('tabela = :tabela');
      replacements.tabela = tabela;
    }

    if (operacao) {
      const normalizedOperation = String(operacao).toUpperCase();
      if (!ALLOWED_OPERATIONS.includes(normalizedOperation)) {
        return res.status(400).json({ error: 'Operação inválida para logs.' });
      }
      where.push('operacao = :operacao');
      replacements.operacao = normalizedOperation;
    }

    if (usuarioId) {
      where.push('usuario_id = :usuarioId');
      replacements.usuarioId = Number(usuarioId);
    }

    if (usuarioLogin) {
      where.push('usuario_login = :usuarioLogin');
      replacements.usuarioLogin = usuarioLogin;
    }

    const logs = await sequelize.query(
      `
        SELECT
          id,
          usuario_id,
          usuario_login,
          usuario_banco,
          tabela,
          operacao,
          registro_id,
          dados_anteriores,
          dados_novos,
          criado_em
        FROM logs_atividades
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY criado_em DESC, id DESC
        LIMIT :limit
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    return res.json(logs);
  } catch (error) {
    return handleError(res, error);
  }
};
