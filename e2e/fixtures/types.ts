import type { BrowserContext, Page } from "@playwright/test";

/**
 * Defines the structure for a test user identity used throughout the end-to-end testing suite.
 */
export type TestUser = {
  // The unique email address associated with the test user account.
  email: string;
  // The plaintext password used for authenticating the test user.
  password: string;
};

/**
 * Defines the available authentication-related fixtures for use in Playwright test blocks.
 */
export type AuthFixtures = {
  // A Playwright page instance that is pre-populated with authentication state.
  authenticatedPage: Page;
  // A browser context that includes stored credentials for multi-page authentication scenarios.
  authenticatedContext: BrowserContext;
  // A standard Playwright page instance without any pre-existing authentication state.
  unauthenticatedPage: Page;
};
