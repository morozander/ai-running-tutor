---
name: backend-background-work
description: Queue workers, crons, webhooks — per-record failure isolation, idempotency, fail-closed auth
globs: ["backend/src/queue-workers/**/*.ts", "backend/src/crons/**/*.ts", "backend/src/modules/features/**/*webhook*/**/*.ts"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# Background Work & Inbound Integrations

Covers the three "not called by your own frontend" entry points: SQS queue workers, scheduled crons, and inbound webhooks. The common thread: **the caller retries**, so every handler here must be safe to run twice.

All of these run outside the HTTP request scope — each invocation opens its own MikroORM context, never the shared EM (see [mikroorm.md](./mikroorm.md) §EM context outside HTTP).

## Queue workers (SQS)

### Per-record failure isolation

WHEN a handler processes a batch → try/catch **per record** and return only the failed `messageId`s in `batchItemFailures`. Wrapping the whole batch in one try/catch and returning every messageId on a single failure re-delivers (and re-executes) the already-successful records. e.g. (THIS repo): both `src/queue-workers/email-notification/email-notification.handler.ts` and `src/queue-workers/order-processing/order-processing.handler.ts` are the exemplars — each was rewritten to per-record try/catch returning only the failed messageIds.

### Handler response and event-source mapping are ONE decision

Partial-batch responses only work WHEN the Lambda event source mapping enables them — the SQS trigger must set `function_response_types = ["ReportBatchItemFailures"]`. Without it, the returned `batchItemFailures` is **silently IGNORED**: failed messages are deleted as successes (data loss, worse than a redelivery). Verify both sides whenever you touch either. (THIS repo: NO SQS event source mapping is wired in iaac yet — the queue-worker handlers are code exemplars without a live trigger. WHEN wiring one, `function_response_types = ["ReportBatchItemFailures"]` is REQUIRED from day one.)

### Idempotent consumers

SQS is at-least-once: a successfully processed message CAN arrive again (redelivery after a partial-batch retry, visibility-timeout expiry, producer retry). WHEN a consumer has side effects (email, payment, DB write) → make repeating it safe: dedupe on `messageId` or a natural key, or treat "already in target state" as success. The mutation-side mechanics live in [feature-modules.md](./feature-modules.md) — don't restate them here, reuse them.

### Ordering

WHEN message order matters (per-entity state machines) → FIFO queue + `MessageGroupId`. WHEN it doesn't → standard queue and let concurrency scale. Don't pay the FIFO throughput cost without an ordering requirement.

## Crons (EventBridge → Lambda)

- **Safe to double-fire.** EventBridge retries and can deliver a schedule event more than once — a cron body must tolerate running twice (same idempotency bar as a queue consumer).
- **Overlap signal:** can a slow run still be in flight when the next schedule fires, or can the job execute on more than one instance? If yes → take `pg_try_advisory_xact_lock(namespace, key)` **inside the job's transaction**; treat not-acquired as a logged skip ("another instance holds the lock"), never an error. Keep ONE repo-wide lock-namespace enum so jobs can't collide on keys. Portable to our Lambda crons — they all hit the same Postgres.
- **Timeout signal:** work that grows with data (scan-and-fix jobs) will eventually outgrow the Lambda timeout — process in bounded chunks and let the next tick continue, rather than one ever-longer run.
- **Log the zero case.** Every run emits one completion line with counts even when there was nothing to do — silence must mean "scheduler dead", never "idle". An absent log line is the only signal that the schedule stopped firing.

## Inbound webhooks

- **Auth fails CLOSED.** Verify the secret/signature first; a missing secret config rejects every request. A dev bypass must be EXPLICIT configuration, never the absence of configuration. e.g. (THIS repo): the fixed `src/modules/features/auth/cognito-webhook/cognito-webhook.controller.ts` — the only bypass is the explicit `WEBHOOK_ALLOW_UNVERIFIED=true` opt-in, ignored in production.
- **Signatures verify the RAW body.** HMAC is computed over the exact bytes received — wire `rawBody: true` in `NestFactory.create` and read `@RawBody()`; signing re-serialized JSON breaks intermittently (key order, whitespace). Compare with `crypto.timingSafeEqual` after a length check, and log a **distinct reason per rejection path** (missing secret / missing header / mismatch) so failures are diagnosable without lowering the guard.
- **Idempotent effect.** Webhook providers re-fire on timeout — make the effect an idempotent upsert. e.g. (THIS repo): `cognito-webhook.service.ts` check-then-acts on the user id and returns `created: false` on replay instead of throwing.
- Respond fast: verify, map to a feature service, return — keep slow work async.

WHEN a webhook needs a REST controller at all is decided by WHO calls it — see [architecture.md](./architecture.md).
