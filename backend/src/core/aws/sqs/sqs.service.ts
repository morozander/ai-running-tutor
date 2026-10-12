import { SendMessageBatchCommand, SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SqsConfig } from '../../../config/sqs.config';
import type { SqsBatchEntry, SqsBatchResult } from './sqs.types';

/**
 * SQS Service - Producer Only
 *
 * Use this service to send messages to SQS queues from your NestJS application.
 */
@Injectable()
export class SqsService implements OnModuleInit {
  private readonly logger = new Logger(SqsService.name);
  private sqsClient: SQSClient;
  private config: SqsConfig;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const config = this.configService.get<SqsConfig>('sqs');

    if (!config) {
      throw new Error('SQS configuration is missing. Please check your .env file.');
    }

    this.config = config;

    this.sqsClient = new SQSClient({
      region: this.config.region,
      maxAttempts: 3,
      retryMode: 'standard',
    });

    this.logger.log('SQS Producer Service initialized', {
      queue: this.config.queueName,
      region: this.config.region,
    });
  }

  /**
   * Send a single message to SQS
   *
   * @param messageBody - The message payload (will be JSON stringified)
   * @returns Message ID from SQS
   */
  async sendMessage<T>(messageBody: T): Promise<string> {
    const command = new SendMessageCommand({
      QueueUrl: this.config.queueUrl,
      MessageBody: JSON.stringify(messageBody),
    });

    try {
      const response = await this.sqsClient.send(command);
      this.logger.debug(`Message sent: ${response.MessageId}`);
      return response.MessageId || '';
    } catch (error) {
      this.logger.error('Failed to send message', error as Error);
      throw error;
    }
  }

  /**
   * Send messages in batch (up to 10)
   *
   * @param entries - Array of message entries
   * @returns Batch result with successful and failed messages
   */
  async sendMessageBatch<T>(entries: SqsBatchEntry<T>[]): Promise<SqsBatchResult> {
    if (entries.length > 10) {
      throw new Error('Batch size cannot exceed 10 messages');
    }

    const command = new SendMessageBatchCommand({
      QueueUrl: this.config.queueUrl,
      Entries: entries.map((entry) => ({
        Id: entry.id,
        MessageBody: JSON.stringify(entry.body),
        DelaySeconds: entry.delaySeconds,
      })),
    });

    try {
      const response = await this.sqsClient.send(command);

      const successful = (response.Successful || []).map((msg) => ({
        id: msg.Id || '',
        messageId: msg.MessageId || '',
      }));

      const failed = (response.Failed || []).map((msg) => ({
        id: msg.Id || '',
        code: msg.Code || '',
        message: msg.Message || '',
        senderFault: msg.SenderFault ?? false,
      }));

      this.logger.log(`Batch sent: ${successful.length} successful, ${failed.length} failed`);

      return { successful, failed };
    } catch (error) {
      this.logger.error('Failed to send batch', error as Error);
      throw error;
    }
  }
}
