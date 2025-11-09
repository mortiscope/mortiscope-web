import { expect, test } from "@e2e/fixtures";
import { SignUpPage } from "@e2e/pages/auth/signup.page";

// Groups all tests related to the user registration interface and logic.
test.describe("Sign Up Page", () => {
  let signUpPage: SignUpPage;

  // Initialize the Page Object Model and navigate to the registration route before each test.
  test.beforeEach(async ({ unauthenticatedPage }) => {
    // Use the unauthenticated page fixture to initialize the sign-up page object.
    signUpPage = new SignUpPage(unauthenticatedPage);
    // Navigate to the sign-up URL.
    await signUpPage.goto();
  });

  /**
   * Test case to verify that all necessary interface components are rendered on the sign-up page.
   */
  test("should display all sign up elements", async ({ unauthenticatedPage }) => {
    // Assert that the first name input field is visible.
    await expect(signUpPage.firstNameInput).toBeVisible();
    // Assert that the last name input field is visible.
    await expect(signUpPage.lastNameInput).toBeVisible();
    // Assert that the email address input field is visible.
    await expect(signUpPage.emailInput).toBeVisible();
    // Assert that the primary password input field is visible.
    await expect(signUpPage.passwordInput).toBeVisible();
    // Assert that the password confirmation input field is visible.
    await expect(signUpPage.confirmPasswordInput).toBeVisible();
    // Assert that the manual sign-up submission button is visible.
    await expect(signUpPage.signUpButton).toBeVisible();
    // Assert that the Google OAuth authentication button is visible.
    await expect(signUpPage.googleButton).toBeVisible();
    // Assert that the LinkedIn OAuth authentication button is visible.
    await expect(signUpPage.linkedinButton).toBeVisible();
    // Assert that the Microsoft OAuth authentication button is visible.
    await expect(signUpPage.microsoftButton).toBeVisible();
    // Assert that the ORCID OAuth authentication button is visible.
    await expect(signUpPage.orcidButton).toBeVisible();
    // Assert that the link to navigate back to the sign-in page is visible.
    await expect(signUpPage.signInLink).toBeVisible();

    // Capture a screenshot to document the state of all interface elements.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signup/1-interface-elements.png",
    });
  });

  /**
   * Test case to ensure the submit button is not actionable when the form is empty.
   */
  test("should have disabled submit button initially", async ({ unauthenticatedPage }) => {
    // Assert that the sign-up button is disabled upon initial page load.
    await signUpPage.expectSubmitDisabled();

    // Capture a screenshot of the initial disabled state.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signup/2-initial-state.png",
    });
  });

  /**
   * Test case to verify that the application detects and reports an incorrectly formatted email address.
   */
  test("should show validation error for invalid email format", async ({ unauthenticatedPage }) => {
    // Fill the `firstNameInput` with a valid string.
    await signUpPage.firstNameInput.fill("Mortiscope");
    // Fill the `lastNameInput` with a valid string.
    await signUpPage.lastNameInput.fill("Account");
    // Fill the `emailInput` with a string lacking standard email formatting.
    await signUpPage.emailInput.fill("invalid-email");
    // Move focus away from the email field to trigger validation.
    await signUpPage.passwordInput.focus();

    // Assert that the correct field-level error message is displayed for `email`.
    await signUpPage.expectFieldError("email", "Please enter a valid email address.");
    // Assert that the form submission remains disabled due to invalid input.
    await signUpPage.expectSubmitDisabled();

    // Capture a screenshot illustrating the email validation error.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signup/3-invalid-email.png",
    });
  });

  /**
   * Test case to verify that passwords below the minimum character threshold are rejected.
   */
  test("should show validation error for weak password", async ({ unauthenticatedPage }) => {
    // Fill the `passwordInput` with a string that is too short.
    await signUpPage.passwordInput.fill("weak");
    // Use the page helper to reveal the password text for verification.
    await signUpPage.togglePasswordVisibility("password");
    // Assert that the password text is visible in the DOM.
    await signUpPage.expectPasswordVisible("password");
    // Move focus to the next field to trigger validation logic.
    await signUpPage.confirmPasswordInput.focus();

    // Assert that the specific length requirement error is displayed.
    await signUpPage.expectFieldError(
      "password",
      "New password must be at least 12 characters long."
    );
    // Assert that the form cannot be submitted.
    await signUpPage.expectSubmitDisabled();

    // Capture a screenshot of the weak password validation state.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signup/4-weak-password.png",
    });
  });

  /**
   * Test case to verify that the password visibility toggle functions correctly for both sensitive fields.
   */
  test("should toggle password visibility for both fields", async ({ unauthenticatedPage }) => {
    // Fill the primary password field.
    await signUpPage.passwordInput.fill("Secret123!");
    // Assert the field is masked by default.
    await signUpPage.expectPasswordHidden("password");
    // Click the toggle icon to reveal the text.
    await signUpPage.togglePasswordVisibility("password");
    // Assert the password text is now visible.
    await signUpPage.expectPasswordVisible("password");

    // Fill the confirmation password field.
    await signUpPage.confirmPasswordInput.fill("Secret123!");
    // Assert the confirmation field is masked by default.
    await signUpPage.expectPasswordHidden("confirmPassword");
    // Click the toggle icon for the confirmation field.
    await signUpPage.togglePasswordVisibility("confirmPassword");
    // Assert the confirmation password text is now visible.
    await signUpPage.expectPasswordVisible("confirmPassword");

    // Capture a screenshot showing both password fields in their unmasked state.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signup/5-password-visibility.png",
    });
  });

  /**
   * Test case to verify the server-side rejection of an email address already present in the database.
   */
  test("should show error when signing up with existing email", async ({
    unauthenticatedPage,
    workerUser,
  }) => {
    // Retrieve an email address from the worker user fixture known to exist in the system.
    const existingEmail = workerUser.email;

    // Execute the full sign-up flow using the Page Object Model method.
    await signUpPage.signUpWithCredentials(
      "Mortiscope",
      "Account",
      existingEmail,
      "Password123!",
      "Password123!"
    );

    // Assert that a global alert message appears indicating the email is taken.
    await signUpPage.expectGlobalError("This email is already registered.");

    // Reveal the password fields to ensure they are visible in the error state screenshot.
    await signUpPage.togglePasswordVisibility("password");
    await signUpPage.togglePasswordVisibility("confirmPassword");

    // Capture a screenshot of the duplicate email error message.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signup/6-existing-user-error.png",
    });
  });

  /**
   * Test case to ensure that third-party authentication options are available and enabled.
   */
  test("should initiate oauth flows", async ({ unauthenticatedPage }) => {
    // Assert the Google button is ready for interaction.
    await expect(signUpPage.googleButton).toBeEnabled();
    // Assert the LinkedIn button is ready for interaction.
    await expect(signUpPage.linkedinButton).toBeEnabled();
    // Assert the Microsoft button is ready for interaction.
    await expect(signUpPage.microsoftButton).toBeEnabled();
    // Assert the ORCID button is ready for interaction.
    await expect(signUpPage.orcidButton).toBeEnabled();

    // Capture a screenshot of the available OAuth provider buttons.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signup/7-oauth-buttons.png",
    });
  });

  /**
   * Test case to verify that the form rejects mismatched password and confirmation entries.
   */
  test("should show validation error when passwords do not match", async ({
    unauthenticatedPage,
  }) => {
    // Enter valid registration data except for matching passwords.
    await signUpPage.firstNameInput.fill("Mortiscope");
    // Enter the last name.
    await signUpPage.lastNameInput.fill("Account");
    // Enter a valid email format.
    await signUpPage.emailInput.fill("mortiscope@example.com");
    // Enter the initial password.
    await signUpPage.passwordInput.fill("Password123!");
    // Enter a different password in the confirmation field.
    await signUpPage.confirmPasswordInput.fill("Mismatch123!");

    // Reveal both passwords to ensure the mismatch is visible in the test recording or screenshot.
    await signUpPage.togglePasswordVisibility("password");
    // Reveal the confirmation password.
    await signUpPage.togglePasswordVisibility("confirmPassword");

    // Trigger validation by removing focus from the confirmation input.
    await signUpPage.confirmPasswordInput.blur();

    // Assert that the `confirmPassword` field displays the mismatch error.
    await signUpPage.form.expectError("confirmPassword", "Passwords do not match");
    // Assert that the user cannot proceed with mismatched passwords.
    await signUpPage.expectSubmitDisabled();

    // Capture a screenshot of the password mismatch validation error.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signup/8-password-mismatch.png",
    });
  });

  /**
   * Test case to verify that the submit button becomes active once all fields meet validation requirements.
   */
  test("should enable submit button when form is valid", async ({ unauthenticatedPage }) => {
    // Provide valid data to the first name field.
    await signUpPage.firstNameInput.fill("Mortiscope");
    // Provide valid data to the last name field.
    await signUpPage.lastNameInput.fill("Account");
    // Provide a validly formatted email.
    await signUpPage.emailInput.fill("mortiscope@example.com");
    // Provide a password meeting complexity requirements.
    await signUpPage.passwordInput.fill("Password123!");
    // Provide a matching confirmation password.
    await signUpPage.confirmPasswordInput.fill("Password123!");

    // Toggle visibility for visual confirmation in the test artifacts.
    await signUpPage.togglePasswordVisibility("password");
    // Toggle visibility for the confirmation field.
    await signUpPage.togglePasswordVisibility("confirmPassword");

    // Assert that the submission button is now enabled for the user.
    await signUpPage.expectSubmitEnabled();

    // Capture a screenshot of the valid form state.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signup/9-valid-form-state.png",
    });
  });

  /**
   * Test case to verify the navigation link leading from the sign-up page to the sign-in page.
   */
  test("should navigate to sign in page", async ({ unauthenticatedPage }) => {
    // Simulate a user click on the sign-in redirect link.
    await signUpPage.clickSignIn();
    // Wait for the browser to navigate to the `**/signin` URL with a generous timeout for network latency.
    await unauthenticatedPage.waitForURL("**/signin", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    // Assert that the current URL matches the expected sign-in pattern.
    await expect(unauthenticatedPage).toHaveURL(/\/signin/);

    // Capture a screenshot of the sign-in page after successful navigation.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signup/10-signin-navigation.png",
    });
  });
});
