import { UnderscoreNamingStrategy } from '@mikro-orm/core';

/**
 * MikroORM options that MUST stay identical between the CLI config
 * (backend/mikro-orm.config.ts) and the runtime DatabaseModule
 * (src/core/database/database.module.ts).
 *
 * Both configs spread this object so behavior-critical options (the
 * softDelete global filter, the naming strategy) cannot silently drift:
 * historically the filter existed only in the CLI config, so soft-deleted
 * rows leaked from every runtime query.
 *
 * Environment-specific options (host/credentials, pool sizing, entity
 * discovery, migrations/seeder paths) intentionally stay in their own
 * config — only invariants belong here.
 */
export const sharedMikroOrmOptions = {
  // Auto-convert camelCase to snake_case
  namingStrategy: UnderscoreNamingStrategy,

  // Global filters: hide soft-deleted rows by default in EVERY context.
  // Opt out per query with `em.find(..., { filters: { softDelete: false } })`.
  filters: {
    softDelete: {
      cond: { deletedAt: null },
      default: true,
    },
  },
};
