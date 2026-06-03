import { Cliente, Reserva } from '../models/index.js';

const handleError = (res, error) => {
  const status = error.name === 'SequelizeValidationError' ? 400 : 500;
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

    const reserva = await Reserva.create(req.body);
    return res.status(201).json(reserva);
  } catch (error) {
    return handleError(res, error);
  }
};

export const atualizarReserva = async (req, res) => {
  try {
    const reserva = await Reserva.findByPk(req.params.id);
    if (!reserva) return res.status(404).json({ error: 'Reserva não encontrada.' });

    await reserva.update(req.body);
    return res.json(reserva);
  } catch (error) {
    return handleError(res, error);
  }
};

export const cancelarReserva = async (req, res) => {
  try {
    const reserva = await Reserva.findByPk(req.params.id);
    if (!reserva) return res.status(404).json({ error: 'Reserva não encontrada.' });

    await reserva.update({ status: 'Cancelada' });
    return res.json(reserva);
  } catch (error) {
    return handleError(res, error);
  }
};

export const removerReserva = async (req, res) => {
  try {
    const reserva = await Reserva.findByPk(req.params.id);
    if (!reserva) return res.status(404).json({ error: 'Reserva não encontrada.' });

    await reserva.destroy();
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error);
  }
};
