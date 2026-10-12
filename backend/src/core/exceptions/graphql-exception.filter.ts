import { type ArgumentsHost, Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { GqlArgumentsHost, type GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { DomainException } from './domain.exceptions';

/**
 * Global exception filter for GraphQL
 *
 * Maps domain exceptions and HTTP exceptions to GraphQL errors
 * with consistent error codes and messages.
 */
@Catch()
export class GraphQLExceptionFilter implements GqlExceptionFilter {
  private readonly logger = new Logger('GraphQLExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): GraphQLError {
    const gqlHost = GqlArgumentsHost.create(host);
    const info = gqlHost.getInfo();

    const fieldName = info?.fieldName || 'unknown';

    // Handle Domain Exceptions
    if (exception instanceof DomainException) {
      this.logger.warn(
        `Domain exception in ${fieldName}: ${exception.message} [${exception.code}]`,
      );

      return new GraphQLError(exception.message, {
        extensions: {
          code: exception.code,
          statusCode: exception.statusCode,
        },
      });
    }

    // Handle HTTP Exceptions
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string' ? response : (response as { message: string }).message;

      this.logger.warn(`HTTP exception in ${fieldName}: ${message} [${status}]`);

      return new GraphQLError(message, {
        extensions: {
          code: this.httpStatusToCode(status),
          statusCode: status,
        },
      });
    }

    // Handle unknown errors
    const errorMessage =
      exception instanceof Error ? exception.message : 'An unexpected error occurred';
    const stack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(`Unhandled exception in ${fieldName}: ${errorMessage}`, stack);

    // Don't expose internal errors in production
    const isProduction = process.env.NODE_ENV === 'production';
    return new GraphQLError(isProduction ? 'Internal server error' : errorMessage, {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      },
    });
  }

  private httpStatusToCode(status: number): string {
    const statusCodes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
      [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
    };

    return statusCodes[status] || 'UNKNOWN_ERROR';
  }
}
