import type { CognitoConfig } from '@config/cognito.config';
import { COGNITO_CONFIG_KEY } from '@config/cognito.config';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, type OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Algorithm, Secret } from 'jsonwebtoken';
import { decode, verify } from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import { lastValueFrom } from 'rxjs';

interface JwkKey {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg: string;
  use: string;
}

interface JwksResponse {
  keys: JwkKey[];
}

interface DecodedJwt {
  header: {
    kid: string;
    alg: string;
  };
  payload: CognitoTokenPayload;
}

export interface CognitoTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  given_name?: string;
  family_name?: string;
  'cognito:username': string;
  'cognito:groups'?: string[];
}

export interface CognitoUserPayload {
  sub: string;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  username: string;
  groups: string[];
}

// Only allow secure asymmetric algorithms used by Cognito
const ALLOWED_ALGORITHMS: Algorithm[] = ['RS256'];

/**
 * Service for AWS Cognito Auth operations
 *
 * Handles JWT token verification using Cognito's JWKS endpoint.
 */
@Injectable()
export class CognitoService implements OnModuleInit {
  private readonly logger = new Logger(CognitoService.name);
  private jwksCache: Map<string, string> = new Map(); // kid -> pem
  private config: CognitoConfig | null = null;
  private issuer: string = '';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  onModuleInit() {
    this.config = this.configService.get<CognitoConfig>(COGNITO_CONFIG_KEY) || null;

    if (!this.config?.userPoolId) {
      this.logger.warn('Cognito configuration not found. Auth will not work.');
      return;
    }

    // Build issuer URL
    this.issuer = `https://cognito-idp.${this.config.region}.amazonaws.com/${this.config.userPoolId}`;
    this.logger.log(`Cognito initialized for user pool: ${this.config.userPoolId}`);
  }

  /**
   * Validate a Cognito JWT token
   *
   * @param token - The JWT access or ID token to validate
   * @returns The decoded token payload
   * @throws UnauthorizedException if token is invalid or expired
   */
  async validateToken(token: string): Promise<CognitoUserPayload> {
    if (!this.config?.userPoolId) {
      throw new UnauthorizedException('Cognito not initialized');
    }

    // Decode token to get header (kid)
    const decodedJwt = this.decodeToken(token);

    // Get PEM for this key
    const pem = await this.getPemForKey(decodedJwt.header.kid);

    // Verify token signature and claims
    try {
      verify(token, pem, {
        algorithms: ALLOWED_ALGORITHMS,
        issuer: this.issuer,
      });
    } catch (err) {
      if (err instanceof Error) {
        throw new UnauthorizedException(err.message);
      }
      throw new UnauthorizedException('Token verification failed');
    }

    // Return normalized payload
    const payload = decodedJwt.payload;
    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified || false,
      firstName: payload.given_name,
      lastName: payload.family_name,
      username: payload['cognito:username'],
      groups: payload['cognito:groups'] || [],
    };
  }

  /**
   * Decode JWT without verification (to extract header)
   */
  private decodeToken(token: string): DecodedJwt {
    const decoded = decode(token, { complete: true });

    if (!decoded || typeof decoded === 'string') {
      throw new UnauthorizedException('Invalid JWT token format');
    }

    return decoded as unknown as DecodedJwt;
  }

  /**
   * Get PEM for a specific key ID, fetching JWKS if needed
   */
  private async getPemForKey(kid: string): Promise<Secret> {
    // Validate kid is a string to prevent type confusion attacks
    if (typeof kid !== 'string') {
      throw new UnauthorizedException('Invalid token: kid must be a string');
    }

    // Check cache first
    const cachedPem = this.jwksCache.get(kid);
    if (cachedPem) {
      return cachedPem;
    }

    // Fetch JWKS and cache all keys
    await this.fetchAndCacheJwks();

    // Check if key exists after fetch
    const pem = this.jwksCache.get(kid);
    if (!pem) {
      throw new UnauthorizedException('Invalid token: unknown key ID');
    }

    return pem;
  }

  /**
   * Fetch JWKS from Cognito and cache as PEMs
   */
  private async fetchAndCacheJwks(): Promise<void> {
    if (!this.config) {
      throw new UnauthorizedException('Cognito not initialized');
    }

    const jwksUrl = `${this.issuer}/.well-known/jwks.json`;

    try {
      const response$ = this.httpService.get<JwksResponse>(jwksUrl);
      const response = await lastValueFrom(response$);

      for (const key of response.data.keys) {
        const jwk = { kty: key.kty as 'RSA', n: key.n, e: key.e };
        const pem = jwkToPem(jwk);
        this.jwksCache.set(key.kid, pem);
      }

      this.logger.debug(`Cached ${response.data.keys.length} JWKS keys`);
    } catch (error) {
      this.logger.error('Failed to fetch JWKS', error);
      throw new UnauthorizedException('Failed to validate token');
    }
  }

  /**
   * Check if Cognito is properly initialized
   */
  isInitialized(): boolean {
    return this.config !== null && !!this.config.userPoolId;
  }

  /**
   * Get the Cognito user pool ID
   */
  getUserPoolId(): string {
    return this.config?.userPoolId || '';
  }

  /**
   * Get the Cognito client ID
   */
  getClientId(): string {
    return this.config?.clientId || '';
  }
}
