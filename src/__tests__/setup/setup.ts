import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import React from "react";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";

import { createMockDb, resetMockDb } from "@/__tests__/mocks/database";
import { server } from "@/__tests__/mocks/server";

export { resetMockDb } from "@/__tests__/mocks/database";

beforeEach(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  if (typeof window !== "undefined") {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }
});

/**
 * A global hook that runs automatically after each test case.
 */
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockDb();
});

beforeAll(() => {
  server.listen({ onUnhandledRequest: "warn" });
});

afterAll(() => {
  server.close();
});

/**
 * Mocks `next/server` to prevent errors when importing next-auth v5
 */
vi.mock("next/server", () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn(),
    redirect: vi.fn(),
    next: vi.fn(),
  },
}));

/**
 * Mocks the entire `next/navigation` module.
 */
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({})),
}));

/**
 * Mocks the Next.js `Image` component.
 */
vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) =>
    React.createElement("img", { ...props, alt: props.alt }),
}));

/**
 * Mocks `next-auth` core library.
 */
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    auth: vi.fn(),
    handlers: { GET: vi.fn(), POST: vi.fn() },
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
  NextAuth: vi.fn(() => ({
    auth: vi.fn(),
    handlers: { GET: vi.fn(), POST: vi.fn() },
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

/**
 * Mocks `next-auth/react` (client-side).
 */
vi.mock("next-auth/react", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next-auth/react")>();
  return {
    ...mod,
    useSession: vi.fn(() => ({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    })),
    signIn: vi.fn(),
    signOut: vi.fn(),
    SessionProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

/**
 * Mock Drizzle ORM to intercept operators
 */
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((col, val) => ({ operator: "eq", col, val })),
    and: vi.fn((...conditions) => ({ operator: "and", conditions })),
    desc: vi.fn((col) => ({ operator: "desc", col })),
    inArray: vi.fn((col, vals) => ({ operator: "inArray", col, vals })),
    isNull: vi.fn((col) => ({ operator: "isNull", col })),
    gte: vi.fn((col, val) => ({ operator: "gte", col, val })),
    lte: vi.fn((col, val) => ({ operator: "lte", col, val })),
  };
});

/**
 * Mock Database implementation using the modular database mock
 */
vi.mock("@/db", () => createMockDb());

// Environment Variables
process.env.DATABASE_URL = "postgresql://mock:mock@localhost:5432/mock_db";
// Authentication
process.env.AUTH_SECRET = "mock-auth-secret";
// Email service
process.env.RESEND_API_KEY = "mock-resend_api_key";
// Application URLs
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.NEXT_PUBLIC_FASTAPI_URL = "http://localhost:8000";
process.env.NEXT_PUBLIC_CONTACT_EMAIL = "contact@mortiscope.com";
// Google OAuth Provider
process.env.GOOGLE_CLIENT_ID = "mock-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "mock-google-client-secret";
// ORCID OAuth Provider
process.env.ORCID_CLIENT_ID = "mock-orcid-client-id";
process.env.ORCID_CLIENT_SECRET = "mock-orcid-client-secret";
// Microsoft Entra ID OAuth Provider
process.env.AUTH_MICROSOFT_ENTRA_ID_ID = "mock-entra-id";
process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET = "mock-entra-secret";
process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID = "mock-entra-tenant-id";
// Redis (Upstash)
process.env.UPSTASH_REDIS_REST_URL = "https://mock-redis.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "mock-redis-token";
// AWS S3
process.env.AWS_BUCKET_NAME = "mortiscope-bucket";
process.env.AWS_BUCKET_REGION = "us-east-1";
process.env.AWS_ACCESS_KEY_ID = "mock-access-key-id";
process.env.AWS_SECRET_ACCESS_KEY = "mock-secret-access-key";
// Inngest
process.env.INNGEST_EVENT_KEY = "mock-inngest-event-key";
process.env.INNGEST_SIGNING_KEY = "mock-inngest-signing-key";
// FastAPI
process.env.FASTAPI_SECRET_KEY = "mock-fastapi-secret-key";
// MaxMind GeoIP
process.env.MAXMIND_LICENSE_KEY = "mock-maxmind-license-key";
// Cron Jobs
process.env.CRON_SECRET = "mock-cron-secret";
// Encryption
process.env.ENCRYPTION_KEY = "a1b2c3d4e5f600112233445566778899aabbccddeeff00112233445566778899";
