import { CheckOut, Reserva } from '../models/index.js';
import { callProcedure, databaseErrorStatus, firstProcedureRow } from '../config/dbProcedures.js';

const handleError = (res, error) => {
  const status = databaseErrorStatus(error) || (error.name === 'SequelizeValidationError' ? 400 : 500);
  return res.status(status).json({ error: error.message });
};

const includeRelations = [
  { model: Reserva, as: 'reserva' },
];

export const listarCheckOuts = async (req, res) => {
  try {
    const checkOuts = await CheckOut.findAll({ include: includeRelations, order: [['createdAt', 'DESC']] });
    return res.json(checkOuts);
  } catch (error) {
    return handleError(res, error);
  }
};

export const buscarCheckOut = async (req, res) => {
  try {
    const checkOut = await CheckOut.findByPk(req.params.id, { include: includeRelations });
    if (!checkOut) return res.status(404).json({ error: 'Check-out não encontrado.' });
    return res.json(checkOut);
  } catch (error) {
    return handleError(res, error);
  }
};

export const criarCheckOut = async (req, res) => {
  try {
    const { hospede, quarto, data } = req.body;
    if (!hospede || !quarto || !data) {
      return res.status(400).json({ error: 'hospede, quarto e data são obrigatórios.' });
    }

    const checkOut = firstProcedureRow(
      await callProcedure(
        'CALL sp_criar_check_out(:reservaId, :hospede, :quarto, :data, :horario, :status, :telefone)',
        {
          reservaId: req.body.reservaId ?? null,
          hospede,
          quarto,
          data,
          horario: req.body.horario || null,
          status: req.body.status || null,
          telefone: req.body.telefone || null,
        },
        req.user
      )
    );
    return res.status(201).json(checkOut);
  } catch (error) {
    return handleError(res, error);
  }
};

export const atualizarCheckOut = async (req, res) => {
  try {
    const checkOut = firstProcedureRow(
      await callProcedure('CALL sp_atualizar_check_out(:id, :payload)', {
        id: req.params.id,
        payload: JSON.stringify(req.body),
      }, req.user)
    );
    if (!checkOut) return res.status(404).json({ error: 'Check-out não encontrado.' });
    return res.json(checkOut);
  } catch (error) {
    return handleError(res, error);
  }
};

export const concluirCheckOut = async (req, res) => {
  try {
    const checkOut = await CheckOut.findByPk(req.params.id);
    if (!checkOut) return res.status(404).json({ error: 'Check-out não encontrado.' });

    const updatedCheckOut = firstProcedureRow(await callProcedure('CALL sp_concluir_check_out(:id)', { id: req.params.id }, req.user));

    return res.json(updatedCheckOut);
  } catch (error) {
    return handleError(res, error);
  }
};

export const removerCheckOut = async (req, res) => {
  try {
    const result = firstProcedureRow(await callProcedure('CALL sp_remover_check_out(:id)', { id: req.params.id }, req.user));
    if (!result?.affectedRows) return res.status(404).json({ error: 'Check-out não encontrado.' });
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error);
  }
};
