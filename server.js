import 'dotenv/config';
import cors from 'cors';
import express from 'express';

import { connectDB, dbHost, dbName, dbPort, dbUser } from './config/db.js';
import './models/index.js';
import AuthRoutes from './routes/AuthRoutes.js';
import CheckInRoutes from './routes/CheckInRoutes.js';
import CheckOutRoutes from './routes/CheckOutRoutes.js';
import ClienteRoutes from './routes/ClienteRoutes.js';
import ReservaRoutes from './routes/ReservaRoutes.js';
import RelatorioRoutes from './routes/RelatorioRoutes.js';

const app = express();
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || 'localhost';
const API_BASE_URL = `http://${HOST}:${PORT}`;

function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();
  const ip = req.ip || req.socket?.remoteAddress || 'ip-desconhecido';

  console.log(`➡️  ${req.method} ${req.originalUrl} | IP: ${ip}`);

  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const statusIcon = res.statusCode >= 500 ? '❌' : res.statusCode >= 400 ? '⚠️' : '✅';
    console.log(`${statusIcon} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${elapsedMs.toFixed(1)}ms)`);
  });

  next();
}

function logServerBoot() {
  console.log('🚀 Inicializando ThiHotel API...');
  console.log('🧭 Ambiente:', process.env.NODE_ENV || 'development');
  console.log('🔐 JWT_SECRET configurado:', process.env.JWT_SECRET ? 'sim' : 'não');
  console.log('🌐 CORS: habilitado para todas as origens');
  console.log('🗄️  MySQL alvo:', `${dbUser || '(usuário não informado)'}@${dbHost || 'localhost'}:${dbPort ? Number(dbPort) : 3306}/${dbName}`);
}

function logRegisteredRoutes() {
  console.log('📌 Rotas registradas:');
  console.log('   • GET  /api/health');
  console.log('   • POST /api/auth/login');
  console.log('   • /api/clientes');
  console.log('   • /api/reservas');
  console.log('   • /api/check-ins');
  console.log('   • /api/check-outs');
  console.log('   • GET  /api/relatorios/bd');
}

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ThiHotel API' });
});

app.use('/api/auth', AuthRoutes);
app.use('/api/clientes', ClienteRoutes);
app.use('/api/reservas', ReservaRoutes);
app.use('/api/check-ins', CheckInRoutes);
app.use('/api/check-outs', CheckOutRoutes);
app.use('/api/relatorios', RelatorioRoutes);

app.use((req, res) => {
  console.warn(`⚠️  Rota não encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Rota não encontrada.' });
});

logServerBoot();
await connectDB();
logRegisteredRoutes();

app.listen(PORT, () => {
  console.log(`✅ ThiHotel API rodando em ${API_BASE_URL}`);
  console.log(`🔎 Healthcheck: ${API_BASE_URL}/api/health`);
  console.log(`📖 Relatório do BD: ${API_BASE_URL}/api/relatorios/bd`);
});
