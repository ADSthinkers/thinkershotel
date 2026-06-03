import { signToken } from '../config/jwt.js';

export const login = (req, res) => {
  const { email, password } = req.body;
  const authEmail = process.env.AUTH_EMAIL;
  const authPassword = process.env.AUTH_PASSWORD;

  if (!authEmail || !authPassword) {
    return res.status(500).json({ error: 'Credenciais de autenticação não configuradas no .env.' });
  }

  if (!email || !password) {
    return res.status(400).json({ error: 'email e password são obrigatórios.' });
  }

  if (email !== authEmail || password !== authPassword) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
  }

  const token = signToken({ email, role: 'admin' });

  return res.json({
    token,
    user: {
      email,
      role: 'admin',
    },
  });
};
