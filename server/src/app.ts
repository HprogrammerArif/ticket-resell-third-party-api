import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { prisma } from './libs/db';
import { errorHandler } from './middleware/errorHandler';
import router from './routes';

const app = express();

// Trust exactly 1 proxy hop (Caddy reverse proxy).
// Critical so req.ip reflects the actual client IP for rate limiting.
app.set('trust proxy', 1);

// Security & performance headers
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '100kb' }));

// NOTE ON CORS:
// CORS middleware is intentionally NOT enabled here.
// In the BFF (Backend-for-Frontend) architecture, the browser NEVER communicates
// directly with this Express API. All requests are routed through Next.js server-side
// over the internal Docker network. Keeping Express private removes CORS complexity
// and shields the entire API surface from direct public access.

// Liveness check — is the Node process running? (Used by Docker HEALTHCHECK)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Readiness check — can the server query the database? (Used by uptime monitoring)
app.get('/health/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'unreachable' });
  }
});

app.use(router);

app.use(errorHandler);

export default app;

