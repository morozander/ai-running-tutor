import cognitoConfig from '@config/cognito.config';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { CognitoWebhookService } from './cognito-webhook.service';
import { UserConfirmedDto } from './dto/user-confirmed.dto';

/**
 * Controller for Cognito webhook endpoints
 *
 * These endpoints are called by Cognito Lambda triggers,
 * not by end users. Authentication is via shared secret.
 */
@Controller('webhooks/cognito')
export class CognitoWebhookController {
  constructor(
    private readonly cognitoWebhookService: CognitoWebhookService,
    @Inject(cognitoConfig.KEY)
    private readonly cognitoConf: ConfigType<typeof cognitoConfig>,
  ) {}

  /**
   * Handle PostConfirmation trigger - creates user in database
   *
   * Called by: cognito-triggers/post-confirmation.mjs
   */
  @Post('user-confirmed')
  @HttpCode(HttpStatus.OK)
  async handleUserConfirmed(
    @Headers('x-webhook-secret') webhookSecret: string,
    @Body() dto: UserConfirmedDto,
  ): Promise<{ success: boolean; created: boolean }> {
    this.verifyWebhookSecret(webhookSecret);

    const result = await this.cognitoWebhookService.handleUserConfirmed(dto);

    return { success: true, ...result };
  }

  /**
   * Verify the webhook secret matches the configured value.
   *
   * Fails CLOSED: a missing WEBHOOK_SECRET rejects every request. The only
   * bypass is the EXPLICIT local-dev opt-in WEBHOOK_ALLOW_UNVERIFIED=true,
   * which is ignored in production — absence of config is never a bypass.
   */
  private verifyWebhookSecret(providedSecret: string): void {
    if (this.cognitoConf.webhookAllowUnverified && process.env.NODE_ENV !== 'production') {
      return;
    }

    const expectedSecret = this.cognitoConf.webhookSecret;

    if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
  }
}
