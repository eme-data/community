import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentry(): boolean {
  if (initialized) return true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.RELEASE,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    integrations: [],
  });
  initialized = true;
  return true;
}

export function captureException(err: unknown) {
  if (!initialized) return;
  Sentry.captureException(err);
}
