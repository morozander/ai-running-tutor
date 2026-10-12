import { registerAs } from '@nestjs/config';

export interface SqsConfig {
  region: string;
  queueUrl: string;
  queueName: string;
  dlqQueueUrl: string;
  dlqQueueName: string;
  maxMessages: number;
  visibilityTimeout: number;
  waitTimeSeconds: number;
  maxReceiveCount: number;
  messageRetentionPeriod: number;
}

export const SQS_CONFIG_KEY = 'sqs';

export default registerAs<SqsConfig>(SQS_CONFIG_KEY, () => {
  const region = process.env.AWS_REGION || 'eu-central-1';
  const queueName = process.env.SQS_QUEUE_NAME || 'my-queue';
  const dlqQueueName = process.env.SQS_DLQ_NAME || 'my-queue-dlq';

  return {
    region,
    queueUrl: process.env.SQS_QUEUE_URL || `https://sqs.${region}.amazonaws.com/${queueName}`,
    queueName,
    dlqQueueUrl: process.env.SQS_DLQ_URL || `https://sqs.${region}.amazonaws.com/${dlqQueueName}`,
    dlqQueueName,
    maxMessages: parseInt(process.env.SQS_MAX_MESSAGES || '10', 10),
    visibilityTimeout: parseInt(process.env.SQS_VISIBILITY_TIMEOUT || '30', 10),
    waitTimeSeconds: parseInt(process.env.SQS_WAIT_TIME_SECONDS || '20', 10),
    maxReceiveCount: parseInt(process.env.SQS_MAX_RECEIVE_COUNT || '3', 10),
    messageRetentionPeriod: parseInt(process.env.SQS_MESSAGE_RETENTION_PERIOD || '1209600', 10), // 14 days
  };
});
