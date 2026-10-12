---
name: backend-opentelemetry
description: OpenTelemetry tracing — @Span decorator, naming conventions
globs: ["backend/src/**/*.service.ts", "backend/src/**/*.resolver.ts"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# OpenTelemetry

## Setup

The SDK is built in `src/core/telemetry/tracing.ts` (constructed at module load when `OTEL_ENABLED=true`) and started by the entrypoints:

```ts
import { otelSDK } from '@core/telemetry/tracing';

async function bootstrap() {
  if (otelSDK) await otelSDK.start();   // BEFORE NestFactory.create — this ordering is the contract
  const app = await NestFactory.create(AppModule);
  // ... rest of bootstrap
}
```

**Start order, not import position, is what this repo relies on.** Don't fight Biome's organize-imports to make the tracing import physically first — imports are auto-sorted (see code-style.md), and the real `lambda.ts` has `serverlessExpress` imported before tracing. What both entrypoints (`main.ts`, `lambda.ts`) actually guarantee is `await otelSDK.start()` **before** `NestFactory.create(...)`, so instrumentation is active before the app serves traffic. WHEN you add a new entrypoint, preserve that sequence.

## Adding spans

One heuristic: **`@Span()` (from `nestjs-otel`) WHEN the method is a business operation crossing an I/O boundary that you'd want to find by name in a trace** — external-service calls (Cognito, S3, SendGrid), multi-step orchestrations. NOT on getters, thin delegations, or simple EntityManager reads — HTTP and DB calls are already visible via auto-instrumentation (`tracing.ts` registers `getNodeAutoInstrumentations`), so a span there adds a name, and a name is only worth adding where the operation has business meaning.

e.g. (THIS repo): `RegistrationService` and `FileUploadService` span their Cognito/S3 operations; the domain `UserService` has no `@Span` — its plain DB reads show up through auto-instrumentation.

```ts
import { Span } from 'nestjs-otel';

@Injectable()
export class RegistrationService {
  @Span('registration.registerUser')
  async registerUser(input: RegisterUserInput): Promise<RegistrationResponse> {
    // orchestrates Cognito sign-up + welcome email — worth finding by name
  }
}
```

## Naming convention

Format: `module.operation`

```
registration.registerUser
user.findById
login.authenticate
order.processPayment
```

Don't include the class name — the module name carries enough context.

## Configuration

```env
OTEL_ENABLED=true
OTEL_SERVICE_NAME=nestjs-api
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SAMPLE_RATE=1.0
```

## Lambda + X-Ray

For Lambda with X-Ray:

```yaml
# serverless.yml or terraform equivalent
provider:
  tracing:
    lambda: true
    apiGateway: true

environment:
  OTEL_EXPORTER_OTLP_ENDPOINT: ''  # use X-Ray instead
```

## ECS + Jaeger/OTLP

```env
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
```

## Rules

- `@Span()` WHEN the method crosses an I/O or business boundary worth finding by name in a trace (see "Adding spans" above) — not on every public method
- Don't span trivial getters, one-liners, or reads already covered by auto-instrumentation
- Don't span methods that span their callees only (creates a duplicate span)
