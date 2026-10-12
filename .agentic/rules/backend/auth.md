---
name: backend-auth
description: Cognito authentication — guards, decorators, roles
globs: ["backend/src/**/auth/**/*.ts", "backend/src/**/*.guard.ts", "backend/src/**/*.decorator.ts"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# Authentication (Cognito)

## Auth flow

1. User registers/logs in via Cognito (`RegistrationService`, `LoginService`)
2. Cognito returns JWT tokens
3. Client sends `Authorization: Bearer <token>` header
4. `AuthGuard` validates the token and extracts user info
5. `@CurrentUser()` decorator provides the user payload to resolvers

## Guards

```ts
@Resolver()
export class UserResolver {
  @Query(() => User)
  @UseGuards(AuthGuard)
  async me(@CurrentUser() user: CurrentUserPayload) {
    return this.userService.findById(user.userId);
  }

  @Mutation(() => User)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteUser(@Args('id') id: string) {
    // ...
  }
}
```

**Default posture is least-privilege: guard it unless the ticket says otherwise.** A new query/mutation gets `@UseGuards(AuthGuard)` by default; add `RolesGuard` + `@Roles(...)` when the ticket scopes it to a role. Omitting the guard (public/anonymous) is the EXCEPTION — do it only when the ticket's Permissions explicitly says public, or the endpoint is unmistakably public by nature (the auth-bootstrap operations themselves — `registerUser` / `confirmRegistration` — a health check, a marketing read). The signal: *is this serving authenticated product data?* If yes, or if the ticket is silent → guarded. A silent ticket is NOT permission to ship public; the posture was resolved at `/start` (see start §4) and recorded — implement to that decision, and if it somehow wasn't recorded, default guarded and flag it rather than guessing public.

## CurrentUser decorator

```ts
@CurrentUser() user: CurrentUserPayload

// src/core/auth/decorators/current-user.decorator.ts — the real, normalized shape:
interface CurrentUserPayload {
  userId: string;  // the Cognito sub — doubles as User.id
  email: string;
  role: string;
}
```

**Normalize claims at the guard; downstream code never reads raw provider claims — the payload shape is the contract.** `AuthGuard` validates the JWT and maps the RAW Cognito claims (`sub`, `email`, `cognito:groups`, …) to this normalized payload. Raw claims are read in exactly two places — the `AuthGuard` mapping and the identity-provider webhook payload mapping; everything else (resolvers, services) consumes `CurrentUserPayload`. That mapping is the single place claim names may change when the provider does.

Heads-up (THIS repo): `AuthGuard` has a hardcoded `isDisabled = false` dev kill-switch. It exists for local development only and must never ship `true` — flag it in review if a diff flips it.

## Auth failure codes

WHEN a guard rejects → throw with a **distinct stable machine-readable code per cause** in `extensions.code` (e.g. `TOKEN_NOT_PROVIDED` / `TOKEN_EXPIRED` / `TOKEN_REVOKED` / `USER_NOT_FOUND`), not one lumped UNAUTHORIZED. The signal: would a client handle two causes differently? (expired → silent refresh; revoked/user-gone → sign out). One generic code forces clients to parse messages — which then become an accidental contract.

## Step-up auth for security-critical operations

WHEN an operation is security-critical beyond being logged in (change email/password, delete account, connect a financial account) → don't trust session age; require a fresh, short-TTL (~5 min) verification token bound to BOTH the **intent** (which operation it authorizes) and the **methods** used to verify. Intent binding prevents replaying one step-up across different sensitive actions; the guard compares the token's intent against the operation's declared intent and consumes the token on use. Transport-agnostic — works unchanged with our Bearer/GraphQL stack.

## Storing third-party credentials

WHEN persisting per-user third-party credentials or tokens (a user's external API keys, OAuth refresh tokens) → authenticated encryption at the app level: AES-256-GCM with a random IV + auth tag, a leading ciphertext **version byte** so the key/algorithm can rotate without a big-bang migration, key supplied via validated config. **A plaintext credentials column is a review-blocking finding.** (Distinct from infra secrets — those live in Secrets Manager per [iaac/secrets.md](../iaac/secrets.md); this is row-level user data the app must read and write.)

## Roles decorator

```ts
@Roles(UserRole.ADMIN)
@Roles(UserRole.ADMIN, UserRole.USER)
```

`RolesGuard` reads `@Roles()` metadata and checks against the user's role claim.

## User ID strategy

The Cognito `sub` (subject) is the database `User.id`. The mapping from raw provider claims happens at the identity-provider boundary — e.g. (THIS repo): the PostConfirmation webhook (`cognito-webhook.service.ts`) receives the provider payload as a DTO and creates the user:

```ts
// raw claims (sub, given_name, …) were already mapped into the DTO at the webhook boundary
const user = User.create({
  id: dto.userId, // = Cognito sub
  email: dto.email,
  firstName: dto.firstName,
});
```

This keeps Cognito and the DB in sync without an additional mapping table.

## Feature module only

Auth services (`CognitoService`, guards) are **only used in feature modules**, never in domain modules. Domain stays free of auth concerns.
