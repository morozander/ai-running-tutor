import type { CodegenConfig } from "@graphql-codegen/cli"
import { config as loadEnv } from "dotenv"

loadEnv()

const endpoint = process.env.VITE_APP_API_URL
if (!endpoint) throw new Error("VITE_APP_API_URL is not set in .env")

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
  documents: ["src/graphql/**/*.{ts,tsx}"],
  generates: {
    "src/graphql/generated/": {
      preset: "client",
      presetConfig: {
        fragmentMasking: false,
      },
      config: {
        namingConvention: "keep",
        operationResultSuffix: "",
        omitOperationSuffix: true,
        dedupeOperationSuffix: true,

        exportFragmentSpreadSubTypes: true,

        addUnderscoreToArgsType: true,
        unnestFragmentTypes: true,
        extractAllFieldsToTypes: true,

        fragmentSuffix: "",
        inlineFragmentTypes: "combine",

        enumsAsTypes: true,
        useTypeImports: true,
      },
    },
  },
}

export default config
