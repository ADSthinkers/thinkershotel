import express from 'express';
import {
  atualizarReserva,
  buscarReserva,
  cancelarReserva,
  criarReserva,
  listarReservas,
  removerReserva,
} from '../controllers/ReservaController.js';
import { verifyToken } from '../middlewares/auth.js';

const router = express.Router();

router.use(verifyToken);

// todas as reservas
router.get('/', listarReservas);
// busca reserva por ID
router.get('/:id', buscarReserva);
// cria reserva
router.post('/', criarReserva);
// atualiza reserva como put (ex: para atualizar tudo da reserva)
router.put('/:id', atualizarReserva);
// atualiza reserva como patch (ex: só para atualizar o status)
router.patch('/:id', atualizarReserva);
// cancela reserva
router.patch('/:id/cancelar', cancelarReserva);
// deleta reserva
router.delete('/:id', removerReserva);

export default router;
