
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://80960418a6688f9ea2c72f5526676172@o4510634468376576.ingest.us.sentry.io/4510634469163008",

  // Define how likely traces are sampled.
  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  sendDefaultPii: true,
});
