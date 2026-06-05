import express from 'express';
import {
  atualizarUsuario,
  buscarUsuario,
  criarUsuario,
  listarUsuarios,
  removerUsuario,
} from '../controllers/UsuarioController.js';
import { verifyToken } from '../middlewares/auth.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', listarUsuarios);
router.get('/:id', buscarUsuario);
router.post('/', criarUsuario);
router.put('/:id', atualizarUsuario);
router.patch('/:id', atualizarUsuario);
router.delete('/:id', removerUsuario);

export default router;
