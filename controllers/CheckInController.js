import { CheckIn, Cliente, Reserva } from '../models/index.js';
import { callProcedure, firstProcedureRow } from '../config/dbProcedures.js';

const handleError = (res, error) => {
  const status = error.name === 'SequelizeValidationError' ? 400 : 500;
  return res.status(status).json({ error: error.message });
};

const includeRelations = [
  { model: Reserva, as: 'reserva' },
  { model: Cliente, as: 'cliente' },
];

export const listarCheckIns = async (req, res) => {
  try {
    const checkIns = await CheckIn.findAll({ include: includeRelations, order: [['createdAt', 'DESC']] });
    return res.json(checkIns);
  } catch (error) {
    return handleError(res, error);
  }
};

export const buscarCheckIn = async (req, res) => {
  try {
    const checkIn = await CheckIn.findByPk(req.params.id, { include: includeRelations });
    if (!checkIn) return res.status(404).json({ error: 'Check-in não encontrado.' });
    return res.json(checkIn);
  } catch (error) {
    return handleError(res, error);
  }
};

export const criarCheckIn = async (req, res) => {
  try {
    const { hospede, quarto, data } = req.body;
    if (!hospede || !quarto || !data) {
      return res.status(400).json({ error: 'hospede, quarto e data são obrigatórios.' });
    }

    const checkIn = firstProcedureRow(
      await callProcedure(
        'CALL sp_criar_check_in(:reservaId, :clienteId, :hospede, :quarto, :data, :horario, :status, :telefone)',
        {
          reservaId: req.body.reservaId ?? null,
          clienteId: req.body.clienteId ?? null,
          hospede,
          quarto,
          data,
          horario: req.body.horario || null,
          status: req.body.status || null,
          telefone: req.body.telefone || null,
        }
      )
    );
    return res.status(201).json(checkIn);
  } catch (error) {
    return handleError(res, error);
  }
};

export const atualizarCheckIn = async (req, res) => {
  try {
    const checkIn = firstProcedureRow(
      await callProcedure('CALL sp_atualizar_check_in(:id, :payload)', {
        id: req.params.id,
        payload: JSON.stringify(req.body),
      })
    );
    if (!checkIn) return res.status(404).json({ error: 'Check-in não encontrado.' });
    return res.json(checkIn);
  } catch (error) {
    return handleError(res, error);
  }
};

export const concluirCheckIn = async (req, res) => {
  try {
    const checkIn = await CheckIn.findByPk(req.params.id);
    if (!checkIn) return res.status(404).json({ error: 'Check-in não encontrado.' });

    const updatedCheckIn = firstProcedureRow(await callProcedure('CALL sp_concluir_check_in(:id)', { id: req.params.id }));

    return res.json(updatedCheckIn);
  } catch (error) {
    return handleError(res, error);
  }
};

export const removerCheckIn = async (req, res) => {
  try {
    const result = firstProcedureRow(await callProcedure('CALL sp_remover_check_in(:id)', { id: req.params.id }));
    if (!result?.affectedRows) return res.status(404).json({ error: 'Check-in não encontrado.' });
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error);
  }
};
