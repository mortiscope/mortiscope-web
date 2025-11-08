import { testUserPool } from "@e2e/fixtures/test-users";
import type { AuthFixtures, TestUser } from "@e2e/fixtures/types";
import { test as base } from "@playwright/test";

type WorkerFixtures = {
  workerUser: TestUser;
};

/**
 * Extension of the base Playwright test object to include custom authentication and worker fixtures.
 */
export const test = base.extend<AuthFixtures, WorkerFixtures>({
  // Defines a worker-scoped fixture to assign a unique test user from the pool based on the parallel worker index.
  workerUser: [
    async ({}, use, workerInfo) => {
      // Validate that the current worker index does not exceed the number of available test users.
      if (workerInfo.parallelIndex >= testUserPool.length) {
        throw new Error(
          `Worker index ${workerInfo.parallelIndex} exceeds available E2E user pool size (${testUserPool.length}).`
        );
      }

      // Retrieve the specific user credentials corresponding to the worker index.
      const user = testUserPool[workerInfo.parallelIndex];
      // Ensure the retrieved `user` object contains both a valid email and password.
      if (!user?.email || !user?.password) {
        throw new Error(`E2E user ${workerInfo.parallelIndex + 1} not configured`);
      }
      // Provide the `user` object to the test worker.
      await use(user);
    },
    // Set the scope to worker to ensure user assignment persists across tests within the same worker.
    { scope: "worker" },
  ],

  // Provides a page instance pre-authenticated using a saved storage state.
  authenticatedPage: async ({ browser }, use) => {
    // Create a new browser context using the authentication state stored in `e2e/.auth/credential-user.json`.
    const context = await browser.newContext({
      storageState: "e2e/.auth/credential-user.json",
    });
    // Open a new page within the authenticated context.
    const page = await context.newPage();
    // Provide the authenticated `page` to the test case.
    await use(page);
    // Ensure the page and context are closed after the test completes.
    await page.close();
    await context.close();
  },

  // Provides a browser context pre-authenticated using a saved storage state for multi-page scenarios.
  authenticatedContext: async ({ browser }, use) => {
    // Initialize the browser context with credentials from `e2e/.auth/credential-user.json`.
    const context = await browser.newContext({
      storageState: "e2e/.auth/credential-user.json",
    });
    // Provide the `authenticatedContext` to the test case.
    await use(context);
    // Ensure the context is closed after the test completes.
    await context.close();
  },

  // Provides a standard, unauthenticated page instance.
  unauthenticatedPage: async ({ page }, use) => {
    // Pass the default `page` fixture through as the `unauthenticatedPage`.
    await use(page);
  },
});

export { expect } from "@playwright/test";
