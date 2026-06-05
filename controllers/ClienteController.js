import { Cliente } from '../models/index.js';
import { callProcedure, firstProcedureRow } from '../config/dbProcedures.js';

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

    const cliente = firstProcedureRow(
      await callProcedure(
        'CALL sp_criar_cliente(:nome, :email, :telefone, :status, :totalHospedagens, :ultimaHospedagem)',
        {
          nome,
          email,
          telefone,
          status: req.body.status || null,
          totalHospedagens: req.body.totalHospedagens ?? null,
          ultimaHospedagem: req.body.ultimaHospedagem || null,
        }
      )
    );
    return res.status(201).json(cliente);
  } catch (error) {
    return handleError(res, error);
  }
};

export const atualizarCliente = async (req, res) => {
  try {
    const cliente = firstProcedureRow(
      await callProcedure('CALL sp_atualizar_cliente(:id, :payload)', {
        id: req.params.id,
        payload: JSON.stringify(req.body),
      })
    );
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado.' });
    return res.json(cliente);
  } catch (error) {
    return handleError(res, error);
  }
};

export const removerCliente = async (req, res) => {
  try {
    const result = firstProcedureRow(await callProcedure('CALL sp_remover_cliente(:id)', { id: req.params.id }));
    if (!result?.affectedRows) return res.status(404).json({ error: 'Cliente não encontrado.' });
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error);
  }
};
