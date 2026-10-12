import { registerAs } from '@nestjs/config';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  /**
   * Comma-separated explicit origin allowlist for CORS. Empty means "no
   * explicit origins": cross-origin requests are then allowed WITHOUT
   * credentials (see shared/http/cors-options.ts).
   */
  corsOrigin: string;
  logLevel: string;
}

export const APP_CONFIG_KEY = 'app';

export default registerAs<AppConfig>(APP_CONFIG_KEY, () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN || '',
  logLevel: process.env.LOG_LEVEL || 'debug',
}));
