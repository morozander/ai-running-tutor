import { Module } from '@nestjs/common';
import { CognitoWebhookController } from './cognito-webhook.controller';
import { CognitoWebhookService } from './cognito-webhook.service';

/**
 * Cognito Webhook Module
 *
 * Handles incoming webhooks from Cognito Lambda triggers.
 * - POST /webhooks/cognito/user-confirmed - Creates user after signup
 */
@Module({
  controllers: [CognitoWebhookController],
  providers: [CognitoWebhookService],
})
export class CognitoWebhookModule {}
