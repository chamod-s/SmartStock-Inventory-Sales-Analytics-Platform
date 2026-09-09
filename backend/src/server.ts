import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 SmartStock Production API Server active on port ${env.PORT} [${env.NODE_ENV}]`);
  console.log(`🏥 Health Check: http://localhost:${env.PORT}/api/v1/health`);
});

const gracefulShutdown = (signal: string) => {
  console.log(`\n⚠️ ${signal} received: closing HTTP server & disconnecting Prisma...`);
  server.close(async () => {
    console.log('🛑 HTTP server closed.');
    await prisma.$disconnect();
    console.log('🔌 Database connection closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
