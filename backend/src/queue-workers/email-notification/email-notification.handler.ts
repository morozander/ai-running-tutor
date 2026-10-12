/**
 * Email Notification Worker - Lambda Handler
 *
 * This Lambda function processes email notification messages from SQS queue.
 *
 * Handler: src/queue-workers/email-notification/email-notification.handler.handler
 *
 * NOTE: partial-batch responses only work when the Lambda event source mapping
 * enables them — the SQS trigger MUST set
 * `function_response_types = ["ReportBatchItemFailures"]`, otherwise the
 * returned batchItemFailures is ignored by Lambda.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Context, SQSBatchItemFailure, SQSEvent, SQSHandler } from 'aws-lambda';
import type { EmailNotificationEvent } from '../../core/aws/sqs/sqs.types';
import { EmailNotificationModule } from './email-notification.module';
import { EmailNotificationService } from './email-notification.service';

const logger = new Logger('EmailNotificationHandler');

export const handler: SQSHandler = async (event: SQSEvent, context: Context) => {
  logger.log(`Processing ${event.Records.length} email messages`, {
    awsRequestId: context.awsRequestId,
  });

  let app: import('@nestjs/common').INestApplicationContext | undefined;

  try {
    app = await NestFactory.createApplicationContext(EmailNotificationModule);
    const sender = app.get(EmailNotificationService);

    const batchItemFailures: SQSBatchItemFailure[] = [];

    // Per-record isolation: one bad message must not fail the whole batch.
    // Only the failed messageIds are reported back — returning every
    // messageId on a single failure would re-deliver (and re-send) the
    // already-successful emails.
    await Promise.all(
      event.Records.map(async (record) => {
        try {
          const body = JSON.parse(record.body) as EmailNotificationEvent;

          logger.log(`Sending email: ${body.subject}`, {
            to: body.to,
          });

          await sender.sendEmail({
            messageId: record.messageId,
            body,
            receiptHandle: record.receiptHandle,
          });
        } catch (error) {
          logger.error(`Email sending failed for message ${record.messageId}`, error as Error);
          batchItemFailures.push({ itemIdentifier: record.messageId });
        }
      }),
    );

    if (batchItemFailures.length > 0) {
      logger.warn(
        `${batchItemFailures.length}/${event.Records.length} email messages failed and will be retried`,
      );
    } else {
      logger.log('All emails sent successfully');
    }

    return { batchItemFailures };
  } finally {
    if (app) {
      await app.close();
    }
  }
};
