/**
 * Base interface for all SQS messages
 */
export interface SqsMessage<T = unknown> {
  messageId: string;
  body: T;
  receiptHandle?: string;
  attributes?: Record<string, string>;
}

/**
 * User-related events
 */
export interface UserCreatedEvent {
  eventType: 'user.created';
  userId: string;
  email: string;
  createdAt: string;
}

export interface UserVerifiedEvent {
  eventType: 'user.verified';
  userId: string;
  email: string;
  verifiedAt: string;
}

export type UserEvent = UserCreatedEvent | UserVerifiedEvent;

/**
 * Email notification event
 */
export interface EmailNotificationEvent {
  eventType: 'notification.email';
  to: string;
  subject: string;
  body: string;
  template?: string;
  data?: Record<string, unknown>;
}

/**
 * Order processing event
 */
export interface OrderProcessingEvent {
  eventType: 'order.processing';
  orderId: string;
  userId: string;
  total: number;
  timestamp: string;
}

/**
 * Generic event type
 */
export interface GenericEvent<T = unknown> {
  eventType: string;
  timestamp: string;
  data: T;
  metadata?: {
    source: string;
    correlationId?: string;
    causationId?: string;
  };
}

/**
 * SQS Batch Entry
 */
export interface SqsBatchEntry<T> {
  id: string;
  body: T;
  delaySeconds?: number;
}

/**
 * SQS Batch Result
 */
export interface SqsBatchResult {
  successful: { id: string; messageId: string }[];
  failed: { id: string; code: string; message: string; senderFault: boolean }[];
}
