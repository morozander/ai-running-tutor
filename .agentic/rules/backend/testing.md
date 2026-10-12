---
name: backend-testing
description: Jest unit and e2e test patterns
globs: ["backend/src/**/*.spec.ts", "backend/test/**/*.e2e-spec.ts"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# Testing Patterns

## Unit tests

Location: `__tests__/` folder within each module.

### Entity tests (Rich Domain Model)

```ts
describe('User Entity', () => {
  describe('create', () => {
    it('creates a user with valid data', () => {
      const user = User.create({
        id: 'cognito-sub-123',
        email: 'test@example.com',
        firstName: 'John',
      });

      expect(user.email).toBe('test@example.com');
      expect(user.firstName).toBe('John');
    });

    it('normalizes email to lowercase', () => {
      const user = User.create({
        id: '123',
        email: '  TEST@EXAMPLE.COM  ',
        firstName: 'John',
      });

      expect(user.email).toBe('test@example.com');
    });

    it('throws on invalid email', () => {
      expect(() => User.create({
        id: '123',
        email: 'invalid',
        firstName: 'John',
      })).toThrow(DomainValidationException);
    });
  });
});
```

### Service tests (with mocked EntityManager)

```ts
describe('UserService', () => {
  let service: UserService;
  let mockEm: jest.Mocked<EntityManager>;

  beforeEach(() => {
    mockEm = { findOne: jest.fn(), count: jest.fn() } as any;
    service = new UserService(mockEm);
  });

  it('returns user when found', async () => {
    mockEm.findOne.mockResolvedValue({ id: '123', email: 'test@example.com' });
    const result = await service.findById('123');
    expect(result).toEqual({ id: '123', email: 'test@example.com' });
  });

  it('throws EntityNotFoundException when not found', async () => {
    mockEm.findOne.mockResolvedValue(null);
    await expect(service.findById('123')).rejects.toThrow(EntityNotFoundException);
  });
});
```

## Integration tests

Location: `backend/test/` folder.

```ts
describe('Registration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('registers a new user', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1')
      .send({
        query: `mutation { registerUser(input: { ... }) { success } }`,
      });

    expect(response.body.data.registerUser.success).toBe(true);
  });
});
```

## Auth-flow e2e — WHEN an emulator earns its setup cost

Known gap (THIS repo): guarded endpoints aren't locally auth-testable — `AuthGuard` needs a real Cognito JWT, so e2e either skips guarded paths or fakes the guard, and neither exercises the contract. The fix is NOT an admin bypass; it's deciding whether an emulator suite is worth it:

- **WHEN auth/verification flows are core product surface and a regression there is release-blocking** → a LocalStack-style emulator e2e suite earns its setup cost: emulated Cognito + a mail catcher (MailHog), driving the REAL flow end to end — register, poll the mail API, extract the actual verification code, confirm, log in, hit guarded endpoints with the issued token. **No admin bypasses** — a bypass tests a path production never takes.
- **WHEN auth is a thin commodity wrapper** and guarded logic is already covered by unit tests with a mocked guard → the emulator stack (docker-compose services + test helpers) is over-engineering; don't pay for it.

**Reference pattern** (quantgeniee e2e suite — the in-company exemplar):

- Consume real artifacts only: real verification codes captured from email, real tokens issued by the emulated IdP.
- Document every emulator gap (e.g. Cognito Lambda triggers that don't fire under emulation) in a table, and bridge each gap EXPLICITLY in the test — e.g. invoke the webhook manually with a validly signed payload — never skip silently.

## Commands

```bash
pnpm test          # Unit tests
pnpm test:watch    # Watch mode
pnpm test:cov      # Coverage
pnpm test:e2e      # Integration tests
```

## Rules

- One file per class under test (`user.service.spec.ts`)
- Use `describe` blocks per method
- Mock at the `EntityManager` boundary; never mock entire services in their own test file
- Integration tests use the real DB (`docker-compose up postgres-test` first) — see [SETUP.md](../../../SETUP.md)
- Don't mock the DB in integration tests
