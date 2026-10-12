# Backend Package — AI Context

## Stack

- **NestJS 11** with `@nestjs/graphql` (code-first)
- **TypeScript** strict mode
- **MikroORM v6** + PostgreSQL 17
- **Apollo Server** under the hood (via `@nestjs/apollo`)
- **AWS Lambda** runtime (deployed via ECR)
- **OpenTelemetry** via `nestjs-otel`
- **Jest** for unit + e2e tests
- **Biome** for lint/format
- **Lefthook** for git hooks
- **pnpm 9** package manager

## Folder layout

```
backend/src/
├── core/              # Infra: db, auth, aws, logging, telemetry, sendgrid
├── modules/
│   ├── domain/        # Read-only services per business concept
│   └── features/      # Mutations + resolvers per use case
├── crons/             # Scheduled Lambda handlers
├── queue-workers/     # SQS/SNS workers
├── shared/            # BaseEntity, shared utilities
├── config/            # Config loaders
├── lambda.ts          # Lambda entry
└── main.ts            # Local entry (non-Lambda)
```

## Architectural rules

| Layer | Allowed | Forbidden |
|---|---|---|
| `domain/<X>/services/` | Reads only — `findOne`, `find`, `count` | `persist`, `flush`, mutations |
| `domain/<X>/entities/` | Business logic, factory methods, validation | Service injection |
| `features/<X>/services/` | All mutations, external service orchestration | (none — broad permission) |
| `features/<X>/resolvers/` | Wire DTO ↔ service, apply guards | Business logic |

See [.agentic/rules/backend/architecture.md](../rules/backend/architecture.md) for details.

## Path aliases

| Alias | Maps to |
|---|---|
| `@core/*` | `backend/src/core/*` |
| `@modules/*` | `backend/src/modules/*` |
| `@shared/*` | `backend/src/shared/*` |
| `@config/*` | `backend/src/config/*` |

## Commands

```bash
cd backend
pnpm install
pnpm start:dev        # local dev (auto-reload)
pnpm build            # production build
pnpm test             # unit tests
pnpm test:e2e         # integration tests (needs docker-compose up postgres-test)
pnpm check            # Biome lint + format check
pnpm check:fix        # auto-fix
pnpm db:migrate:create # generate new migration from entity diff (see backend/package.json for the full db:* script set)
pnpm db:migrate:up     # apply pending migrations
```

## Relevant rule files

- [Architecture](../rules/backend/architecture.md)
- [Adding modules](../rules/backend/adding-modules.md)
- [Domain services](../rules/backend/domain-services.md)
- [Feature modules](../rules/backend/feature-modules.md)
- [Entities](../rules/backend/entities.md)
- [MikroORM](../rules/backend/mikroorm.md)
- [GraphQL](../rules/backend/graphql.md)
- [Auth (Cognito)](../rules/backend/auth.md)
- [Exceptions](../rules/backend/exceptions.md)
- [Testing](../rules/backend/testing.md)
- [Lambda optimization](../rules/backend/lambda.md)
- [OpenTelemetry](../rules/backend/opentelemetry.md)
- [Naming](../rules/backend/naming.md)
- [Code style](../rules/backend/code-style.md)
