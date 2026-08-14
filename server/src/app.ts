import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import router from './routes';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(router);

app.use(errorHandler);

export default app;
