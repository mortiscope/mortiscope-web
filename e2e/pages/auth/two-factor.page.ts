import { expect, Locator, Page } from "@playwright/test";

/**
 * Page Object Model representing the two-factor authentication (2FA) challenge interface.
 */
export class TwoFactorPage {
  readonly submitButton: Locator;
  readonly useRecoveryLink: Locator;
  readonly backToSignInLink: Locator;
  readonly otpInput: Locator;

  /**
   * Initializes the locators for the two-factor authentication components.
   */
  constructor(readonly page: Page) {
    // Locate the specialized one-time password input field using its data attribute.
    this.otpInput = page.locator("input[data-input-otp='true']");
    // Locate the primary action button by its element type.
    this.submitButton = page.locator("button[type='button']");
    // Locate the link that allows the user to switch to recovery code authentication.
    this.useRecoveryLink = page.getByRole("link", { name: "Use Recovery Code" });
    // Locate the link that redirects the user back to the initial sign-in screen.
    this.backToSignInLink = page.getByRole("link", { name: "Back to Sign In" });
  }

  /**
   * Provides a semantic alias for the submit button to clarify its purpose in verification contexts.
   */
  get verifyButton(): Locator {
    return this.submitButton;
  }

  /**
   * Simulates a user focusing the OTP input and typing the security code via the keyboard.
   */
  async fillCode(code: string) {
    // Click the input field to ensure it has focus before typing.
    await this.otpInput.click();
    // Simulate direct keyboard entry to accommodate masked or multi-segmented OTP inputs.
    await this.page.keyboard.type(code);
  }

  /**
   * Simulates a user clicking the verification button to submit the provided code.
   */
  async submit() {
    // Click the `submitButton` to trigger the backend validation request.
    await this.submitButton.click();
  }

  /**
   * Verifies that the verification button is actionable.
   */
  async expectSubmitEnabled() {
    // Assert that the `submitButton` is currently enabled.
    await expect(this.submitButton).toBeEnabled();
  }

  /**
   * Verifies that the verification button is not actionable.
   */
  async expectSubmitDisabled() {
    // Assert that the `submitButton` is currently disabled.
    await expect(this.submitButton).toBeDisabled();
  }

  /**
   * Verifies that the UI displays a specific error message, allowing for backend processing time.
   */
  async expectError(message: string) {
    // Assert that the specified error text becomes visible within the 60-second timeout.
    await expect(this.page.getByText(message, { exact: false })).toBeVisible({ timeout: 60000 });
  }

  /**
   * Verifies that the authentication process was completed successfully.
   */
  async expectSuccess() {
    // Assert that the "Verification successful!" confirmation appears within the timeout period.
    await expect(this.page.getByText("Verification successful!", { exact: false })).toBeVisible({
      timeout: 60000,
    });
  }
}
