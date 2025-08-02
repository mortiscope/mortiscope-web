import pino from "pino";

// Environment-based log level configuration
const getLogLevel = (): pino.Level => {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  const validLevels: pino.Level[] = ["fatal", "error", "warn", "info", "debug", "trace"];

  if (level && validLevels.includes(level as pino.Level)) {
    return level as pino.Level;
  }

  // Default levels based on environment
  switch (process.env.NODE_ENV) {
    case "production":
      return "info";
    case "test":
      return "warn";
    default:
      return "debug";
  }
};

// Base logger configuration
const createLogger = () => {
  const isDevelopment = process.env.NODE_ENV === "development";

  return pino({
    level: getLogLevel(),

    // Base configuration for all environments
    base: {
      env: process.env.NODE_ENV,
      version: process.env.npm_package_version || "unknown",
    },

    // Timestamp configuration
    timestamp: pino.stdTimeFunctions.isoTime,

    // Serializers for common objects
    serializers: {
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },

    // Redact sensitive information
    redact: {
      paths: [
        "password",
        "token",
        "accessToken",
        "refreshToken",
        "authorization",
        "cookie",
        "*.password",
        "*.token",
        "*.accessToken",
        "*.refreshToken",
        "*.authorization",
        "*.cookie",
      ],
      censor: "[REDACTED]",
    },
  });
};

// Main logger instance
export const logger = createLogger();

// Specialized loggers for different domains
export const authLogger = logger.child({ domain: "auth" });
export const dbLogger = logger.child({ domain: "database" });
export const s3Logger = logger.child({ domain: "s3" });
export const inngestLogger = logger.child({ domain: "inngest" });
export const uploadLogger = logger.child({ domain: "upload" });
export const caseLogger = logger.child({ domain: "case" });
export const analysisLogger = logger.child({ domain: "analysis" });
export const exportLogger = logger.child({ domain: "export" });
export const emailLogger = logger.child({ domain: "email" });

// Utility function to create contextual loggers
export const createContextLogger = (
  context: string,
  additionalFields?: Record<string, unknown>
) => {
  return logger.child({ context, ...additionalFields });
};

// Helper functions for common logging patterns
export const logError = (
  logger: pino.Logger,
  message: string,
  error: unknown,
  context?: Record<string, unknown>
) => {
  logger.error({ err: error, ...context }, message);
};

export const logCritical = (
  logger: pino.Logger,
  message: string,
  error?: unknown,
  context?: Record<string, unknown>
) => {
  logger.fatal({ err: error, ...context }, `CRITICAL: ${message}`);
};

export const logUserAction = (
  logger: pino.Logger,
  action: string,
  userId: string,
  context?: Record<string, unknown>
) => {
  logger.info({ userId, action, ...context }, `User action: ${action}`);
};

export const logDatabaseOperation = (
  operation: string,
  table: string,
  context?: Record<string, unknown>
) => {
  dbLogger.debug({ operation, table, ...context }, `Database operation: ${operation} on ${table}`);
};

export const logS3Operation = (
  operation: string,
  key: string,
  context?: Record<string, unknown>
) => {
  s3Logger.debug({ operation, key, ...context }, `S3 operation: ${operation} for key ${key}`);
};

// Export default logger for general use
export default logger;
