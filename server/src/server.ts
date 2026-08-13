import { env } from './config/env';
import app from './app';
import { logger } from './libs/logger';

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});
