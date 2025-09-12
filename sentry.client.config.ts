import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://80960418a6688f9ea2c72f5526676172@o4510634468376576.ingest.us.sentry.io/4510634469163008",

  tracesSampleRate: 0.1,

  debug: false,

  replaysOnErrorSampleRate: 0.1,
  replaysSessionSampleRate: 0.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  ignoreErrors: ["ResizeObserver loop limit exceeded", "ChunkLoadError", "Loading chunk"],
});
