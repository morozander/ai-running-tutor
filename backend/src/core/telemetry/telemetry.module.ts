import type { TelemetryConfig } from '@config/telemetry.config';
import { TELEMETRY_CONFIG_KEY } from '@config/telemetry.config';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenTelemetryModule } from 'nestjs-otel';

/**
 * Telemetry Module
 *
 * Provides OpenTelemetry integration for tracing and metrics.
 * Works in Lambda, ECS, and local development.
 *
 * Features:
 * - @Span() decorator for custom spans
 * - @Traceable() decorator for entire classes
 * - TraceService for programmatic span access
 * - MetricService for custom metrics
 *
 * @example Using @Span decorator
 * ```typescript
 * import { Span } from 'nestjs-otel';
 *
 * @Injectable()
 * export class MyService {
 *   @Span('custom-operation')
 *   async doSomething() {
 *     // This method will be traced
 *   }
 * }
 * ```
 *
 * @example Using TraceService
 * ```typescript
 * import { TraceService } from 'nestjs-otel';
 *
 * @Injectable()
 * export class MyService {
 *   constructor(private readonly traceService: TraceService) {}
 *
 *   async doSomething() {
 *     const span = this.traceService.startSpan('sub-operation');
 *     span.setAttribute('userId', userId);
 *     // ... do work
 *     span.end();
 *   }
 * }
 * ```
 */
@Module({
  imports: [
    OpenTelemetryModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const config = configService.get<TelemetryConfig>(TELEMETRY_CONFIG_KEY);

        return {
          metrics: {
            hostMetrics: config?.enableHostMetrics ?? false,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class TelemetryModule {}
