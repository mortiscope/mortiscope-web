import { z } from "zod";

/**
 * Environment variable validation schema using Zod
 * This ensures type safety and runtime validation for all environment variables
 */
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Database
  DATABASE_URL: z.string().pipe(z.url()),

  // Authentication
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().pipe(z.url()).optional(),

  // Email service
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  CONTACT_EMAIL: z.string().pipe(z.email()),

  // Application URLs
  NEXT_PUBLIC_APP_URL: z.string().pipe(z.url()),
  NEXT_PUBLIC_FASTAPI_URL: z.string().pipe(z.url()),

  // Google OAuth Provider
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),

  // ORCID OAuth Provider
  ORCID_CLIENT_ID: z.string().min(1, "ORCID_CLIENT_ID is required"),
  ORCID_CLIENT_SECRET: z.string().min(1, "ORCID_CLIENT_SECRET is required"),

  // Microsoft Entra ID OAuth Provider
  AUTH_MICROSOFT_ENTRA_ID_ID: z.string().min(1, "AUTH_MICROSOFT_ENTRA_ID_ID is required"),
  AUTH_MICROSOFT_ENTRA_ID_SECRET: z.string().min(1, "AUTH_MICROSOFT_ENTRA_ID_SECRET is required"),
  AUTH_MICROSOFT_ENTRA_ID_TENANT_ID: z
    .string()
    .min(1, "AUTH_MICROSOFT_ENTRA_ID_TENANT_ID is required"),

  // Redis (Upstash)
  UPSTASH_REDIS_REST_URL: z.string().pipe(z.url()),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "UPSTASH_REDIS_REST_TOKEN is required"),

  // AWS S3
  AWS_BUCKET_NAME: z.string().min(1, "AWS_BUCKET_NAME is required"),
  AWS_BUCKET_REGION: z.string().min(1, "AWS_BUCKET_REGION is required"),
  AWS_ACCESS_KEY_ID: z.string().min(1, "AWS_ACCESS_KEY_ID is required"),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS_SECRET_ACCESS_KEY is required"),

  // Inngest
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  // FastAPI
  FASTAPI_SECRET_KEY: z.string().min(1, "FASTAPI_SECRET_KEY is required"),
});

/**
 * Client-side environment variables schema
 * Only includes variables that are safe to expose to the browser
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().pipe(z.url()),
  NEXT_PUBLIC_FASTAPI_URL: z.string().pipe(z.url()),
});

/**
 * Validate and parse environment variables
 * This will throw an error if any required variables are missing or invalid
 */
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((err) => `${err.path.join(".")}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${errorMessages.join("\n")}`);
    }
    throw error;
  }
}

/**
 * Validate client-side environment variables
 */
function validateClientEnv() {
  try {
    return clientEnvSchema.parse({
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_FASTAPI_URL: process.env.NEXT_PUBLIC_FASTAPI_URL,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((err) => `${err.path.join(".")}: ${err.message}`);
      throw new Error(`Client environment validation failed:\n${errorMessages.join("\n")}`);
    }
    throw error;
  }
}

// Validate environment variables at module load time
export const env = validateEnv();
export const clientEnv = validateClientEnv();

// Type exports for better TypeScript integration
export type Env = z.infer<typeof envSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
