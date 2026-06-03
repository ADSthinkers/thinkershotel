import { Cliente } from '../models/index.js';

const handleError = (res, error) => {
  const status = error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError' ? 400 : 500;
  return res.status(status).json({ error: error.message });
};

export const listarClientes = async (req, res) => {
  try {
    const clientes = await Cliente.findAll({ order: [['createdAt', 'DESC']] });
    return res.json(clientes);
  } catch (error) {
    return handleError(res, error);
  }
};

export const buscarCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado.' });
    return res.json(cliente);
  } catch (error) {
    return handleError(res, error);
  }
};

export const criarCliente = async (req, res) => {
  try {
    const { nome, email, telefone } = req.body;
    if (!nome || !email || !telefone) {
      return res.status(400).json({ error: 'nome, email e telefone são obrigatórios.' });
    }

    const cliente = await Cliente.create(req.body);
    return res.status(201).json(cliente);
  } catch (error) {
    return handleError(res, error);
  }
};

export const atualizarCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado.' });

    await cliente.update(req.body);
    return res.json(cliente);
  } catch (error) {
    return handleError(res, error);
  }
};

export const removerCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado.' });

    await cliente.destroy();
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error);
  }
};
