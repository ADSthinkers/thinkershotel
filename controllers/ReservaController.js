import { CheckIn, Cliente, Reserva } from '../models/index.js';
import { callProcedure, databaseErrorStatus, firstProcedureRow } from '../config/dbProcedures.js';

const handleError = (res, error) => {
  const status = databaseErrorStatus(error) || (error.name === 'SequelizeValidationError' ? 400 : 500);
  return res.status(status).json({ error: error.message });
};

const includeCliente = [{ model: Cliente, as: 'cliente' }];

export const listarReservas = async (req, res) => {
  try {
    const reservas = await Reserva.findAll({ include: includeCliente, order: [['createdAt', 'DESC']] });
    return res.json(reservas);
  } catch (error) {
    return handleError(res, error);
  }
};

export const buscarReserva = async (req, res) => {
  try {
    const reserva = await Reserva.findByPk(req.params.id, { include: includeCliente });
    if (!reserva) return res.status(404).json({ error: 'Reserva não encontrada.' });
    return res.json(reserva);
  } catch (error) {
    return handleError(res, error);
  }
};

export const criarReserva = async (req, res) => {
  try {
    const { hospede, quarto, checkIn, checkOut } = req.body;
    if (!hospede || !quarto || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'hospede, quarto, checkIn e checkOut são obrigatórios.' });
    }

    const reserva = firstProcedureRow(
      await callProcedure(
        'CALL sp_criar_reserva(:clienteId, :hospede, :quarto, :checkIn, :checkOut, :status, :valorTotal)',
        {
          clienteId: req.body.clienteId ?? null,
          hospede,
          quarto,
          checkIn,
          checkOut,
          status: req.body.status || null,
          valorTotal: req.body.valorTotal ?? null,
        },
        req.user
      )
    );
    return res.status(201).json(reserva);
  } catch (error) {
    return handleError(res, error);
  }
};

export const atualizarReserva = async (req, res) => {
  try {
    const reserva = firstProcedureRow(
      await callProcedure('CALL sp_atualizar_reserva(:id, :payload)', {
        id: req.params.id,
        payload: JSON.stringify(req.body),
      }, req.user)
    );
    if (!reserva) return res.status(404).json({ error: 'Reserva não encontrada.' });
    return res.json(reserva);
  } catch (error) {
    return handleError(res, error);
  }
};

export const cancelarReserva = async (req, res) => {
  try {
    const reservaAtual = await Reserva.findByPk(req.params.id);
    if (!reservaAtual) return res.status(404).json({ error: 'Reserva não encontrada.' });

    const checkInEfetivado = reservaAtual.status === 'Check-in' || reservaAtual.status === 'Check-out' || Boolean(await CheckIn.count({ where: { reservaId: req.params.id, status: 'Concluido' } }));
    if (checkInEfetivado) {
      return res.status(409).json({ error: 'Não é possível cancelar reserva com check-in efetivado.' });
    }

    const reserva = firstProcedureRow(await callProcedure('CALL sp_cancelar_reserva(:id)', { id: req.params.id }, req.user));
    if (!reserva) return res.status(404).json({ error: 'Reserva não encontrada.' });
    return res.json(reserva);
  } catch (error) {
    return handleError(res, error);
  }
};

export const removerReserva = async (req, res) => {
  try {
    const result = firstProcedureRow(await callProcedure('CALL sp_remover_reserva(:id)', { id: req.params.id }, req.user));
    if (!result?.affectedRows) return res.status(404).json({ error: 'Reserva não encontrada.' });
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error);
  }
};
