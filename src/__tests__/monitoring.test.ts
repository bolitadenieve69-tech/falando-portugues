import {
  scrubBreadcrumb,
  scrubTokens,
  isMonitoringEnabled,
  initMonitoring,
  captureError,
} from '../services/monitoring';

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));

import * as Sentry from '@sentry/react-native';

describe('monitoring — disabled without a DSN', () => {
  // No EXPO_PUBLIC_SENTRY_DSN is set in the test env.
  it('reports itself as disabled', () => {
    expect(isMonitoringEnabled()).toBe(false);
  });

  it('initMonitoring does not initialize Sentry', () => {
    initMonitoring();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('captureError does not send anything', () => {
    captureError(new Error('boom'), 'session-start');
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

describe('scrubBreadcrumb', () => {
  it('redacts the Authorization header', () => {
    const out = scrubBreadcrumb({ data: { Authorization: 'Bearer abc123' } });
    expect(out.data!.Authorization).toBe('[redacted]');
  });

  it('redacts the app token header regardless of case', () => {
    const out = scrubBreadcrumb({ data: { 'X-App-Token': 'secret' } });
    expect(out.data!['X-App-Token']).toBe('[redacted]');
  });

  it('redacts nested headers objects', () => {
    const out = scrubBreadcrumb({
      data: { headers: { authorization: 'Bearer xyz', 'content-type': 'application/json' } },
    });
    const headers = out.data!.headers as Record<string, unknown>;
    expect(headers.authorization).toBe('[redacted]');
    expect(headers['content-type']).toBe('application/json');
  });

  it('drops request bodies, which can carry spoken text', () => {
    const out = scrubBreadcrumb({ data: { body: '{"text":"olá, chamo-me Ana"}' } });
    expect(out.data!.body).toBe('[redacted]');
  });

  it('keeps harmless fields such as url and status', () => {
    const out = scrubBreadcrumb({ data: { url: '/session', status_code: 500 } });
    expect(out.data!.url).toBe('/session');
    expect(out.data!.status_code).toBe(500);
  });

  it('passes through a breadcrumb with no data', () => {
    const crumb = { message: 'navigation' } as { data?: Record<string, unknown> };
    expect(scrubBreadcrumb(crumb)).toBe(crumb);
  });

  it('does not mutate the original breadcrumb', () => {
    const crumb = { data: { Authorization: 'Bearer abc' } };
    scrubBreadcrumb(crumb);
    expect(crumb.data.Authorization).toBe('Bearer abc');
  });
});

describe('scrubTokens', () => {
  it('redacts a bearer token inside an error message', () => {
    expect(scrubTokens('Failed with Bearer aB3.dEf-9_x')).toBe(
      'Failed with Bearer [redacted]',
    );
  });

  it('redacts a 64-char hex session token', () => {
    const token = 'a'.repeat(64);
    expect(scrubTokens(`token=${token}`)).toBe('token=[redacted]');
  });

  it('leaves ordinary messages untouched', () => {
    expect(scrubTokens('Network request failed')).toBe('Network request failed');
  });
});
