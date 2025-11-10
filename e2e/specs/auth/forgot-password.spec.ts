import { expect, test } from "@e2e/fixtures";
import { ForgotPasswordPage } from "@e2e/pages/auth/forgot-password.page";

// Groups all tests related to the password recovery interface.
test.describe("Forgot Password Page", () => {
  let forgotPasswordPage: ForgotPasswordPage;

  // Initialize the Page Object Model and navigate to the recovery route before each test.
  test.beforeEach(async ({ unauthenticatedPage }) => {
    // Use the unauthenticated page fixture to initialize the forgot password page object.
    forgotPasswordPage = new ForgotPasswordPage(unauthenticatedPage);
    // Navigate to the password recovery URL.
    await forgotPasswordPage.goto();
  });

  /**
   * Test case to verify that all necessary interface components are rendered on the forgot password page.
   */
  test("should display all forgot password elements", async ({ unauthenticatedPage }) => {
    // Assert that the email address input field is visible.
    await expect(forgotPasswordPage.emailInput).toBeVisible();
    // Assert that the button to request a reset link is visible.
    await expect(forgotPasswordPage.sendResetLinkButton).toBeVisible();
    // Assert that the link to return to the sign-in page is visible.
    await expect(forgotPasswordPage.backToSignInLink).toBeVisible();

    // Capture a screenshot for visual regression testing of the recovery interface.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/forgot-password/1-interface-elements.png",
    });
  });

  /**
   * Test case to ensure the submit button is not actionable when the email field is empty.
   */
  test("should have disabled submit button initially", async ({ unauthenticatedPage }) => {
    // Assert that the reset link button is disabled upon initial page load.
    await forgotPasswordPage.expectSubmitDisabled();

    // Capture a screenshot of the initial disabled state.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/forgot-password/2-initial-state.png",
    });
  });

  /**
   * Test case to verify that the application detects and reports an incorrectly formatted email address.
   */
  test("should show validation error for invalid email format", async ({ unauthenticatedPage }) => {
    // Fill the `emailInput` with a string lacking standard email formatting.
    await forgotPasswordPage.emailInput.fill("invalid-email");
    // Trigger validation logic by removing focus from the email field.
    await forgotPasswordPage.emailInput.blur();

    // Assert that the correct field-level error message is displayed for `email`.
    await forgotPasswordPage.form.expectError("email", "Please enter a valid email address.");
    // Assert that the form submission remains disabled due to invalid input.
    await forgotPasswordPage.expectSubmitDisabled();

    // Capture a screenshot illustrating the validation error.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/forgot-password/3-invalid-email.png",
    });
  });

  /**
   * Test case to verify the success response when a valid, registered email is submitted.
   */
  test("should show success message for existing email", async ({ unauthenticatedPage }) => {
    // Submit a valid email address that exists in the system.
    await forgotPasswordPage.submitEmail("mortiscope@example.com");

    // Assert that the application displays a confirmation message for the sent link.
    await forgotPasswordPage.expectSuccessMessage("A password reset link has been sent.");

    // Capture a screenshot of the success confirmation state.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/forgot-password/4-success-existing-email.png",
    });
  });

  /**
   * Test case to verify that the application provides a neutral success message for non-existent emails to prevent user enumeration.
   */
  test("should show success message for non-existent email", async ({ unauthenticatedPage }) => {
    // Submit an email address that is not registered in the database.
    await forgotPasswordPage.submitEmail("non-existent@example.com");

    // Assert that the same success message is displayed to maintain security privacy.
    await forgotPasswordPage.expectSuccessMessage("A password reset link has been sent.");

    // Capture a screenshot showing the neutral response for non-existent users.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/forgot-password/5-success-non-existing-email.png",
    });
  });

  /**
   * Test case to verify the navigation link leading back to the authentication entrance.
   */
  test("should navigate back to sign in page", async ({ unauthenticatedPage }) => {
    // Simulate a user click on the back-to-signin link.
    await forgotPasswordPage.clickBackToSignIn();
    // Wait for the browser to navigate to the `**/signin` URL.
    await unauthenticatedPage.waitForURL("**/signin", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    // Assert that the final URL matches the sign-in route.
    await expect(unauthenticatedPage).toHaveURL(/\/signin/);

    // Capture a screenshot of the sign-in page after navigation.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/forgot-password/6-back-to-signin.png",
    });
  });
});
