import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.APP_PORT ?? process.env.PORT ?? 3000),
  corsOrigin: process.env.CORS_ORIGIN,
  logLevel: process.env.LOG_LEVEL ?? 'info',
}));
