import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * Build CORS options from the CORS_ORIGIN env value (comma-separated origin
 * allowlist, e.g. "https://app.example.com,https://admin.example.com").
 *
 * Credentials are only enabled together with an EXPLICIT origin allowlist:
 * browsers reject `Access-Control-Allow-Origin: *` combined with
 * `credentials: true`, and reflecting arbitrary origins with credentials
 * would be a fail-open default.
 */
export function buildCorsOptions(corsOrigin: string | undefined): CorsOptions {
  const explicitOrigins = (corsOrigin ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0 && origin !== '*');

  if (explicitOrigins.length === 0) {
    // No explicit origins configured (local/dev default): allow cross-origin
    // requests WITHOUT credentials. Cookie/credentialed browser clients
    // require CORS_ORIGIN to be set.
    return { origin: '*', credentials: false };
  }

  return { origin: explicitOrigins, credentials: true };
}
