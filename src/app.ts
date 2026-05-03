import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import morgan from 'morgan';
import authRoutes from './features/auth/auth.routes.js';
import officeRoutes from './features/offices/offices.routes.js';
import affiliationRoutes from './features/affiliations/affiliations.routes.js';
import logger from './shared/utils/logger.js';

dotenv.config();

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Logger de registro de rutas
logger.info('🛰️ Rutas cargadas: /api/auth, /api/offices, /api/affiliations');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/affiliations', affiliationRoutes);

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'vibe-coding-active', timestamp: new Date() }, error: null });
});

// Error Handler Universal
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('💥 Error detectado:', { 
    message: err.message, 
    stack: err.stack,
    path: req.path,
    method: req.method 
  });
  
  res.status(err.status || 500).json({ 
    success: false, 
    data: null, 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error' 
  });
});

export default app;
