import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import logger from './logger';
import provisionRoutes from './routes/provision';
import statusRoutes from './routes/status';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 4500;

// Middleware
app.use(express.json());

// Error handler middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
});

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/provision', provisionRoutes);
app.use('/status', statusRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  logger.info(`af-provisioning-service listening on port ${PORT}`);
});

export default app;
