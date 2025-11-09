import { FormComponent } from "@e2e/pages/components/form.component";
import { expect, Locator, Page } from "@playwright/test";

/**
 * Page Object Model representing the user authentication interface.
 */
export class SignInPage {
  readonly form: FormComponent;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly googleButton: Locator;
  readonly linkedinButton: Locator;
  readonly microsoftButton: Locator;
  readonly orcidButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly signUpLink: Locator;

  /**
   * Initializes the locators for all interactive elements on the sign-in page.
   */
  constructor(readonly page: Page) {
    // Initialize the shared form component for validation checks.
    this.form = new FormComponent(page);
    // Locate the email address input field by its accessible label.
    this.emailInput = page.getByRole("textbox", { name: "Email" });
    // Locate the password field by its placeholder text.
    this.passwordInput = page.getByPlaceholder("Enter your password");
    // Locate the primary sign-in submission button.
    this.signInButton = page.getByRole("button", { name: "Sign In" });
    // Locate the Google OAuth provider button.
    this.googleButton = page.getByRole("button", { name: "Google" });
    // Locate the LinkedIn OAuth provider button.
    this.linkedinButton = page.getByRole("button", { name: "LinkedIn" });
    // Locate the Microsoft OAuth provider button.
    this.microsoftButton = page.getByRole("button", { name: "Microsoft" });
    // Locate the ORCID OAuth provider button.
    this.orcidButton = page.getByRole("button", { name: "ORCID" });
    // Locate the link to the password recovery page.
    this.forgotPasswordLink = page.getByRole("link", { name: "Forgot Password?" });
    // Locate the link to the account registration page.
    this.signUpLink = page.getByRole("link", { name: "Sign Up" });
  }

  /**
   * Navigates the browser to the sign-in route.
   */
  async goto() {
    // Navigate the current page to the `/signin` URL.
    await this.page.goto("/signin");
  }

  /**
   * Performs the user interaction flow to submit the login form with credentials.
   */
  async signInWithCredentials(email: string, pass: string) {
    // Fill the email address into the targeted input field.
    await this.emailInput.fill(email);
    // Fill the password into the targeted input field.
    await this.passwordInput.fill(pass);
    // Click the sign-in button to submit the credentials.
    await this.signInButton.click();
  }

  /**
   * Initiates the authentication process using the Google OAuth provider.
   */
  async signInWithGoogle() {
    // Simulate a user click on the Google authentication button.
    await this.googleButton.click();
  }

  /**
   * Triggers navigation to the password recovery interface.
   */
  async clickForgotPassword() {
    // Simulate a user click on the `forgotPasswordLink` element.
    await this.forgotPasswordLink.click();
  }

  /**
   * Triggers navigation to the user registration interface.
   */
  async clickSignUp() {
    // Simulate a user click on the `signUpLink` element.
    await this.signUpLink.click();
  }

  /**
   * Interacts with the password visibility toggle to change the masking state of the input.
   */
  async togglePasswordVisibility() {
    // Locate the button specifically by its current accessible state as "Show".
    const showButton = this.page.getByRole("button", { name: "Show password" });
    // Locate the button specifically by its current accessible state as "Hide".
    const hideButton = this.page.getByRole("button", { name: "Hide password" });

    // Check if the password is currently masked to decide which button state to click.
    if (await showButton.isVisible()) {
      // Click the button to unmask the password text.
      await showButton.click();
    } else {
      // Click the button to mask the password text.
      await hideButton.click();
    }
  }

  /**
   * Asserts that the password input is currently in a plain-text visible state.
   */
  async expectPasswordVisible() {
    // Assert that the input `type` attribute is currently set to `text`.
    await expect(this.passwordInput).toHaveAttribute("type", "text");
    // Assert that the toggle button now prompts the user to hide the password.
    await expect(this.page.getByRole("button", { name: "Hide password" })).toBeVisible();
  }

  /**
   * Asserts that the password input is currently masked.
   */
  async expectPasswordHidden() {
    // Assert that the input `type` attribute is currently set to `password`.
    await expect(this.passwordInput).toHaveAttribute("type", "password");
    // Assert that the toggle button now prompts the user to show the password.
    await expect(this.page.getByRole("button", { name: "Show password" })).toBeVisible();
  }

  /**
   * Verifies that the sign-in button is in an enabled state.
   */
  async expectSubmitEnabled() {
    // Assert that the `signInButton` is actionable.
    await expect(this.signInButton).toBeEnabled();
  }

  /**
   * Verifies that the sign-in button is in a disabled state.
   */
  async expectSubmitDisabled() {
    // Assert that the `signInButton` is not actionable.
    await expect(this.signInButton).toBeDisabled();
  }

  /**
   * Retrieves the text content of the primary error message container.
   */
  async getErrorMessage() {
    // Locate the error element by its specific rose-colored utility class and return its text.
    return await this.page.locator(".text-rose-700").textContent();
  }

  /**
   * Verifies that a specific error message is displayed to the user.
   */
  async expectErrorMessage(message: string) {
    // Ensure the form has finished processing by checking the button text state.
    await expect(this.signInButton).toHaveText("Sign In", { timeout: 30000 });
    // Assert that the expected error message string is visible on the page.
    await expect(this.page.getByText(message, { exact: false })).toBeVisible();
  }
}
