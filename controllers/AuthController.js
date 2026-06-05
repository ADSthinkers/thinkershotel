import { signToken } from '../config/jwt.js';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const login = async (req, res) => {
  const loginInput = req.body.login || req.body.email || req.body.username;
  const { password } = req.body;

  if (!loginInput || !password) {
    return res.status(400).json({ error: 'login e password são obrigatórios.' });
  }

  try {
    const users = await sequelize.query(
      `
        SELECT id, login, nome, perfil
        FROM usuarios_sistema
        WHERE login = :login
          AND senha_hash = SHA2(:password, 256)
          AND ativo = TRUE
        LIMIT 1
      `,
      {
        replacements: { login: loginInput, password },
        type: QueryTypes.SELECT,
      }
    );

    const user = users[0];
    if (!user) {
      return res.status(401).json({ error: 'Login ou senha inválidos.' });
    }

    const token = signToken({ id: user.id, login: user.login, role: user.perfil });

    return res.json({
      token,
      user: {
        id: user.id,
        login: user.login,
        nome: user.nome,
        role: user.perfil,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
