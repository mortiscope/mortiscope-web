import { FormComponent } from "@e2e/pages/components/form.component";
import { expect, Locator, Page } from "@playwright/test";

/**
 * Page Object Model representing the password reset interface.
 */
export class ResetPasswordPage {
  readonly form: FormComponent;
  readonly pageTitle: Locator;
  readonly pageDescription: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmNewPasswordInput: Locator;
  readonly resetPasswordButton: Locator;
  readonly invalidLinkMessage: Locator;
  readonly goToForgotPasswordLink: Locator;
  readonly backToSignInLink: Locator;
  readonly noLongerNeedToResetText: Locator;

  /**
   * Initializes the locators for the password reset user interface components.
   */
  constructor(readonly page: Page) {
    // Initialize the shared form component for field validation assertions.
    this.form = new FormComponent(page);
    // Locate the main heading for the password reset screen.
    this.pageTitle = page.getByRole("heading", { name: "Reset Password" });
    // Locate the instructional text for the user.
    this.pageDescription = page.getByText("Enter your new password below");
    // Locate the input field for the new password.
    this.newPasswordInput = page.getByPlaceholder("Enter your new password");
    // Locate the input field for confirming the new password.
    this.confirmNewPasswordInput = page.getByPlaceholder("Confirm your new password");
    // Locate the primary submission button.
    this.resetPasswordButton = page.getByRole("button", { name: "Reset Password" });
    // Locate the error message displayed when a reset token is invalid or expired.
    this.invalidLinkMessage = page.getByText("It looks like this password reset link is invalid.");
    // Locate the link that redirects users to request a new reset email.
    this.goToForgotPasswordLink = page.getByRole("link", { name: "Go to Forgot Password" });
    // Locate the navigation link to return to the sign-in page.
    this.backToSignInLink = page.getByRole("link", { name: "Back to Sign In" });
    // Locate the secondary text for users who no longer require a reset.
    this.noLongerNeedToResetText = page.getByText("No longer need to reset?");
  }

  /**
   * Navigates to the reset password route, optionally appending a security token.
   */
  async goto(token?: string) {
    // Append the token as a query parameter if it is provided.
    if (token) {
      await this.page.goto(`/reset-password?token=${token}`);
    } else {
      // Navigate to the base reset password URL without a token.
      await this.page.goto("/reset-password");
    }
  }

  /**
   * Performs the user flow of entering a new password into both required fields and submitting.
   */
  async submitPassword(password: string) {
    // Fill the primary password input field.
    await this.newPasswordInput.fill(password);
    // Fill the confirmation password input field.
    await this.confirmNewPasswordInput.fill(password);
    // Click the submission button to update the password.
    await this.resetPasswordButton.click();
  }

  /**
   * Verifies that the reset password button is actionable.
   */
  async expectSubmitEnabled() {
    // Assert that the `resetPasswordButton` is enabled.
    await expect(this.resetPasswordButton).toBeEnabled();
  }

  /**
   * Verifies that the reset password button is not actionable.
   */
  async expectSubmitDisabled() {
    // Assert that the `resetPasswordButton` is disabled.
    await expect(this.resetPasswordButton).toBeDisabled();
  }

  /**
   * Verifies that the interface displays the appropriate error state for an invalid security token.
   */
  async expectInvalidTokenError() {
    // Assert that the specific invalid link message is visible.
    await expect(this.invalidLinkMessage).toBeVisible();
    // Assert that the link to request a new reset email is provided to the user.
    await expect(this.goToForgotPasswordLink).toBeVisible();
  }

  /**
   * Verifies that a specific error message is displayed after a failed submission attempt.
   */
  async expectErrorMessage(message: string) {
    // Wait for the button text to settle to ensure processing has completed.
    await expect(this.resetPasswordButton).toHaveText("Reset Password", { timeout: 30000 });
    // Assert that the expected error message text is visible on the page.
    await expect(this.page.getByText(message, { exact: false })).toBeVisible();
  }

  /**
   * Verifies that a success message is displayed and the navigation back to sign-in is available.
   */
  async expectSuccessMessage(message: string) {
    // Assert that the success confirmation message is visible.
    await expect(this.page.getByText(message, { exact: false })).toBeVisible();
    // Assert that the user can navigate back to the sign-in page.
    await expect(this.backToSignInLink).toBeVisible();
  }

  /**
   * Interacts with the visibility toggle for both password fields to reveal the input text.
   */
  async togglePasswordVisibility() {
    // Define an internal helper function to locate and click the visibility toggle relative to an input.
    const toggleInput = async (inputLocator: Locator) => {
      // Find the toggle button sibling within the parent container.
      const toggleButton = inputLocator
        .locator("..")
        .getByRole("button", { name: "Show password" });
      // Click the toggle button if it is currently in the "Show" state.
      if (await toggleButton.isVisible()) {
        await toggleButton.click();
      }
    };

    // Reveal the text for the new password input.
    await toggleInput(this.newPasswordInput);
    // Reveal the text for the confirmation password input.
    await toggleInput(this.confirmNewPasswordInput);
  }
}
