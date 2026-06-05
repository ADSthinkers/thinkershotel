import 'dotenv/config';
import cors from 'cors';
import express from 'express';

import { connectDB } from './config/db.js';
import './models/index.js';
import AuthRoutes from './routes/AuthRoutes.js';
import CheckInRoutes from './routes/CheckInRoutes.js';
import CheckOutRoutes from './routes/CheckOutRoutes.js';
import ClienteRoutes from './routes/ClienteRoutes.js';
import ReservaRoutes from './routes/ReservaRoutes.js';
import RelatorioRoutes from './routes/RelatorioRoutes.js';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

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
  res.status(404).json({ error: 'Rota não encontrada.' });
});

await connectDB();

app.listen(PORT, () => {
  console.log(`ThiHotel API rodando em http://localhost:${PORT}`);
});
