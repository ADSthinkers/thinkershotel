import { CheckOut, Cliente, Reserva } from '../models/index.js';

const handleError = (res, error) => {
  const status = error.name === 'SequelizeValidationError' ? 400 : 500;
  return res.status(status).json({ error: error.message });
};

const includeRelations = [
  { model: Reserva, as: 'reserva' },
  { model: Cliente, as: 'cliente' },
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

    const checkOut = await CheckOut.create(req.body);
    return res.status(201).json(checkOut);
  } catch (error) {
    return handleError(res, error);
  }
};

export const atualizarCheckOut = async (req, res) => {
  try {
    const checkOut = await CheckOut.findByPk(req.params.id);
    if (!checkOut) return res.status(404).json({ error: 'Check-out não encontrado.' });

    await checkOut.update(req.body);
    return res.json(checkOut);
  } catch (error) {
    return handleError(res, error);
  }
};

export const concluirCheckOut = async (req, res) => {
  try {
    const checkOut = await CheckOut.findByPk(req.params.id);
    if (!checkOut) return res.status(404).json({ error: 'Check-out não encontrado.' });

    await checkOut.update({ status: 'Concluido' });
    if (checkOut.reservaId) {
      await Reserva.update({ status: 'Check-out' }, { where: { id: checkOut.reservaId } });
    }

    return res.json(checkOut);
  } catch (error) {
    return handleError(res, error);
  }
};

export const removerCheckOut = async (req, res) => {
  try {
    const checkOut = await CheckOut.findByPk(req.params.id);
    if (!checkOut) return res.status(404).json({ error: 'Check-out não encontrado.' });

    await checkOut.destroy();
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error);
  }
};
