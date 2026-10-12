import { registerAs } from '@nestjs/config';

export interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export const SENDGRID_CONFIG_KEY = 'sendgrid';

export default registerAs<SendGridConfig>(SENDGRID_CONFIG_KEY, () => ({
  apiKey: process.env.SENDGRID_API_KEY || '',
  fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@yourdomain.com',
  fromName: process.env.SENDGRID_FROM_NAME || 'Your App Name',
}));
