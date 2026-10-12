/**
 * Base class for domain-specific exceptions
 *
 * All domain exceptions should extend this class to ensure
 * consistent error handling and GraphQL error mapping.
 */
export abstract class DomainException extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Entity not found exception
 */
export class EntityNotFoundException extends DomainException {
  readonly code = 'ENTITY_NOT_FOUND';
  readonly statusCode = 404;

  constructor(entityName: string, identifier: string) {
    super(`${entityName} with identifier '${identifier}' not found`);
  }
}

/**
 * Entity already exists exception
 */
export class EntityAlreadyExistsException extends DomainException {
  readonly code = 'ENTITY_ALREADY_EXISTS';
  readonly statusCode = 409;

  constructor(entityName: string, identifier: string) {
    super(`${entityName} with identifier '${identifier}' already exists`);
  }
}

/**
 * Validation exception for domain rules
 */
export class DomainValidationException extends DomainException {
  readonly code = 'DOMAIN_VALIDATION_ERROR';
  readonly statusCode = 400;
}

/**
 * Unauthorized operation exception
 */
export class UnauthorizedOperationException extends DomainException {
  readonly code = 'UNAUTHORIZED_OPERATION';
  readonly statusCode = 403;

  constructor(operation: string) {
    super(`Unauthorized to perform operation: ${operation}`);
  }
}

/**
 * Business rule violation exception
 */
export class BusinessRuleViolationException extends DomainException {
  readonly code = 'BUSINESS_RULE_VIOLATION';
  readonly statusCode = 422;

  constructor(rule: string, details?: string) {
    super(details ? `${rule}: ${details}` : rule);
  }
}
