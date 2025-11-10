import { expect, Locator, Page } from "@playwright/test";

/**
 * Page Object Model representing the multi-factor account recovery interface.
 */
export class RecoveryPage {
  readonly pageHeaderTitle: Locator;
  readonly pageHeaderDescription: Locator;
  readonly recoveryCodeInput: Locator;
  readonly verifyButton: Locator;
  readonly submitButton: Locator;
  readonly backToSignInLink: Locator;
  readonly backToSignInButton: Locator;

  /**
   * Initializes the locators for the account recovery user interface.
   */
  constructor(readonly page: Page) {
    // Locate the primary page heading using its hierarchical role.
    this.pageHeaderTitle = page.getByRole("heading", { level: 1 });
    // Locate the instructional text provided to the user for the recovery process.
    this.pageHeaderDescription = page.getByText(
      "Enter one of your recovery codes to complete sign-in."
    );
    // Locate the input field where users enter their backup recovery codes.
    this.recoveryCodeInput = page.getByPlaceholder("Enter your recovery code");
    // Locate the button used to submit the recovery code for verification.
    this.verifyButton = page.getByRole("button", { name: "Verify Code" });
    // Locate the generic button element used for state and text assertions.
    this.submitButton = page.locator("button[type='button']");
    // Locate the navigation link that redirects the user to the login page.
    this.backToSignInLink = page.getByRole("link", { name: "Back to Sign In" });
    // Locate the button alternative for returning to the login page.
    this.backToSignInButton = page.getByRole("button", { name: "Back to Sign In" });
  }

  /**
   * Navigates the browser to the recovery route, optionally including an error query parameter.
   */
  async goto(error?: string) {
    // Define the base path for the account recovery route.
    let url = "/signin/recovery";
    // Append the error code to the URL if a specific error state is being tested.
    if (error) {
      url += `?error=${error}`;
    }
    // Execute the navigation to the final constructed URL.
    await this.page.goto(url);
  }

  /**
   * Simulates a user typing a code into the recovery input field.
   */
  async fillRecoveryCode(code: string) {
    // Populate the `recoveryCodeInput` with the provided string.
    await this.recoveryCodeInput.fill(code);
  }

  /**
   * Simulates a user clicking the verification button to submit the form.
   */
  async submit() {
    // Click the button to initiate the backend verification of the recovery code.
    await this.verifyButton.click();
  }

  /**
   * Verifies the interface state when a user accesses the page without an active session.
   */
  async expectNoSessionError() {
    // Assert that the page title remains correct for the context.
    await expect(this.pageHeaderTitle).toHaveText("Account Recovery");
    // Assert that the descriptive text explains the purpose of the page.
    await expect(
      this.page.getByText("This page is used to recover your account using a recovery code.")
    ).toBeVisible();
    // Assert that the user is provided with a button to return to the sign-in flow.
    await expect(this.backToSignInButton).toBeVisible();
  }

  /**
   * Verifies that the standard recovery form and its components are visible.
   */
  async expectFormState() {
    // Assert that the primary heading is visible and contains the expected text.
    await expect(this.pageHeaderTitle).toHaveText("Account Recovery");
    // Assert that the instructions for entering a code are present.
    await expect(this.pageHeaderDescription).toBeVisible();
    // Assert that the input field for the code is rendered.
    await expect(this.recoveryCodeInput).toBeVisible();
    // Assert that the submission button is rendered.
    await expect(this.verifyButton).toBeVisible();
    // Assert that the exit link back to sign-in is rendered.
    await expect(this.backToSignInLink).toBeVisible();
  }

  /**
   * Verifies that the application displays an error for an unrecognized recovery code.
   */
  async expectInvalidCodeError() {
    // Assert that a specific "Invalid recovery code" message appears within the timeout period.
    await expect(this.page.getByText("Invalid recovery code", { exact: false })).toBeVisible({
      timeout: 10000,
    });
  }

  /**
   * Verifies that a specific error message is displayed and the button has finished loading.
   */
  async expectError(message: string) {
    // Assert that the button no longer displays the "Verifying..." loading state.
    await expect(this.submitButton).not.toHaveText("Verifying...", { timeout: 30000 });
    // Assert that the button text has reverted to "Verify Code" before checking for messages.
    await expect(this.submitButton).toHaveText("Verify Code", { timeout: 5000 });
    // Assert that the requested error message text is visible to the user.
    await expect(this.page.getByText(message, { exact: false })).toBeVisible();
  }

  /**
   * Verifies that the recovery process completed successfully.
   */
  async expectSuccess() {
    // Assert that the success confirmation message appears, allowing for extended backend processing time.
    await expect(this.page.getByText("Recovery successful!", { exact: false })).toBeVisible({
      timeout: 60000,
    });
  }
}
