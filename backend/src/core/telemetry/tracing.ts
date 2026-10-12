/**
 * OpenTelemetry SDK initialization
 *
 * IMPORTANT: This file must be imported and started BEFORE NestJS bootstraps.
 * The SDK needs to instrument modules before they are loaded.
 *
 * Works in both Lambda and ECS environments - just configure OTEL_EXPORTER_OTLP_ENDPOINT.
 *
 * @example Lambda with AWS X-Ray:
 *   OTEL_ENABLED=true
 *   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
 *   (Use AWS Distro for OpenTelemetry Lambda layer)
 *
 * @example ECS with Jaeger/Tempo:
 *   OTEL_ENABLED=true
 *   OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
 */

import * as process from 'node:process';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const isEnabled = process.env.OTEL_ENABLED === 'true';

// Only create SDK if telemetry is enabled
let otelSDK: NodeSDK | null = null;

if (isEnabled) {
  const serviceName = process.env.OTEL_SERVICE_NAME || 'nestjs-app';
  const serviceVersion = process.env.OTEL_SERVICE_VERSION || '1.0.0';
  const environment = process.env.NODE_ENV || 'development';

  // Resource attributes identify this service
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    'deployment.environment': environment,
  });

  // Configure trace exporter (OTLP over HTTP)
  const traceExporter = new OTLPTraceExporter({
    url:
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
      (process.env.OTEL_EXPORTER_OTLP_ENDPOINT
        ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`
        : undefined),
  });

  // Configure metrics exporter (OTLP over HTTP)
  const metricExporter = new OTLPMetricExporter({
    url:
      process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
      (process.env.OTEL_EXPORTER_OTLP_ENDPOINT
        ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`
        : undefined),
  });

  otelSDK = new NodeSDK({
    resource,
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 30000, // Export metrics every 30s
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable noisy instrumentations
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
      }),
    ],
  });

  // Graceful shutdown
  const shutdown = async () => {
    try {
      await otelSDK?.shutdown();
      console.log('OpenTelemetry SDK shut down successfully');
    } catch (err) {
      console.error('Error shutting down OpenTelemetry SDK', err);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export { otelSDK };
