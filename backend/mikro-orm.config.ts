import { existsSync, readFileSync } from "node:fs";
import { Migrator } from '@mikro-orm/migrations';
import { defineConfig } from '@mikro-orm/postgresql';
import { SeedManager } from '@mikro-orm/seeder';
import * as dotenv from 'dotenv';
import { sharedMikroOrmOptions } from './src/core/database/mikro-orm.shared-options';

const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env';
dotenv.config({ path: envFile });
dotenv.config({ path: '.env' });

const schema = process.env.RDS_DATABASE_SCHEMA || 'public';
const isLocalDev = process.env.NODE_ENV === 'development';
const RDS_CA_PATH = '/cert/global-bundle.pem';

const sslOptions = isLocalDev
  ? {}
  : {
      ssl: existsSync(RDS_CA_PATH)
        ? { rejectUnauthorized: true, ca: readFileSync(RDS_CA_PATH, 'utf8') }
        : { rejectUnauthorized: false },
    };

const driverOptions = {
  connection: {
    ...sslOptions,
    ...(schema !== 'public' && { options: `-c search_path=${schema},public` }),
  },
};

export default defineConfig({
  host: process.env.RDS_DATABASE_HOST || 'localhost',
  port: Number(process.env.RDS_DATABASE_PORT) || 5432,
  user: process.env.RDS_DATABASE_USERNAME || 'postgres',
  password: process.env.RDS_DATABASE_PASSWORD || 'postgres',
  dbName: process.env.RDS_DATABASE_NAME || 'app_database',
  schema,
  driverOptions,

  // Naming strategy + global filters (softDelete) shared with the runtime
  // DatabaseModule — single source so CLI and runtime cannot drift.
  ...sharedMikroOrmOptions,

  // Entity discovery
  entities: ['./dist/modules/domain/**/entities/*.entity.js'],
  entitiesTs: ['./src/modules/domain/**/entities/*.entity.ts'],

  // Migrations
  migrations: {
    path: './src/core/database/migrations',
    pathTs: './src/core/database/migrations',
    glob: '!(*.d).{js,ts}',
    transactional: true,
    disableForeignKeys: false,
    allOrNothing: true,
    snapshot: true,
  },

  // Seeder
  seeder: {
    path: './src/core/database/seeders',
    pathTs: './src/core/database/seeders',
    defaultSeeder: 'DatabaseSeeder',
    glob: '!(*.d).{js,ts}',
  },

  // Extensions
  extensions: [Migrator, SeedManager],

  // Performance optimizations for Lambda
  pool: {
    min: 0,
    max: 10,
  },

  // Debug mode (disable in production)
  debug: process.env.NODE_ENV === 'development',

  // Schema generator options
  schemaGenerator: {
    disableForeignKeys: false,
    createForeignKeyConstraints: true,
  },
});
