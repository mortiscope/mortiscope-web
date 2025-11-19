import { chromium, FullConfig } from "@playwright/test";

/**
 * Performs global setup operations before the test suite begins, specifically handling pre-authentication.
 */
async function globalSetup(config: FullConfig) {
  // Verify that the required environment variables for the non-2FA credential user are present.
  if (!process.env.E2E_USER_EMAIL_6 || !process.env.E2E_USER_PASSWORD_6) {
    // Log a notification and exit the setup if credentials are missing.
    console.log("[setup] Skipping auth setup - E2E credentials not configured");
    return;
  }

  // Extract the base URL from the first project configuration to define the target environment.
  const { baseURL } = config.projects[0].use;
  // Launch a Chromium browser instance to perform the authentication flow.
  const browser = await chromium.launch();

  // Create an isolated browser context for the credential-based login.
  const credentialContext = await browser.newContext();
  // Open a new page within the context.
  const credentialPage = await credentialContext.newPage();

  try {
    // Navigate the browser to the sign-in endpoint using the configured base URL.
    await credentialPage.goto(`${baseURL}/signin`);

    // Populate the email and password input fields using the values from environment variables.
    await credentialPage.fill('[name="email"]', process.env.E2E_USER_EMAIL_6);
    await credentialPage.fill('[name="password"]', process.env.E2E_USER_PASSWORD_6);

    // Execute the form submission by clicking the submit button.
    await credentialPage.click('[type="submit"]');

    // Wait for the application to navigate to either the dashboard or the two-factor authentication prompt.
    await Promise.race([
      credentialPage.waitForURL("**/dashboard", { timeout: 30000 }),
      credentialPage.waitForURL("**/signin/two-factor", { timeout: 30000 }),
    ]);

    // Retrieve the current URL to determine if the authentication flow requires additional manual steps.
    const currentUrl = credentialPage.url();

    if (currentUrl.includes("/signin/two-factor")) {
      // Log that the user has 2FA enabled, which prevents automated session capture in this setup.
      console.log(
        "[setup] Credential user has 2FA enabled, and cannot complete auto-authentication"
      );
      console.log("[setup] Tests requiring authenticated state will use unauthenticated context");
    } else {
      // Persist the cookies and local storage state to a JSON file for reuse in subsequent tests.
      await credentialContext.storageState({
        path: "e2e/.auth/credential-user.json",
      });
      console.log("[setup] Credential user authentication state saved");
    }
  } catch (error) {
    // Catch and report any errors that occur during the authentication process.
    console.error("[setup] Failed to authenticate credential user:", error);
  } finally {
    // Ensure the browser context is closed regardless of the authentication outcome.
    await credentialContext.close();
  }

  // Close the browser instance to free up system resources.
  await browser.close();
}

export default globalSetup;
