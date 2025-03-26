import { Elysia } from 'elysia';
import { config } from './config.util';
import { formatSuccess } from './validation.util';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
}

export const healthCheck = (app: Elysia): Elysia => {
  return app.get('/api/health', () => {
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: `${config.api.version}`,
      environment: config.api.nodeEnv,
      uptime: process.uptime()
    };

    return formatSuccess(healthStatus);
  });
}; 