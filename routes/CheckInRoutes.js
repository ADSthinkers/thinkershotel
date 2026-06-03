import express from 'express';
import {
  atualizarCheckIn,
  buscarCheckIn,
  concluirCheckIn,
  criarCheckIn,
  listarCheckIns,
  removerCheckIn,
} from '../controllers/CheckInController.js';
import { verifyToken } from '../middlewares/auth.js';

const router = express.Router();

router.use(verifyToken);

// todos os checkins
router.get('/', listarCheckIns);

// busca checkin por ID
router.get('/:id', buscarCheckIn);

// cria checkin
router.post('/', criarCheckIn);

// atualiza checkin como put (ex: para atualizar tudo do checkin)
router.put('/:id', atualizarCheckIn);

// atualiza checkin como patch (ex: só para atualizar o status)
router.patch('/:id', atualizarCheckIn);

// conclui checkin, ou seja, atualiza o status para "concluído"
router.patch('/:id/concluir', concluirCheckIn);

// deleta checkin
router.delete('/:id', removerCheckIn);

export default router;
