import { CheckIn, Cliente, Reserva } from '../models/index.js';

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

    const checkIn = await CheckIn.create(req.body);
    return res.status(201).json(checkIn);
  } catch (error) {
    return handleError(res, error);
  }
};

export const atualizarCheckIn = async (req, res) => {
  try {
    const checkIn = await CheckIn.findByPk(req.params.id);
    if (!checkIn) return res.status(404).json({ error: 'Check-in não encontrado.' });

    await checkIn.update(req.body);
    return res.json(checkIn);
  } catch (error) {
    return handleError(res, error);
  }
};

export const concluirCheckIn = async (req, res) => {
  try {
    const checkIn = await CheckIn.findByPk(req.params.id);
    if (!checkIn) return res.status(404).json({ error: 'Check-in não encontrado.' });

    await checkIn.update({ status: 'Concluido' });
    if (checkIn.reservaId) {
      await Reserva.update({ status: 'Check-in' }, { where: { id: checkIn.reservaId } });
    }

    return res.json(checkIn);
  } catch (error) {
    return handleError(res, error);
  }
};

export const removerCheckIn = async (req, res) => {
  try {
    const checkIn = await CheckIn.findByPk(req.params.id);
    if (!checkIn) return res.status(404).json({ error: 'Check-in não encontrado.' });

    await checkIn.destroy();
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error);
  }
};
