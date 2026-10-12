/**
 * Drop a PostgreSQL schema (from RDS_DATABASE_SCHEMA env var) with CASCADE.
 * Used during per-PR ephemeral environment cleanup.
 */

const { existsSync, readFileSync } = require('node:fs');
const { MikroORM } = require('@mikro-orm/core');
const { PostgreSqlDriver } = require('@mikro-orm/postgresql');

const RDS_CA_PATH = '/cert/global-bundle.pem';

function getDriverOptions(host) {
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  if (isLocal) return {};

  const useCa = existsSync(RDS_CA_PATH);
  return {
    connection: {
      ssl: useCa
        ? { rejectUnauthorized: true, ca: readFileSync(RDS_CA_PATH, 'utf8') }
        : { rejectUnauthorized: false },
    },
  };
}

async function run() {
  const schema = process.env.RDS_DATABASE_SCHEMA;
  if (!schema || schema === 'public') {
    throw new Error('RDS_DATABASE_SCHEMA must be set to a non-public schema name');
  }

  const host = process.env.RDS_DATABASE_HOST || 'localhost';

  const orm = await MikroORM.init({
    driver: PostgreSqlDriver,
    host,
    port: Number(process.env.RDS_DATABASE_PORT) || 5432,
    user: process.env.RDS_DATABASE_USERNAME || 'postgres',
    password: process.env.RDS_DATABASE_PASSWORD || 'postgres',
    dbName: process.env.RDS_DATABASE_NAME || 'app_database',
    schema,
    driverOptions: getDriverOptions(host),
    discovery: { warnWhenNoEntities: false },
    allowGlobalContext: true,
  });

  const conn = orm.em.getConnection();
  console.log(`Dropping schema "${schema}" cascade...`);
  await conn.execute(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  console.log(`Schema "${schema}" dropped.`);
  await orm.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
