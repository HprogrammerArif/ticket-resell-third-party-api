import { env } from './config/env';
import app from './app';
import { logger } from './libs/logger';
import { prisma } from './libs/db';
import { revokeToken } from './modules/ticketnetwork/auth';

const server = app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Graceful shutdown initiated');
  server.close(async () => {
    try {
      await revokeToken();
      await prisma.$disconnect();
      logger.info('Cleaned up resources successfully');
    } catch (err) {
      logger.error(err, 'Error during graceful shutdown');
    }
    process.exit(0);
  });

  // Never let hanging open sockets or DB queries stall shutdown past Docker grace period
  setTimeout(() => {
    logger.warn('Forced shutdown after timeout');
    process.exit(1);
  }, 9000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

