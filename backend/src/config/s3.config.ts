import { registerAs } from '@nestjs/config';

export interface S3Config {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  maxFileSizeMb: number;
  allowedMimeTypes: string[];
}

export const S3_CONFIG_KEY = 's3';

export default registerAs<S3Config>(S3_CONFIG_KEY, () => ({
  region: process.env.AWS_REGION || 'us-east-1',
  bucket: process.env.S3_BUCKET || '',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  maxFileSizeMb: Number(process.env.S3_MAX_FILE_SIZE_MB) || 10,
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'],
}));
