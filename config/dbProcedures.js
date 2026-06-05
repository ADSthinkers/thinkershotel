import { QueryTypes } from 'sequelize';
import { sequelize } from './db.js';

export async function callProcedure(sql, replacements = {}) {
  const result = await sequelize.query(sql, {
    replacements,
    type: QueryTypes.RAW,
  });

  if (Array.isArray(result)) {
    return result[0];
  }

  return result;
}

export function firstProcedureRow(result) {
  if (Array.isArray(result)) {
    return result[0] || null;
  }

  return result || null;
}
