# NestJS Lambda Boilerplate

A high-performance, Lambda-ready NestJS boilerplate using MikroORM and GraphQL with a Vertical Slice / Modular Monolith architecture.

## Features

- **Vertical Slice Architecture**: Domain modules (data & logic) + Feature modules (use-case orchestration)
- **CQRS Pattern**: Cross-module communication via Command/Query Bus (no EventEmitter)
- **Rich Domain Model**: Business logic lives inside entities
- **Lambda Optimized**: Lean imports, minimal cold start overhead
- **GraphQL Code-First**: Combined `@ObjectType` and `@Entity` decorators
- **MikroORM v6+**: Modern ORM with excellent TypeScript support
- **RBAC Security**: Role-based access control with guards and decorators
- **OpenTelemetry**: Distributed tracing and metrics (works in Lambda & ECS)
- **Structured Logging**: CloudWatch-optimized JSON logging
- **Modern Tooling**: Biome (linting/formatting) + Lefthook (git hooks)

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- Docker & Docker Compose
- pnpm (recommended) or npm
- [mise](https://mise.jdx.dev/) (optional, for version management)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd nestjs-lambda-boilerplate

# Option A: Using mise (recommended)
mise trust        # Allow mise execute commands here
mise install        # Installs Node.js and enables pnpm
mise run install    # Install dependencies

# Option B: Manual setup
pnpm install

# Copy environment file
cp .env.example .env

# Start PostgreSQL
docker-compose up -d postgres
# or: mise run docker-up

# Run migrations
pnpm run db:migrate:up
# or: mise run db-up

# Start development server
pnpm run start:dev
# or: mise run dev
```

### Access GraphQL Playground

Open [http://localhost:3000/api/v1](http://localhost:3000/api/v1) in your browser.

### CI/CD

Build and deploy run in the monorepo pipeline (BuildKit → ECR, then Lambda update). See root [SETUP.md](../SETUP.md) and [.github/workflows/](../.github/workflows/) for stages and variables.

## Project Structure

```
src/
├── config/                 # Configuration modules
│   ├── app.config.ts
│   ├── database.config.ts
│   └── aws.config.ts
│
├── core/                   # Infrastructure layer
│   ├── auth/              # Authentication & authorization
│   │   ├── cognito/       # AWS Cognito integration
│   │   ├── decorators/    # @Roles, @CurrentUser
│   │   └── guards/        # AuthGuard, RolesGuard
│   ├── aws/               # AWS services (Bedrock)
│   ├── database/          # MikroORM setup, migrations, seeders
│   ├── exceptions/        # Domain exceptions & GraphQL filter
│   ├── graphql/           # GraphQL module configuration
│   ├── logging/           # Structured logger for CloudWatch
│   └── telemetry/         # OpenTelemetry tracing & metrics
│
├── modules/
│   ├── domain/            # Domain modules (data & business logic)
│   │   └── user/
│   │       ├── entities/  # User entity with rich domain logic
│   │       ├── services/  # Domain service
│   │       ├── commands/  # Domain-level commands
│   │       └── queries/   # CQRS query handlers
│   │
│   └── features/          # Feature modules (use-case orchestration)
│       └── registration/
│           ├── dto/       # GraphQL input/output types
│           ├── commands/  # CQRS command handlers
│           ├── services/  # Feature service
│           └── resolvers/ # GraphQL resolvers
│
├── shared/                # Shared utilities
│   └── database/          # Base entity, dictionaries
│
└── main.ts                # Application entry point
```

## CLI Commands

### Development

```bash
pnpm run start:dev      # Start with hot reload
pnpm run start:debug    # Start with debugger
pnpm run build          # Build for production
pnpm run start:prod     # Run production build
```

### Database

```bash
pnpm run db:migrate:create   # Create new migration
pnpm run db:migrate:up       # Run pending migrations
pnpm run db:migrate:down     # Rollback last migration
pnpm run db:migrate:fresh    # Drop all & re-run migrations
pnpm run db:seed             # Run database seeders
```

### Code Quality

```bash
pnpm run check          # Run Biome check (lint + format)
pnpm run check:fix      # Fix auto-fixable issues
pnpm run lint           # Run linter only
pnpm run format         # Run formatter only
```

### Testing

```bash
pnpm run test           # Run unit tests
pnpm run test:watch     # Run tests in watch mode
pnpm run test:cov       # Run tests with coverage
pnpm run test:e2e       # Run integration tests
```

### Code Generation

```bash
pnpm run create:domain <name>   # Generate new domain module
```

## Mise (Version Manager)

This project includes a `mise.toml` configuration for [mise](https://mise.jdx.dev/) - a polyglot runtime manager.

### Installation

```bash
# macOS
brew install mise

# Linux/macOS (curl)
curl https://mise.run | sh

# Add to shell (bash/zsh)
echo 'eval "$(mise activate bash)"' >> ~/.bashrc
# or for zsh:
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
```

### First Time Setup

```bash
cd nestjs-lambda-boilerplate
mise trust          # Trust this project's config (one-time)
mise install        # Install Node.js version specified in mise.toml
```

### Available Tasks

Run tasks with `mise run <task>` or `mise r <task>`:

| Task | Alias | Description |
|------|-------|-------------|
| `install` | `i` | Install dependencies |
| `dev` | `d` | Start development server |
| `build` | `b` | Build for production |
| `test` | `t` | Run tests |
| `test-watch` | `tw` | Run tests in watch mode |
| `lint` | `l` | Run linter |
| `lint-fix` | `lf` | Fix linting issues |
| `db-up` | - | Run database migrations |
| `db-down` | - | Rollback last migration |
| `db-fresh` | - | Fresh database (drop & migrate) |
| `db-seed` | - | Seed database |
| `docker-up` | `du` | Start Docker services |
| `docker-down` | `dd` | Stop Docker services |
| `create-domain` | - | Generate new domain module |

### What mise.toml Provides

1. **Node.js version pinning** - Ensures everyone uses the same Node version
2. **Auto-activation** - Tools activate when you `cd` into the project
3. **PATH management** - `node_modules/.bin` added to PATH (no `npx` needed)
4. **Task runner** - Short aliases for common commands
5. **Environment variables** - Project-specific env vars

### Example Workflow

```bash
cd nestjs-lambda-boilerplate  # mise auto-activates
mise r du                      # Start Docker (alias for docker-up)
mise r db-up                   # Run migrations
mise r d                       # Start dev server (alias for dev)
mise r t                       # Run tests (alias for test)
```

## Docker

### Development

```bash
# Start PostgreSQL only
docker-compose up -d postgres

# Start test database
docker-compose up -d postgres-test

# Stop all services
docker-compose down

# View logs
docker-compose logs -f postgres
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production/test) | development |
| `PORT` | Application port | 3000 |
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_USER` | PostgreSQL user | postgres |
| `DB_PASSWORD` | PostgreSQL password | postgres |
| `DB_NAME` | PostgreSQL database name | app_database |
| `AWS_REGION` | AWS region | eu-central-1 |
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID | - |
| `COGNITO_CLIENT_ID` | Cognito Client ID | - |
| `COGNITO_CLIENT_SECRET` | Cognito Client Secret | - |
| `BEDROCK_MODEL_ID` | Bedrock model ID | anthropic.claude-3-sonnet-20240229-v1:0 |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | debug |
| `OTEL_ENABLED` | Enable OpenTelemetry | false |
| `OTEL_SERVICE_NAME` | Service name for traces | nestjs-app |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint | - |

## OpenTelemetry

The boilerplate includes OpenTelemetry for distributed tracing and metrics. Works in Lambda, ECS, and local development.

### Enable Telemetry

```bash
# .env
OTEL_ENABLED=true
OTEL_SERVICE_NAME=my-service
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### Using @Span Decorator

```typescript
import { Span } from 'nestjs-otel';

@Injectable()
export class MyService {
  @Span('my-operation')
  async doSomething() {
    // This method will be traced
  }
}
```

### Lambda with AWS X-Ray

Use the [AWS Distro for OpenTelemetry Lambda Layer](https://aws-otel.github.io/docs/getting-started/lambda):

```yaml
# serverless.yml
functions:
  api:
    layers:
      - arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:1
    environment:
      OTEL_ENABLED: true
      OTEL_SERVICE_NAME: my-lambda
      AWS_LAMBDA_EXEC_WRAPPER: /opt/otel-handler
```

### ECS with Jaeger/Tempo

```yaml
# docker-compose.yml
services:
  app:
    environment:
      OTEL_ENABLED: true
      OTEL_SERVICE_NAME: my-service
      OTEL_EXPORTER_OTLP_ENDPOINT: http://jaeger:4318
  
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI
      - "4318:4318"    # OTLP HTTP
```

## Documentation

- [Architecture Philosophy](./docs/architecture-philosophy.md) - Design principles and patterns
- [ADR: Initial Architecture](./docs/adr/0001-initial-architecture.md) - Architectural decisions
- [Cookbook](./docs/cookbook.md) - How-to guides for common tasks
- [Contribution Guide](./docs/contribution.md) - Development guidelines

## License

MIT
