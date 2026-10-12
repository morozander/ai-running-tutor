import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

/**
 * Registration E2E Tests
 *
 * These tests verify the registration flow with Cognito.
 * Note: For full e2e testing, you need a test Cognito User Pool
 * or mock the CognitoIdentityProviderClient.
 *
 * For unit/integration tests without Cognito, see the service tests.
 */
describe('Registration (e2e)', () => {
  let app: INestApplication;

  // Mock Cognito responses
  const mockCognitoClient = {
    send: jest.fn(),
  };

  beforeAll(async () => {
    // Dynamic import to avoid issues with module resolution
    const { AppModule } = await import('../src/app.module');
    const { CognitoIdentityProviderClient } = await import(
      '@aws-sdk/client-cognito-identity-provider'
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CognitoIdentityProviderClient)
      .useValue(mockCognitoClient)
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      // Mock successful Cognito SignUp
      mockCognitoClient.send.mockResolvedValueOnce({
        UserSub: 'cognito-sub-123',
        UserConfirmed: false,
      });

      const response = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'New',
        lastName: 'User',
      });

      expect(response.status).toBe(201);
      expect(response.body.userId).toBe('cognito-sub-123');
      expect(response.body.email).toBe('newuser@example.com');
      expect(response.body.confirmationRequired).toBe(true);
    });

    it('should fail with invalid email', async () => {
      const response = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('email');
    });

    it('should fail with weak password', async () => {
      const response = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'test@example.com',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(response.status).toBe(400);
    });

    it('should fail with missing firstName', async () => {
      const response = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        lastName: 'User',
      });

      expect(response.status).toBe(400);
    });

    it('should handle Cognito UsernameExistsException', async () => {
      mockCognitoClient.send.mockRejectedValueOnce({
        name: 'UsernameExistsException',
        message: 'User already exists',
      });

      const response = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'existing@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /auth/confirm', () => {
    it('should confirm registration with valid code', async () => {
      mockCognitoClient.send.mockResolvedValueOnce({});

      const response = await request(app.getHttpServer()).post('/auth/confirm').send({
        email: 'test@example.com',
        code: '123456',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail with invalid code', async () => {
      mockCognitoClient.send.mockRejectedValueOnce({
        name: 'CodeMismatchException',
        message: 'Invalid code',
      });

      const response = await request(app.getHttpServer()).post('/auth/confirm').send({
        email: 'test@example.com',
        code: 'wrong-code',
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid verification code');
    });
  });

  describe('POST /auth/resend-code', () => {
    it('should resend verification code', async () => {
      mockCognitoClient.send.mockResolvedValueOnce({});

      const response = await request(app.getHttpServer()).post('/auth/resend-code').send({
        email: 'test@example.com',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail for non-existent user', async () => {
      mockCognitoClient.send.mockRejectedValueOnce({
        name: 'UserNotFoundException',
        message: 'User not found',
      });

      const response = await request(app.getHttpServer()).post('/auth/resend-code').send({
        email: 'nonexistent@example.com',
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('User not found');
    });
  });

  describe('registerUser mutation (GraphQL)', () => {
    const registerMutation = `
      mutation RegisterUser($input: RegisterUserInput!) {
        registerUser(input: $input) {
          userId
          email
          confirmationRequired
          message
        }
      }
    `;

    it('should register a new user via GraphQL', async () => {
      mockCognitoClient.send.mockResolvedValueOnce({
        UserSub: 'cognito-sub-456',
        UserConfirmed: false,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1')
        .send({
          query: registerMutation,
          variables: {
            input: {
              email: 'graphql@example.com',
              password: 'SecurePass123!',
              firstName: 'GraphQL',
              lastName: 'User',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();

      const { registerUser } = response.body.data;
      expect(registerUser.userId).toBe('cognito-sub-456');
      expect(registerUser.email).toBe('graphql@example.com');
      expect(registerUser.confirmationRequired).toBe(true);
    });

    it('should fail with invalid email via GraphQL', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1')
        .send({
          query: registerMutation,
          variables: {
            input: {
              email: 'invalid-email',
              password: 'SecurePass123!',
              firstName: 'Test',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('me query (GraphQL)', () => {
    const meQuery = `
      query Me {
        me {
          id
          email
          firstName
          lastName
          fullName
        }
      }
    `;

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1').send({
        query: meQuery,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('authorization');
    });
  });

  describe('user query (GraphQL)', () => {
    const userQuery = `
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          email
          firstName
          lastName
          role
        }
      }
    `;

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1')
        .send({
          query: userQuery,
          variables: {
            id: 'some-id',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
    });
  });
});
