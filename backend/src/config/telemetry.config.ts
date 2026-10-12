import 'dotenv/config';
import { registerAs } from '@nestjs/config';

export interface TelemetryConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  environment: string;
  otlpEndpoint?: string;
  otlpTracesEndpoint?: string;
  otlpMetricsEndpoint?: string;
  sampleRate: number;
  enableHostMetrics: boolean;
}

export const TELEMETRY_CONFIG_KEY = 'telemetry';

export default registerAs<TelemetryConfig>(TELEMETRY_CONFIG_KEY, () => ({
  enabled: process.env.OTEL_ENABLED === 'true',
  serviceName: process.env.OTEL_SERVICE_NAME || 'nestjs-app',
  serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  otlpTracesEndpoint: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  otlpMetricsEndpoint: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
  sampleRate: parseFloat(process.env.OTEL_SAMPLE_RATE || '1.0'),
  enableHostMetrics: process.env.OTEL_HOST_METRICS === 'true',
}));
