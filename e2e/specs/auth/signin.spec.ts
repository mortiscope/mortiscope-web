import { expect, test } from "@e2e/fixtures";
import { SignInPage } from "@e2e/pages/auth/signin.page";

// Groups all tests related to the authentication login interface.
test.describe("Sign In Page", () => {
  let signInPage: SignInPage;

  // Initialize the Page Object Model and navigate to the login route before each test.
  test.beforeEach(async ({ unauthenticatedPage }) => {
    // Use the unauthenticated page fixture to initialize the sign-in page object.
    signInPage = new SignInPage(unauthenticatedPage);
    // Navigate to the sign-in URL.
    await signInPage.goto();
  });

  /**
   * Test case to verify that all necessary interface components are rendered on the sign-in page.
   */
  test("should display all sign in elements", async ({ unauthenticatedPage }) => {
    // Assert that the email address input field is visible.
    await expect(signInPage.emailInput).toBeVisible();
    // Assert that the password input field is visible.
    await expect(signInPage.passwordInput).toBeVisible();
    // Assert that the manual sign-in submission button is visible.
    await expect(signInPage.signInButton).toBeVisible();
    // Assert that the Google OAuth authentication button is visible.
    await expect(signInPage.googleButton).toBeVisible();
    // Assert that the LinkedIn OAuth authentication button is visible.
    await expect(signInPage.linkedinButton).toBeVisible();
    // Assert that the Microsoft OAuth authentication button is visible.
    await expect(signInPage.microsoftButton).toBeVisible();
    // Assert that the ORCID OAuth authentication button is visible.
    await expect(signInPage.orcidButton).toBeVisible();
    // Assert that the link to reset a forgotten password is visible.
    await expect(signInPage.forgotPasswordLink).toBeVisible();
    // Assert that the link to create a new account is visible.
    await expect(signInPage.signUpLink).toBeVisible();

    // Capture a screenshot for visual regression testing of the interface elements.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signin/1-interface-elements.png",
    });
  });

  /**
   * Test case to ensure the submit button is not actionable when the form is empty.
   */
  test("should have disabled submit button initially", async ({ unauthenticatedPage }) => {
    // Assert that the sign-in button is disabled upon initial page load.
    await signInPage.expectSubmitDisabled();

    // Capture a screenshot of the initial state for visual verification.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signin/2-initial-state.png",
    });
  });

  /**
   * Test case to verify that the application detects and reports an incorrectly formatted email address.
   */
  test("should show validation error when typing invalid email", async ({
    unauthenticatedPage,
  }) => {
    // Fill the `emailInput` with a string lacking standard email formatting.
    await signInPage.emailInput.fill("invalid-email");
    // Move focus to the password field to trigger validation logic.
    await signInPage.passwordInput.focus();

    // Assert that the correct field-level error message is displayed for `email`.
    await signInPage.form.expectError("email", "Please enter a valid email address.");
    // Assert that the form submission remains disabled due to invalid input.
    await signInPage.expectSubmitDisabled();

    // Capture a screenshot illustrating the validation error state.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signin/3-validation-error.png",
    });
  });

  /**
   * Test case to verify that the password visibility toggle correctly masks and unmasks text.
   */
  test("should toggle password visibility", async ({ unauthenticatedPage }) => {
    // Fill the password field with a test string.
    await signInPage.passwordInput.fill("mortiscope");
    // Assert the field is masked by default.
    await signInPage.expectPasswordHidden();

    // Use the page helper to reveal the password text.
    await signInPage.togglePasswordVisibility();
    // Assert the password text is visible in the DOM.
    await signInPage.expectPasswordVisible();

    // Capture a screenshot showing the unmasked password field.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signin/4-password-visibility.png",
    });
  });

  /**
   * Test case to verify that the application handles unsuccessful login attempts with an error message.
   */
  test("should show error message for invalid credentials", async ({ unauthenticatedPage }) => {
    // Execute a login attempt with invalid account details.
    await signInPage.signInWithCredentials("non-existent@example.com", "WrongPassword123!");
    // Assert that the appropriate error message is displayed to the user.
    await signInPage.expectErrorMessage("Invalid email or password.");

    // Reveal the entered password to ensure visibility in the error state screenshot.
    await signInPage.togglePasswordVisibility();

    // Capture a screenshot of the resulting error message.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signin/5-invalid-credentials.png",
    });
  });

  /**
   * Test case to verify that users with multi-factor authentication are redirected to the security challenge.
   */
  test("should redirect to two-factor page when required", async ({
    unauthenticatedPage,
    workerUser,
  }) => {
    // Skip the test execution if the environment is not configured with a valid user email.
    test.skip(!workerUser.email, "No E2E user configured");

    // Execute a login attempt with valid credentials from the fixture.
    await signInPage.signInWithCredentials(workerUser.email!, workerUser.password);

    // Wait for the browser to navigate to the two-factor authentication route.
    await unauthenticatedPage.waitForURL("**/signin/two-factor", { timeout: 60000 });

    // Assert that the two-factor authentication heading is present on the resulting page.
    await expect(
      unauthenticatedPage.getByRole("heading", { name: "Two-Factor Authentication" })
    ).toBeVisible();

    // Capture a screenshot of the multi-factor authentication prompt.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signin/6-two-factor-redirect.png",
    });
  });

  /**
   * Test case to verify the dynamic enablement of the submit button based on form validity.
   */
  test("should enable submit button when form is valid", async ({ unauthenticatedPage }) => {
    // Enter a validly formatted email.
    await signInPage.emailInput.fill("mortiscope@example.com");
    // Enter a password string.
    await signInPage.passwordInput.fill("password123");

    // Reveal the password text so it appears in the valid form state screenshot.
    await signInPage.togglePasswordVisibility();

    // Assert that the submission button becomes active.
    await signInPage.expectSubmitEnabled();

    // Remove the email value to invalidate the form.
    await signInPage.emailInput.clear();
    // Assert that the submission button is disabled after the clear action.
    await signInPage.expectSubmitDisabled();

    // Restore the valid email value.
    await signInPage.emailInput.fill("mortiscope@example.com");
    // Assert that the submission button is enabled once more.
    await signInPage.expectSubmitEnabled();

    // Capture a screenshot of the valid form state.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signin/7-valid-form-state.png",
    });
  });

  /**
   * Test case to verify the navigation link leading to the password recovery page.
   */
  test("should navigate to forgot password page", async ({ unauthenticatedPage }) => {
    // Simulate a user click on the password recovery link.
    await signInPage.clickForgotPassword();
    // Wait for the browser to navigate to the `**/forgot-password` URL.
    await unauthenticatedPage.waitForURL("**/forgot-password", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    // Assert that the final URL is correct.
    await expect(unauthenticatedPage).toHaveURL(/\/forgot-password/);

    // Capture a screenshot of the password recovery interface.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signin/8-forgot-password-navigation.png",
    });
  });

  /**
   * Test case to verify the navigation link leading from the sign-in page to the registration page.
   */
  test("should navigate to sign up page", async ({ unauthenticatedPage }) => {
    // Simulate a user click on the account creation link.
    await signInPage.clickSignUp();
    // Wait for the browser to navigate to the `**/signup` URL.
    await unauthenticatedPage.waitForURL("**/signup", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    // Assert that the final URL matches the registration route.
    await expect(unauthenticatedPage).toHaveURL(/\/signup/);

    // Capture a screenshot of the registration page after navigation.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signin/9-signup-navigation.png",
    });
  });

  /**
   * Test case to verify that the Google OAuth authentication flow can be triggered.
   */
  test("should initiate google oauth flow", async ({ unauthenticatedPage }) => {
    // Assert the Google provider button is available for interaction.
    await expect(signInPage.googleButton).toBeEnabled();

    // Simulate a user click on the Google authentication button.
    await signInPage.signInWithGoogle();

    // Capture a screenshot of the external authentication redirection.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/signin/10-oauth.png",
    });
  });
});
