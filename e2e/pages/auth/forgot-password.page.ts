import { FormComponent } from "@e2e/pages/components/form.component";
import { expect, Locator, Page } from "@playwright/test";

/**
 * Page Object Model representing the password recovery interface.
 */
export class ForgotPasswordPage {
  readonly form: FormComponent;
  readonly emailInput: Locator;
  readonly sendResetLinkButton: Locator;
  readonly backToSignInLink: Locator;

  /**
   * Initializes the locators for the interactive elements on the forgot password page.
   */
  constructor(readonly page: Page) {
    // Initialize the shared form component for managing field-level validations.
    this.form = new FormComponent(page);
    // Locate the email address input field by its accessible role and label.
    this.emailInput = page.getByRole("textbox", { name: "Email" });
    // Locate the submission button used to request a recovery email.
    this.sendResetLinkButton = page.getByRole("button", { name: "Send Reset Link" });
    // Locate the navigation link that returns the user to the sign-in screen.
    this.backToSignInLink = page.getByRole("link", { name: "Back to Sign In" });
  }

  /**
   * Navigates the browser to the password recovery route.
   */
  async goto() {
    // Direct the browser to the `/forgot-password` endpoint.
    await this.page.goto("/forgot-password");
  }

  /**
   * Performs the user flow of entering an email and submitting the recovery request.
   */
  async submitEmail(email: string) {
    // Enter the provided email string into the `emailInput` field.
    await this.emailInput.fill(email);
    // Click the submission button to trigger the password reset process.
    await this.sendResetLinkButton.click();
  }

  /**
   * Triggers navigation back to the login interface.
   */
  async clickBackToSignIn() {
    // Simulate a user click on the `backToSignInLink` element.
    await this.backToSignInLink.click();
  }

  /**
   * Verifies that the recovery submission button is in an enabled state.
   */
  async expectSubmitEnabled() {
    // Assert that the `sendResetLinkButton` is actionable for the user.
    await expect(this.sendResetLinkButton).toBeEnabled();
  }

  /**
   * Verifies that the recovery submission button is in a disabled state.
   */
  async expectSubmitDisabled() {
    // Assert that the `sendResetLinkButton` is not actionable.
    await expect(this.sendResetLinkButton).toBeDisabled();
  }

  /**
   * Verifies that an error message is visible after an unsuccessful submission attempt.
   */
  async expectErrorMessage(message: string) {
    // Ensure the button has finished its loading state by checking its text with a timeout.
    await expect(this.sendResetLinkButton).toHaveText("Send Reset Link", { timeout: 30000 });
    // Assert that the specified error text appears in the viewport.
    await expect(this.page.getByText(message, { exact: false })).toBeVisible();
  }

  /**
   * Verifies that a success message is visible after a valid recovery request.
   */
  async expectSuccessMessage(message: string) {
    // Ensure the form state has settled by verifying the button text is back to its default.
    await expect(this.sendResetLinkButton).toHaveText("Send Reset Link", { timeout: 30000 });
    // Assert that the success confirmation text is visible to the user.
    await expect(this.page.getByText(message, { exact: false })).toBeVisible();
  }
}
