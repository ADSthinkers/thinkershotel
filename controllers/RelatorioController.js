import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const ALLOWED_TABLES = ['clientes', 'reservas', 'check_ins', 'check_outs'];
const ALLOWED_OPERATIONS = ['INSERT', 'UPDATE', 'DELETE'];

const handleError = (res, error) => {
  return res.status(500).json({ error: error.message });
};

export const listarRelatorioBD = async (req, res) => {
  try {
    const { tabela, operacao } = req.query;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const where = [];
    const replacements = { limit };

    if (tabela) {
      if (!ALLOWED_TABLES.includes(tabela)) {
        return res.status(400).json({ error: 'Tabela inválida para relatório.' });
      }
      where.push('tabela = :tabela');
      replacements.tabela = tabela;
    }

    if (operacao) {
      const normalizedOperation = String(operacao).toUpperCase();
      if (!ALLOWED_OPERATIONS.includes(normalizedOperation)) {
        return res.status(400).json({ error: 'Operação inválida para relatório.' });
      }
      where.push('operacao = :operacao');
      replacements.operacao = normalizedOperation;
    }

    const relatorio = await sequelize.query(
      `
        SELECT id, tabela, operacao, registro_id, dados, criado_em
        FROM relatorio_dados_bd
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY criado_em DESC, id DESC
        LIMIT :limit
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    return res.json(relatorio);
  } catch (error) {
    return handleError(res, error);
  }
};
