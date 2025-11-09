import { expect, Locator, Page } from "@playwright/test";

/**
 * Page Object Model representing the email verification processing interface.
 */
export class VerificationPage {
  readonly pageHeaderTitle: Locator;
  readonly pageHeaderDescription: Locator;
  readonly feedbackContainer: Locator;
  readonly backToHomeButton: Locator;
  readonly proceedToSignInButton: Locator;

  /**
   * Initializes the locators for elements used in the email verification flow.
   */
  constructor(readonly page: Page) {
    // Locate the primary page heading by its level.
    this.pageHeaderTitle = page.getByRole("heading", { level: 1 });
    // Locate the instructional text describing the purpose of the page.
    this.pageHeaderDescription = page.getByText("This page processes email verification links");
    // Locate the main container for feedback messages using its typography class.
    this.feedbackContainer = page.locator(".font-inter");
    // Locate the navigation link to return the user to the application root.
    this.backToHomeButton = page.getByRole("link", { name: "Back to Homepage" });
    // Locate the navigation link that directs a verified user to the login screen.
    this.proceedToSignInButton = page.getByRole("link", { name: "Proceed to Sign In" });
  }

  /**
   * Navigates to the verification route with optional query parameters for token and type.
   */
  async goto(token?: string, type?: string) {
    // Define the base URL for the verification route.
    let url = "/verification";
    // Construct query parameters using the `URLSearchParams` utility.
    const params = new URLSearchParams();
    if (token) params.append("token", token);
    if (type) params.append("type", type);

    // Append the encoded parameters to the URL string if any exist.
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    // Execute the navigation to the constructed verification URL.
    await this.page.goto(url);
  }

  /**
   * Verifies the UI state when the page is accessed without a required security token.
   */
  async expectMissingTokenState() {
    // Assert that the page title correctly indicates email verification.
    await expect(this.pageHeaderTitle).toHaveText("Email Verification");
    // Assert that the primary description is rendered.
    await expect(this.pageHeaderDescription).toBeVisible();
    // Assert that explicit instructional text regarding the page function is visible.
    await expect(
      this.page.getByText("This page is used to verify an email address.")
    ).toBeVisible();
    // Assert that the user is provided with a path back to the home page.
    await expect(this.backToHomeButton).toBeVisible();
  }

  /**
   * Verifies that the application displays an error message for malformed or expired tokens.
   */
  async expectInvalidTokenError() {
    // Assert that the specific invalid link message appears within the 60-second processing window.
    await expect(
      this.page.getByText("Invalid or used verification link", { exact: false })
    ).toBeVisible({ timeout: 60000 });
    // Assert that the return link to the homepage remains available.
    await expect(this.backToHomeButton).toBeVisible();
  }

  /**
   * Verifies that the email verification was successful and provides next steps.
   */
  async expectSuccess(message: string) {
    // Assert that the provided success message is visible after background processing completes.
    await expect(this.page.getByText(message, { exact: false })).toBeVisible({ timeout: 60000 });
    // Assert that the link to proceed to the sign-in page is now rendered for the user.
    await expect(this.proceedToSignInButton).toBeVisible();
  }
}
