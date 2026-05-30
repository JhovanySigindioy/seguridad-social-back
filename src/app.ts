import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import morgan from 'morgan';
import authRoutes from './features/auth/auth.routes.js';
import officeRoutes from './features/offices/offices.routes.js';
import affiliationRoutes from './features/affiliations/affiliations.routes.js';
import clientRoutes from './features/clients/clients.routes.js';
import companyRoutes from './features/companies/companies.routes.js';
import logger from './shared/utils/logger.js';
import { globalErrorHandler } from './error-handler.js';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

logger.info('Rutas cargadas: /api/auth, /api/offices, /api/affiliations, /api/clients, /api/companies');

app.use('/api/auth', authRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/affiliations', affiliationRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/companies', companyRoutes);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'vibe-coding-active', timestamp: new Date() }, error: null });
});

// Único error handler global — maneja MySQL, JWT, Zod y errores genéricos
app.use(globalErrorHandler);


export default app;
