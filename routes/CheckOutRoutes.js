import express from 'express';
import {
  atualizarCheckOut,
  buscarCheckOut,
  concluirCheckOut,
  criarCheckOut,
  listarCheckOuts,
  removerCheckOut,
} from '../controllers/CheckOutController.js';
import { verifyToken } from '../middlewares/auth.js';

const router = express.Router();

router.use(verifyToken);

//todos os checkouts
router.get('/', listarCheckOuts);
//busca checkout por ID
router.get('/:id', buscarCheckOut);
//cria checkout
router.post('/', criarCheckOut);
//atualiza checkout como put (ex: para atualizar tudo do checkout)
router.put('/:id', atualizarCheckOut);
//atualiza checkout como patch (ex: só para atualizar o status)
router.patch('/:id', atualizarCheckOut);
//conclui checkout, ou seja, atualiza o status para "concluído"
router.patch('/:id/concluir', concluirCheckOut);
//deleta checkout
router.delete('/:id', removerCheckOut);

export default router;
