import { credentialUser } from "@e2e/fixtures/test-users";
import { SignInPage } from "@e2e/pages/auth/signin.page";
import { test as setup } from "@playwright/test";

/**
 * Global authentication state containing the persisted session for a credential-based user.
 */
const authFile = "e2e/.auth/credential-user.json";

/**
 * Setup routine to authenticate a user and persist the storage state for subsequent tests.
 */
setup("authenticate", async ({ page }) => {
  // Initialize the Sign In page object model with the current browser page.
  const signInPage = new SignInPage(page);
  // Navigate the browser to the authentication entry point.
  await signInPage.goto();
  // Execute the login flow using the email and password defined in the `credentialUser` fixture.
  await signInPage.signInWithCredentials(credentialUser.email, credentialUser.password);
  // Wait for the browser to redirect to the `/dashboard` URL to confirm successful authentication.
  await page.waitForURL("/dashboard");

  // Save the authentication cookies and local storage state to the specified `authFile` path.
  await page.context().storageState({ path: authFile });
});
