import { Injectable, Logger } from '@nestjs/common';
import type { EmailNotificationEvent, SqsMessage } from '../../core/aws/sqs/sqs.types';

/**
 * Email Notification Service - SQS Consumer
 *
 * This service processes email notification messages from SQS queue.
 * Used by Lambda worker function.
 */
@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);

  /**
   * Process a single email notification message
   */
  async sendEmail(message: SqsMessage<EmailNotificationEvent>): Promise<void> {
    this.logger.log(`Sending email to: ${message.body.to}`);

    try {
      // Your business logic here:
      // - Send email via SendGrid/SES
      // - Track email metrics
      // - Handle bounces/unsubscribes

      this.logger.log(`Email sent successfully: ${message.body.to}`, {
        subject: message.body.subject,
      });
    } catch (error) {
      this.logger.error('Failed to send email', error as Error);
      throw error; // Re-throw to trigger SQS retry
    }
  }
}
