import * as Sentry from '@sentry/react-native';

/**
 * Crash/error reporting.
 *
 * Disabled by default: nothing is initialized and no network call is made unless
 * EXPO_PUBLIC_SENTRY_DSN is set. That keeps the private beta silent until you
 * deliberately turn reporting on.
 *
 * PRIVACY — this app records speech. Conversation transcripts, the user's speech,
 * and auth tokens must never leave the device. The scrubbers below strip
 * credentials from breadcrumbs and drop request bodies; transcripts are never
 * attached to events in the first place (see captureError: only an error object
 * and a short static tag are sent).
 */

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

/** Header names whose values must never be transmitted. */
const SENSITIVE_HEADERS = ['authorization', 'x-app-token', 'xi-api-key', 'cookie'];

const REDACTED = '[redacted]';

/** Remove credential headers and payload bodies from a breadcrumb. */
export function scrubBreadcrumb<T extends { data?: Record<string, unknown> }>(
  breadcrumb: T,
): T {
  const data = breadcrumb.data;
  if (!data) return breadcrumb;

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_HEADERS.includes(lower)) {
      cleaned[key] = REDACTED;
      continue;
    }
    // HTTP bodies can carry transcript text — never send them.
    if (lower === 'body' || lower === 'request_body' || lower === 'response_body') {
      cleaned[key] = REDACTED;
      continue;
    }
    if (lower === 'headers' && value && typeof value === 'object') {
      const headers: Record<string, unknown> = {};
      for (const [h, v] of Object.entries(value as Record<string, unknown>)) {
        headers[h] = SENSITIVE_HEADERS.includes(h.toLowerCase()) ? REDACTED : v;
      }
      cleaned[key] = headers;
      continue;
    }
    cleaned[key] = value;
  }

  return { ...breadcrumb, data: cleaned };
}

/** Strip a bearer token that leaked into a free-text string (e.g. an error message). */
export function scrubTokens(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, `Bearer ${REDACTED}`)
    .replace(/\b[a-f0-9]{64}\b/gi, REDACTED); // 32-byte hex session tokens
}

export function isMonitoringEnabled(): boolean {
  return DSN.length > 0;
}

/** Initialize reporting. No-op when no DSN is configured. */
export function initMonitoring(): void {
  if (!isMonitoringEnabled()) return;

  Sentry.init({
    dsn: DSN,
    // Never attach IP addresses, device names, or other default PII.
    sendDefaultPii: false,
    // Keep the beta cheap and quiet; raise later if you need tracing.
    tracesSampleRate: 0,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENV ?? 'beta',
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
    beforeSend: (event) => {
      if (event.request?.headers) {
        for (const key of Object.keys(event.request.headers)) {
          if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
            event.request.headers[key] = REDACTED;
          }
        }
      }
      // Request bodies and query strings may contain spoken text.
      if (event.request) {
        delete event.request.data;
        delete event.request.query_string;
      }
      if (event.message) {
        event.message = scrubTokens(event.message);
      }
      for (const value of event.exception?.values ?? []) {
        if (value.value) value.value = scrubTokens(value.value);
      }
      return event;
    },
  });
}

/**
 * Report a handled error. No-op when reporting is disabled.
 * Pass only a short, static `context` label — never transcript text.
 */
export function captureError(error: unknown, context?: string): void {
  if (!isMonitoringEnabled()) return;
  Sentry.captureException(error, context ? { tags: { context } } : undefined);
}
