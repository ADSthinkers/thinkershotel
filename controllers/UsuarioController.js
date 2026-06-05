import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { withAuditUser } from '../config/dbProcedures.js';
import { UsuarioSistema } from '../models/index.js';

const userAttributes = ['id', 'login', 'nome', 'perfil', 'ativo', 'criado_em', 'atualizado_em'];

const handleError = (res, error) => {
  const status = error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError' ? 400 : 500;
  return res.status(status).json({ error: error.message });
};

export const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await UsuarioSistema.findAll({ attributes: userAttributes, order: [['criado_em', 'DESC']] });
    return res.json(usuarios);
  } catch (error) {
    return handleError(res, error);
  }
};

export const buscarUsuario = async (req, res) => {
  try {
    const usuario = await UsuarioSistema.findByPk(req.params.id, { attributes: userAttributes });
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado.' });
    return res.json(usuario);
  } catch (error) {
    return handleError(res, error);
  }
};

export const criarUsuario = async (req, res) => {
  try {
    const { login, nome, password } = req.body;
    if (!login || !nome || !password) {
      return res.status(400).json({ error: 'login, nome e password são obrigatórios.' });
    }

    const usuario = await withAuditUser(req.user, async (transaction) => {
      await sequelize.query(
        `
          INSERT INTO usuarios_sistema (login, senha_hash, nome, perfil, ativo)
          VALUES (:login, SHA2(:password, 256), :nome, :perfil, :ativo)
        `,
        {
          replacements: {
            login,
            password,
            nome,
            perfil: req.body.perfil || 'operacional',
            ativo: req.body.ativo ?? true,
          },
          type: QueryTypes.INSERT,
          transaction,
        }
      );

      return UsuarioSistema.findOne({ where: { login }, attributes: userAttributes, transaction });
    });

    return res.status(201).json(usuario);
  } catch (error) {
    return handleError(res, error);
  }
};

export const atualizarUsuario = async (req, res) => {
  try {
    const updated = await withAuditUser(req.user, async (transaction) => {
      const usuario = await UsuarioSistema.findByPk(req.params.id, { transaction });
      if (!usuario) return null;

      const updates = {};
      if (req.body.login !== undefined) updates.login = req.body.login;
      if (req.body.nome !== undefined) updates.nome = req.body.nome;
      if (req.body.perfil !== undefined) updates.perfil = req.body.perfil;
      if (req.body.ativo !== undefined) updates.ativo = req.body.ativo;

      if (Object.keys(updates).length) {
        await usuario.update(updates, { transaction });
      }

      if (req.body.password) {
        await sequelize.query('UPDATE usuarios_sistema SET senha_hash = SHA2(:password, 256), atualizado_em = NOW() WHERE id = :id', {
          replacements: { id: req.params.id, password: req.body.password },
          type: QueryTypes.UPDATE,
          transaction,
        });
      }

      return UsuarioSistema.findByPk(req.params.id, { attributes: userAttributes, transaction });
    });

    if (!updated) return res.status(404).json({ error: 'Usuário não encontrado.' });
    return res.json(updated);
  } catch (error) {
    return handleError(res, error);
  }
};

export const removerUsuario = async (req, res) => {
  try {
    const deleted = await withAuditUser(req.user, (transaction) => {
      return UsuarioSistema.destroy({ where: { id: req.params.id }, transaction });
    });
    if (!deleted) return res.status(404).json({ error: 'Usuário não encontrado.' });
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error);
  }
};
