import express from 'express';
import { listarRelatorioBD } from '../controllers/RelatorioController.js';
import { verifyToken } from '../middlewares/auth.js';

const router = express.Router();

router.use(verifyToken);

router.get('/bd', listarRelatorioBD);

export default router;
