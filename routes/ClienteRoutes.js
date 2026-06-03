import express from 'express';
import {
  atualizarCliente,
  buscarCliente,
  criarCliente,
  listarClientes,
  removerCliente,
} from '../controllers/ClienteController.js';
import { verifyToken } from '../middlewares/auth.js';

const router = express.Router();

router.use(verifyToken);

//todos os clientes
router.get('/', listarClientes);
//busca cliente por ID
router.get('/:id', buscarCliente);
//cria cliente
router.post('/', criarCliente);
//atualiza cliente como put (ex: para atualizar tudo do cliente)
router.put('/:id', atualizarCliente);
//atualiza cliente como patch (ex: só para atualizar o status)
router.patch('/:id', atualizarCliente);
//deleta cliente
router.delete('/:id', removerCliente);

export default router;
