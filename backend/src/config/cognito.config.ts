import { registerAs } from '@nestjs/config';

export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  clientSecret?: string;
  region: string;
  webhookSecret?: string;
  /**
   * EXPLICIT local-dev opt-in (WEBHOOK_ALLOW_UNVERIFIED=true) to skip webhook
   * secret verification. A missing WEBHOOK_SECRET alone NEVER bypasses
   * verification — absence of config fails closed.
   */
  webhookAllowUnverified: boolean;
}

export const COGNITO_CONFIG_KEY = 'cognito';

export default registerAs<CognitoConfig>(COGNITO_CONFIG_KEY, () => ({
  userPoolId: process.env.COGNITO_USER_POOL_ID || '',
  clientId: process.env.COGNITO_CLIENT_ID || '',
  clientSecret: process.env.COGNITO_CLIENT_SECRET || undefined,
  region: process.env.AWS_REGION || 'us-east-1',
  webhookSecret: process.env.WEBHOOK_SECRET || undefined,
  webhookAllowUnverified: process.env.WEBHOOK_ALLOW_UNVERIFIED === 'true',
}));
