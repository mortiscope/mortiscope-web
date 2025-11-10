import { expect, test } from "@e2e/fixtures";
import { getUserByEmail, getUserTwoFactorSecret } from "@e2e/fixtures/database.fixture";
import { SignInPage } from "@e2e/pages/auth/signin.page";
import { TwoFactorPage } from "@e2e/pages/auth/two-factor.page";
import { generateSync as generate } from "otplib";

// Groups all tests related to the secondary verification step of the authentication process.
test.describe("Two-Factor Authentication Page", () => {
  let signInPage: SignInPage;
  let twoFactorPage: TwoFactorPage;

  // Perform a standard login to reach the 2FA challenge before each test case.
  test.beforeEach(async ({ unauthenticatedPage, workerUser }) => {
    // Add a brief pause to ensure the browser environment is stable before proceeding.
    await unauthenticatedPage.waitForTimeout(3000);

    // Initialize the Page Object Models for sign-in and two-factor interaction.
    signInPage = new SignInPage(unauthenticatedPage);
    twoFactorPage = new TwoFactorPage(unauthenticatedPage);

    // Navigate to the login page and submit valid primary credentials.
    await signInPage.goto();
    await signInPage.signInWithCredentials(workerUser.email!, workerUser.password);

    // Wait for the application to redirect the user to the 2FA input screen.
    await unauthenticatedPage.waitForURL("**/signin/two-factor", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  });

  /**
   * Test case to verify that all 2FA interface components are visible to the user.
   */
  test("should display 2FA form elements", async ({ unauthenticatedPage }) => {
    // Assert that the primary "Two-Factor Authentication" heading is visible.
    await expect(
      unauthenticatedPage.getByRole("heading", { name: "Two-Factor Authentication" })
    ).toBeVisible();
    // Assert that the instructional text regarding the 6-digit code is present.
    await expect(unauthenticatedPage.getByText("Enter the 6-digit code")).toBeVisible();
    // Assert that the verification submission button is rendered.
    await expect(twoFactorPage.verifyButton).toBeVisible();
    // Assert that the link to use a backup recovery code is visible.
    await expect(twoFactorPage.useRecoveryLink).toBeVisible();

    // Capture a screenshot of the 2FA form elements for visual regression.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/two-factor/1-form-elements.png",
    });
  });

  /**
   * Test case to ensure the verification button is not actionable until input is provided.
   */
  test("should have verify button disabled initially", async ({ unauthenticatedPage }) => {
    // Assert that the submit button is in a disabled state upon landing on the page.
    await twoFactorPage.expectSubmitDisabled();

    // Capture a screenshot of the initial disabled state of the form.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/two-factor/2-initial-state.png",
    });
  });

  /**
   * Test case to verify that non-numeric characters do not enable the submission button.
   */
  test("should enforce numeric input", async ({ unauthenticatedPage }) => {
    // Attempt to fill the OTP input field with alphabetical characters.
    await twoFactorPage.fillCode("ABCDEF");

    // Assert that the submission button remains disabled because the input is invalid.
    await twoFactorPage.expectSubmitDisabled();

    // Capture a screenshot documenting the rejection of non-numeric input.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/two-factor/3-numeric-validation.png",
    });
  });

  /**
   * Test case to verify that the application reports an error when an incorrect code is submitted.
   */
  test("should show error for invalid code", async ({ unauthenticatedPage }) => {
    // Fill the input with a validly formatted but incorrect numeric code.
    await twoFactorPage.fillCode("123456");
    // Click the verification button to submit the code.
    await twoFactorPage.submit();
    // Assert that the specific "Invalid verification code" error message appears.
    await twoFactorPage.expectError("Invalid verification code");

    // Capture a screenshot of the resulting error message.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/two-factor/4-invalid-code.png",
    });
  });

  /**
   * Test case to verify successful authentication using a validly generated Time-based One-Time Password (TOTP).
   */
  test("should successfully verify with valid code", async ({
    unauthenticatedPage,
    workerUser,
  }) => {
    // Retrieve the user from the database to access the required identification.
    const user = await getUserByEmail(workerUser.email!);
    if (!user) throw new Error("Test user not found");

    // Access the encrypted 2FA secret associated with the test user from the database.
    const secret = await getUserTwoFactorSecret(user.id);
    if (!secret) throw new Error("2FA secret not found for test user");

    // Generate a valid TOTP token using the secret retrieved from the database.
    const token = generate({ secret });

    // Fill the verification field with the generated token.
    await twoFactorPage.fillCode(token);
    // Submit the code for validation.
    await twoFactorPage.submit();

    // Assert that the application displays a success state.
    await twoFactorPage.expectSuccess();

    // Assert that the button text changes to reflect the transition to the dashboard.
    await expect(twoFactorPage.verifyButton).toHaveText("Redirecting...");

    // Capture a screenshot of the successful verification state.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/two-factor/5-success.png",
    });
  });

  /**
   * Test case to verify the navigation link to the account recovery interface.
   */
  test("should navigate to recovery page", async ({ unauthenticatedPage }) => {
    // Simulate a user clicking the "Use Recovery Code" link.
    await twoFactorPage.useRecoveryLink.click();
    // Wait for the browser to navigate to the sign-in recovery route.
    await unauthenticatedPage.waitForURL("**/signin/recovery", {
      waitUntil: "domcontentloaded",
    });

    // Assert that the "Account Recovery" heading is visible on the new page.
    await expect(
      unauthenticatedPage.getByRole("heading", { name: "Account Recovery" })
    ).toBeVisible();

    // Capture a screenshot of the successful navigation to the recovery page.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/two-factor/6-recovery-navigation.png",
    });
  });
});
