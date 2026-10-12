import type { CodegenConfig } from '@graphql-codegen/cli';
import { config as loadEnv } from 'dotenv';

loadEnv();

// Same contract as frontend/codegen.ts: the schema is introspected from the
// running backend at the URL the app itself queries (EXPO_PUBLIC_API_URL).
// Offline alternative: point the var at the committed schema artifact, e.g.
//   EXPO_PUBLIC_API_URL=../../backend/schema.graphql pnpm codegen
const endpoint = process.env.EXPO_PUBLIC_API_URL;
if (!endpoint) throw new Error('EXPO_PUBLIC_API_URL is not set in .env');

const config: CodegenConfig = {
  overwrite: true,
  schema: [
    {
      [endpoint]: {
        headers: {
          ...(process.env.GRAPHQL_SCHEMA_ORIGIN && {
            Origin: process.env.GRAPHQL_SCHEMA_ORIGIN,
          }),
        },
      },
    },
  ],
  documents: 'src/api/**/*.{graphql,gql}',
  generates: {
    // Output location documented in .agentic/rules/mobile/architecture.md
    'src/api/generated/index.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-react-apollo'],
      config: {
        gqlImport: '@apollo/client#gql',
        scalars: {
          DateTime: 'string',
        },
        // Documents + operation types only — feature hooks wrap useQuery with
        // explicit generics (see .agentic/rules/mobile/data.md "Hook wrapping").
        withComponent: false,
        withHOC: false,
        withHooks: false,
        // Apollo 4: QueryResult/MutationOptions are no longer exported from
        // '@apollo/client' root — don't emit v3-style helper types.
        withResultType: false,
        withMutationOptionsType: false,
      },
    },
  },
};

export default config;
