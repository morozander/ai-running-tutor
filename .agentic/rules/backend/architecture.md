---
name: backend-architecture
description: Domain vs Feature module split, dependency rules, CQRS patterns
globs: ["backend/src/**/*.ts"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# Backend Architecture

## Module structure

```
backend/src/
├── core/             # Infrastructure (DB, Auth, AWS, Logging, Telemetry)
├── modules/
│   ├── domain/       # Business logic (READ-ONLY services)
│   └── features/     # Use-case orchestration (ALL mutations)
├── crons/            # Scheduled jobs (EventBridge → Lambda)
├── queue-workers/    # SQS/SNS workers
├── shared/           # Shared utilities (BaseEntity)
└── config/           # Configuration loaders
```

## Critical rules

### Domain modules (`src/modules/domain/`)

- **READ-ONLY**. No create/update/delete operations.
- MUST NOT import other domain modules
- CAN ONLY use from `@core/`: `database`, `exceptions`, `logging`
- MUST NOT use: `@core/auth`, `@core/aws`, `@core/graphql`
- Business logic lives in **entities**, not services. See [entities.md](./entities.md).

### Feature modules (`src/modules/features/`)

- Handle **all mutations** (create/update/delete)
- CAN import domain modules
- CAN use all `@core/` services
- Use `EntityManager` directly for persistence — no custom repositories

## Mutation pattern (default)

```ts
@Injectable()
export class RegistrationService {
  constructor(
    private readonly em: EntityManager,        // writes
    private readonly userService: UserService, // reads via domain
  ) {}

  async registerUser(input: RegisterUserInput): Promise<User> {
    if (await this.userService.isEmailTaken(input.email)) {
      throw new EntityAlreadyExistsException('User', input.email);
    }
    const user = User.create({ ... });
    await this.em.persistAndFlush(user);
    return user;
  }
}
```

## CQRS (large projects only)

| Pattern | Lives in |
|---|---|
| Queries (read state) | Domain modules |
| Commands (change state) | Feature modules |

Reach for CQRS when: cross-domain communication, audit trails required, or multiple teams own different feature areas. Not needed for a 1-3 dev team.

## API style

The signal is WHO calls the endpoint, not what it returns:

- **WHEN the caller is your own frontend/mobile client** → GraphQL. No REST controllers, no Swagger. See [graphql.md](./graphql.md).
- **WHEN the caller is a machine that cannot speak your GraphQL contract** (identity-provider trigger, payment/webhook callback, health check) → a narrow REST controller is correct. Keep it thin: verify the secret/signature, map to a feature service, never expose it to end users. e.g. (THIS repo): `features/auth/cognito-webhook` is a `@Controller('webhooks/cognito')` because Cognito Lambda triggers POST JSON with a shared-secret header.

Webhook auth fails **closed**: a missing/invalid secret rejects the request. A dev bypass must be explicit configuration (a flag you set), never the absence of configuration.
