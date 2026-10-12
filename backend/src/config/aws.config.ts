import { registerAs } from '@nestjs/config';

export interface AwsConfig {
  region: string;
  cognito: {
    userPoolId: string;
    clientId: string;
  };
  bedrock: {
    modelId: string;
  };
}

export const AWS_CONFIG_KEY = 'aws';

export default registerAs<AwsConfig>(AWS_CONFIG_KEY, () => ({
  region: process.env.AWS_REGION || 'us-east-1',
  cognito: {
    userPoolId: process.env.COGNITO_USER_POOL_ID || '',
    clientId: process.env.COGNITO_CLIENT_ID || '',
  },
  bedrock: {
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
  },
}));
