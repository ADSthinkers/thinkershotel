import express from 'express';
import { login } from '../controllers/AuthController.js';

const router = express.Router();

// Rota de Login: POST http://localhost:5001/api/auth/login
router.post('/login', login);

export default router;