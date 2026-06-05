import { QueryTypes } from 'sequelize';
import { sequelize } from './db.js';

export async function callProcedure(sql, replacements = {}, auditUser = null) {
  if (auditUser) {
    return callProcedureWithAuditUser(sql, replacements, auditUser);
  }

  const result = await sequelize.query(sql, {
    replacements,
    type: QueryTypes.RAW,
  });

  if (Array.isArray(result)) {
    return result[0];
  }

  return result;
}

async function callProcedureWithAuditUser(sql, replacements, auditUser) {
  return withAuditUser(auditUser, async (transaction) => {
    const result = await sequelize.query(sql, {
      replacements,
      type: QueryTypes.RAW,
      transaction,
    });

    if (Array.isArray(result)) {
      return result[0];
    }

    return result;
  });
}

export async function withAuditUser(auditUser, callback) {
  return sequelize.transaction(async (transaction) => {
    await sequelize.query(
      'SET @thihotel_usuario_id = :usuarioId, @thihotel_usuario_login = :usuarioLogin',
      {
        replacements: {
          usuarioId: auditUser?.id || null,
          usuarioLogin: auditUser?.login || auditUser?.username || auditUser?.email || null,
        },
        transaction,
      }
    );

    try {
      return await callback(transaction);
    } finally {
      await sequelize.query('SET @thihotel_usuario_id = NULL, @thihotel_usuario_login = NULL', { transaction });
    }
  });
}

export function firstProcedureRow(result) {
  if (Array.isArray(result)) {
    return result[0] || null;
  }

  return result || null;
}

export function databaseErrorStatus(error) {
  const errno = error?.parent?.errno || error?.original?.errno;
  const sqlState = error?.parent?.sqlState || error?.original?.sqlState;

  if (sqlState === '45000' || errno === 1451) {
    return 409;
  }

  if (errno === 1452) {
    return 400;
  }

  return null;
}
