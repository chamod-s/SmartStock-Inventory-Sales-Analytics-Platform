import { prisma } from '../config/prisma';

export interface IHealthStatus {
  uptime: number;
  timestamp: string;
  version: string;
  environment: string;
  database: {
    connected: boolean;
    responseTimeMs?: number;
  };
}

export class HealthService {
  public async getHealthDiagnostics(): Promise<IHealthStatus> {
    const startTime = Date.now();
    let dbConnected = false;
    let responseTimeMs: number | undefined;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
      responseTimeMs = Date.now() - startTime;
    } catch {
      dbConnected = false;
    }

    return {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: dbConnected,
        ...(responseTimeMs !== undefined ? { responseTimeMs } : {}),
      },
    };
  }
}

export const healthService = new HealthService();
