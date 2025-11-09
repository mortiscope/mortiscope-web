import { FormComponent } from "@e2e/pages/components/form.component";
import { expect, Locator, Page } from "@playwright/test";

/**
 * Page Object Model representing the user registration interface.
 */
export class SignUpPage {
  readonly form: FormComponent;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly signUpButton: Locator;
  readonly googleButton: Locator;
  readonly linkedinButton: Locator;
  readonly microsoftButton: Locator;
  readonly orcidButton: Locator;
  readonly signInLink: Locator;

  /**
   * Initializes the locators for all interactive elements on the sign-up page.
   */
  constructor(readonly page: Page) {
    // Initialize the shared form component for validation checks.
    this.form = new FormComponent(page);
    // Locate the first name input field by its accessible label.
    this.firstNameInput = page.getByRole("textbox", { name: "First Name" });
    // Locate the last name input field by its accessible label.
    this.lastNameInput = page.getByRole("textbox", { name: "Last Name" });
    // Locate the email address input field by its accessible label.
    this.emailInput = page.getByRole("textbox", { name: "Email" });
    // Locate the primary password field by its placeholder text.
    this.passwordInput = page.getByPlaceholder("Enter your password");
    // Locate the confirmation password field by its placeholder text.
    this.confirmPasswordInput = page.getByPlaceholder("Confirm your password");
    // Locate the primary submission button.
    this.signUpButton = page.getByRole("button", { name: "Sign Up" });
    // Locate the Google OAuth provider button.
    this.googleButton = page.getByRole("button", { name: "Google" });
    // Locate the LinkedIn OAuth provider button.
    this.linkedinButton = page.getByRole("button", { name: "LinkedIn" });
    // Locate the Microsoft OAuth provider button.
    this.microsoftButton = page.getByRole("button", { name: "Microsoft" });
    // Locate the ORCID OAuth provider button.
    this.orcidButton = page.getByRole("button", { name: "ORCID" });
    // Locate the navigation link to the sign-in page.
    this.signInLink = page.getByRole("link", { name: "Sign In" });
  }

  /**
   * Navigates the browser to the registration route.
   */
  async goto() {
    // Navigate the current page to the `/signup` URL.
    await this.page.goto("/signup");
  }

  /**
   * Performs the full user interaction flow to submit the registration form.
   */
  async signUpWithCredentials(
    firstName: string,
    lastName: string,
    email: string,
    pass: string,
    confirmPass: string
  ) {
    // Populate the first name field.
    await this.firstNameInput.fill(firstName);
    // Populate the last name field.
    await this.lastNameInput.fill(lastName);
    // Populate the email address field.
    await this.emailInput.fill(email);
    // Populate the primary password field.
    await this.passwordInput.fill(pass);
    // Populate the password confirmation field.
    await this.confirmPasswordInput.fill(confirmPass);
    // Click the submit button to initiate the registration request.
    await this.signUpButton.click();
  }

  /**
   * Triggers navigation to the login page via the sign-in link.
   */
  async clickSignIn() {
    // Simulate a user click on the `signInLink` element.
    await this.signInLink.click();
  }

  /**
   * Interacts with the visibility toggle button associated with a password field.
   */
  async togglePasswordVisibility(field: "password" | "confirmPassword") {
    // Select the target input locator based on the provided field identifier.
    const input = field === "password" ? this.passwordInput : this.confirmPasswordInput;
    // Find the toggle button sibling within the parent container of the input.
    const toggleButton = input.locator("..").getByRole("button");
    // Click the toggle button to change the visibility state.
    await toggleButton.click();
  }

  /**
   * Asserts that a password field is currently in a plain-text visible state.
   */
  async expectPasswordVisible(field: "password" | "confirmPassword") {
    // Determine which input element to inspect.
    const input = field === "password" ? this.passwordInput : this.confirmPasswordInput;
    // Assert that the input `type` attribute has changed to `text`.
    await expect(input).toHaveAttribute("type", "text");
    // Assert that the toggle button now displays the "Hide password" accessible name.
    await expect(input.locator("..").getByRole("button", { name: "Hide password" })).toBeVisible();
  }

  /**
   * Asserts that a password field is currently masked.
   */
  async expectPasswordHidden(field: "password" | "confirmPassword") {
    // Determine which input element to inspect.
    const input = field === "password" ? this.passwordInput : this.confirmPasswordInput;
    // Assert that the input `type` attribute is set to `password`.
    await expect(input).toHaveAttribute("type", "password");
    // Assert that the toggle button displays the "Show password" accessible name.
    await expect(input.locator("..").getByRole("button", { name: "Show password" })).toBeVisible();
  }

  /**
   * Verifies that the form submission button is in an enabled state.
   */
  async expectSubmitEnabled() {
    // Assert that the `signUpButton` does not have a disabled attribute.
    await expect(this.signUpButton).toBeEnabled();
  }

  /**
   * Verifies that the form submission button is in a disabled state.
   */
  async expectSubmitDisabled() {
    // Assert that the `signUpButton` has a disabled attribute.
    await expect(this.signUpButton).toBeDisabled();
  }

  /**
   * Verifies that a specific input field displays the expected validation error message.
   */
  async expectFieldError(
    field: "firstName" | "lastName" | "email" | "password" | "confirmPassword",
    message: string
  ) {
    // Delegate the error verification to the shared `form` component.
    if (field === "confirmPassword") {
      // Check validation error for the confirmation field.
      await this.form.expectError(field, message);
    } else {
      // Check validation error for standard input fields.
      await this.form.expectError(field, message);
    }
  }

  /**
   * Verifies that a global error message is displayed on the page, typically after submission.
   */
  async expectGlobalError(message: string) {
    // Wait for the button text to settle to ensure the page has responded to the submission.
    await expect(this.signUpButton).toHaveText("Sign Up", { timeout: 30000 });
    // Assert that the specific error message text is visible anywhere on the page.
    await expect(this.page.getByText(message, { exact: false })).toBeVisible();
  }
}
