import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");

    process.on("uncaughtException", (err: NodeJS.ErrnoException) => {
      if (err.code === "ECONNRESET") return;
      throw err;
    });

    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      const isAbortedError = args.some((arg) => {
        if (typeof arg === "string" && arg.includes("Error: aborted")) return true;
        if (
          arg instanceof Error &&
          (arg.message === "aborted" || (arg as NodeJS.ErrnoException).code === "ECONNRESET")
        )
          return true;
        return false;
      });

      if (isAbortedError) return;
      originalConsoleError.apply(console, args);
    };

    process.removeAllListeners("warning");
    process.on("warning", (warning: Error) => {
      if ((warning as NodeJS.ErrnoException).code === "DEP0060") return;
      process.stderr.write(
        warning.stack ? `${warning.stack}\n` : `${warning.name}: ${warning.message}\n`
      );
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
