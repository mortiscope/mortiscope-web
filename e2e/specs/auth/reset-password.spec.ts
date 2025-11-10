import { expect, test } from "@e2e/fixtures";
import { ResetPasswordPage } from "@e2e/pages/auth/reset-password.page";

// Groups all tests related to the password reset flow using security tokens.
test.describe("Reset Password Page", () => {
  let resetPasswordPage: ResetPasswordPage;

  // Initialize the Page Object Model before each test execution.
  test.beforeEach(async ({ unauthenticatedPage }) => {
    // Use the unauthenticated page fixture to initialize the reset password page object.
    resetPasswordPage = new ResetPasswordPage(unauthenticatedPage);
  });

  /**
   * Test case to verify that accessing the reset route without a token parameter triggers an error state.
   */
  test("should show error when visiting without token", async ({ unauthenticatedPage }) => {
    // Navigate to the reset password page without providing a `token` query parameter.
    await resetPasswordPage.goto();
    // Assert that the interface displays the invalid token error message.
    await resetPasswordPage.expectInvalidTokenError();
    // Assert that the new password input field is hidden from the user.
    await expect(resetPasswordPage.newPasswordInput).not.toBeVisible();

    // Capture a screenshot of the error state for a missing token.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/reset-password/1-missing-token.png",
    });
  });

  /**
   * Test case to verify that all form elements are correctly rendered when a token is present in the URL.
   */
  test("should display all elements with valid token format", async ({ unauthenticatedPage }) => {
    // Navigate to the reset page using a placeholder token string.
    await resetPasswordPage.goto("fake-token-123");

    // Assert that the main page heading is visible.
    await expect(resetPasswordPage.pageTitle).toBeVisible();
    // Assert that the instructional text is visible.
    await expect(resetPasswordPage.pageDescription).toBeVisible();
    // Assert that the new password input field is rendered.
    await expect(resetPasswordPage.newPasswordInput).toBeVisible();
    // Assert that the password confirmation input field is rendered.
    await expect(resetPasswordPage.confirmNewPasswordInput).toBeVisible();
    // Assert that the submission button is rendered.
    await expect(resetPasswordPage.resetPasswordButton).toBeVisible();
    // Assert that the helpful secondary text for active sessions is visible.
    await expect(resetPasswordPage.noLongerNeedToResetText).toBeVisible();
    // Assert that the navigation link back to the sign-in page is visible.
    await expect(resetPasswordPage.backToSignInLink).toBeVisible();

    // Capture a screenshot of the fully rendered reset password form.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/reset-password/2-form-visible.png",
    });
  });

  /**
   * Test case to verify client-side validation for password matching and complexity.
   */
  test("should validate password requirements", async ({ unauthenticatedPage }) => {
    // Navigate to the reset page with a placeholder token.
    await resetPasswordPage.goto("fake-token-123");

    // Enter validly formatted but mismatched passwords in the input fields.
    await resetPasswordPage.newPasswordInput.fill("Password123!");
    await resetPasswordPage.confirmNewPasswordInput.fill("Mismatch123!");
    // Remove focus from the field to trigger the validation check.
    await resetPasswordPage.confirmNewPasswordInput.blur();

    // Assert that the `confirmNewPassword` field displays the mismatch error message.
    await resetPasswordPage.form.expectError("confirmNewPassword", "New passwords do not match.");
    // Assert that the user cannot submit the form with mismatched passwords.
    await resetPasswordPage.expectSubmitDisabled();

    // Reveal the text to document the mismatch in the visual artifacts.
    await resetPasswordPage.togglePasswordVisibility();
    // Capture a screenshot of the password mismatch validation error.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/reset-password/3-validation-mismatch.png",
    });

    // Enter strings that fail the minimum length or complexity requirements.
    await resetPasswordPage.newPasswordInput.fill("weak");
    await resetPasswordPage.confirmNewPasswordInput.fill("weak");
    // Trigger validation logic by blurring the input.
    await resetPasswordPage.confirmNewPasswordInput.blur();

    // Assert that the primary password field displays a complexity error message.
    await resetPasswordPage.form.expectError("newPassword", "");
    // Assert that the submission button remains disabled.
    await resetPasswordPage.expectSubmitDisabled();

    // Reveal the input text for the screenshot.
    await resetPasswordPage.togglePasswordVisibility();

    // Capture a screenshot of the password complexity validation errors.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/reset-password/4-validation-errors.png",
    });
  });

  /**
   * Test case to verify that the server-side validation correctly rejects invalid tokens upon submission.
   */
  test("should show invalid token error on submission", async ({ unauthenticatedPage }) => {
    // Navigate to the reset page using a token that the server will reject.
    await resetPasswordPage.goto("invalid-token-abc");

    // Attempt to submit a validly formatted password.
    await resetPasswordPage.submitPassword("NewPassword123!");

    // Assert that the application displays a global error for the invalid token.
    await resetPasswordPage.expectErrorMessage("Invalid token provided.");

    // Toggle the visibility for visual confirmation of the input state.
    await resetPasswordPage.togglePasswordVisibility();

    // Capture a screenshot of the server-side rejection error.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/reset-password/5-server-invalid-token.png",
    });
  });

  /**
   * Test case to verify the navigation path from the invalid link state back to the forgot password page.
   */
  test("should navigate to forgot password from invalid link page", async ({
    unauthenticatedPage,
  }) => {
    // Access the page in an invalid state without a token.
    await resetPasswordPage.goto();
    // Simulate a user click on the link to request a new reset email.
    await resetPasswordPage.goToForgotPasswordLink.click();

    // Wait for the browser to navigate back to the `**/forgot-password` route.
    await unauthenticatedPage.waitForURL("**/forgot-password", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    // Assert that the final URL matches the password recovery route.
    await expect(unauthenticatedPage).toHaveURL(/\/forgot-password/);

    // Capture a screenshot of the successful navigation back to the forgot password page.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/reset-password/6-forgot-password-navigation.png",
    });
  });
});
