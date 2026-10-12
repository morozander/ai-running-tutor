import 'dotenv/config';
import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  name: string;
  schema: string;
  password: string;
  poolMin: number;
  poolMax: number;
}

export const DATABASE_CONFIG_KEY = 'database';

export default registerAs<DatabaseConfig>(DATABASE_CONFIG_KEY, () => ({
  host: process.env.RDS_DATABASE_HOST || 'localhost',
  port: parseInt(process.env.RDS_DATABASE_PORT || '5432', 10),
  user: process.env.RDS_DATABASE_USERNAME || 'postgres',
  name: process.env.RDS_DATABASE_NAME || 'app_database',
  schema: process.env.RDS_DATABASE_SCHEMA || 'public',
  password: process.env.RDS_DATABASE_PASSWORD || 'postgres',
  poolMin: parseInt(process.env.RDS_DATABASE_POOL_MIN || '0', 10),
  poolMax: parseInt(process.env.RDS_DATABASE_POOL_MAX || '10', 10),
}));
