import express from 'express';
import { listarLogsAtividades } from '../controllers/LogController.js';
import { verifyToken } from '../middlewares/auth.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', listarLogsAtividades);

export default router;
