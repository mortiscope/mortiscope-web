// Re-exports the customized Playwright `test` and `expect` objects to provide access to authentication fixtures.
export { expect, test } from "@e2e/fixtures/auth.fixture";

// Re-exports the primary `credentialUser` object for use in test cases requiring specific user data.
export { credentialUser } from "@e2e/fixtures/test-users";

// Re-exports type definitions to ensure consistent type safety for the test suite.
export type { AuthFixtures, TestUser } from "@e2e/fixtures/types";
