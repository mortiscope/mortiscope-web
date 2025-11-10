import { expect, test } from "@e2e/fixtures";
import {
  createRecoveryCode,
  deleteRecoveryCode,
  getUserByEmail,
} from "@e2e/fixtures/database.fixture";
import { RecoveryPage } from "@e2e/pages/auth/recovery.page";
import { SignInPage } from "@e2e/pages/auth/signin.page";

// Groups all tests related to the account recovery process using backup codes.
test.describe("Recovery Page", () => {
  let recoveryPage: RecoveryPage;
  let signInPage: SignInPage;

  // Initialize the required Page Object Models before each test execution.
  test.beforeEach(async ({ unauthenticatedPage }) => {
    // Use the unauthenticated page fixture to initialize the recovery page object.
    recoveryPage = new RecoveryPage(unauthenticatedPage);
    // Use the unauthenticated page fixture to initialize the sign-in page object.
    signInPage = new SignInPage(unauthenticatedPage);
  });

  /**
   * Test case to verify that the recovery route is protected and redirects to login if no 2FA session exists.
   */
  test("should redirect to signin when visiting without 2FA session", async ({
    unauthenticatedPage,
  }) => {
    // Attempt to navigate directly to the recovery URL.
    await recoveryPage.goto();
    // Wait for the application to redirect the browser to the sign-in URL.
    await unauthenticatedPage.waitForURL("**/signin**", { waitUntil: "domcontentloaded" });
    // Assert that the user is presented with the sign-in page heading.
    await expect(unauthenticatedPage.getByRole("heading", { level: 1 })).toHaveText(
      "Welcome back!"
    );

    // Capture a screenshot of the redirect behavior for visual verification.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/recovery/1-redirect-to-signin.png",
    });
  });

  /**
   * Test case to verify that the recovery form becomes accessible after a successful initial login for 2FA users.
   */
  test("should display recovery form after signing in with 2FA user", async ({
    unauthenticatedPage,
    workerUser,
  }) => {
    // Navigate to the sign-in page.
    await signInPage.goto();
    // Perform the first stage of authentication with valid credentials.
    await signInPage.signInWithCredentials(workerUser.email, workerUser.password);
    // Wait for the browser to reach the two-factor authentication challenge.
    await unauthenticatedPage.waitForURL("**/signin/two-factor**", {
      waitUntil: "domcontentloaded",
    });

    // Locate the link to switch from TOTP/SMS to recovery code entry.
    const useRecoveryLink = unauthenticatedPage.getByRole("link", { name: "Use Recovery Code" });
    // Simulate a user clicking the link to access the recovery form.
    await useRecoveryLink.click();
    // Wait for the browser to navigate to the recovery code input route.
    await unauthenticatedPage.waitForURL("**/signin/recovery**", {
      waitUntil: "domcontentloaded",
    });

    // Assert that the recovery form elements are visible and in the correct state.
    await recoveryPage.expectFormState();

    // Capture a screenshot of the accessible recovery interface.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/recovery/2-form-state.png",
    });
  });

  /**
   * Test case to verify that the application correctly handles and reports an invalid recovery code.
   */
  test("should show error for invalid recovery code", async ({
    unauthenticatedPage,
    workerUser,
  }) => {
    // Navigate to the sign-in page.
    await signInPage.goto();
    // Authenticate to reach the two-factor challenge.
    await signInPage.signInWithCredentials(workerUser.email, workerUser.password);
    // Wait for the 2FA screen to load.
    await unauthenticatedPage.waitForURL("**/signin/two-factor**", {
      waitUntil: "domcontentloaded",
    });

    // Navigate to the recovery code entry screen.
    const useRecoveryLink = unauthenticatedPage.getByRole("link", { name: "Use Recovery Code" });
    await useRecoveryLink.click();
    await unauthenticatedPage.waitForURL("**/signin/recovery**", {
      waitUntil: "domcontentloaded",
    });

    // Input an arbitrarily incorrect recovery code.
    await recoveryPage.fillRecoveryCode("ABCD1234");
    // Submit the code for verification.
    await recoveryPage.submit();

    // Find the error message element using a regex that covers possible error strings.
    const errorLocator = unauthenticatedPage.getByText(
      /Invalid recovery code|No recovery codes available|Too many attempts/,
      { exact: false }
    );
    // Assert that a relevant error message becomes visible to the user.
    await expect(errorLocator).toBeVisible({ timeout: 60000 });

    // Capture a screenshot of the invalid code error message.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/recovery/3-invalid-code.png",
    });
  });

  /**
   * Test case to verify successful authentication using a freshly generated recovery code.
   */
  test("should successfully authenticate with valid recovery code", async ({
    unauthenticatedPage,
    workerUser,
  }) => {
    // Fetch the user record from the database to obtain the required ID.
    const user = await getUserByEmail(workerUser.email);
    // Ensure the test user exists before proceeding.
    if (!user) throw new Error("Test user not found");

    // Create a temporary valid recovery code in the database for this user.
    const testCode = "TEST1234";
    const { id: codeId, plaintextCode } = await createRecoveryCode(user.id, testCode);

    try {
      // Navigate to sign-in and authenticate.
      await signInPage.goto();
      await signInPage.signInWithCredentials(workerUser.email, workerUser.password);
      await unauthenticatedPage.waitForURL("**/signin/two-factor**", {
        waitUntil: "domcontentloaded",
      });

      // Navigate to the recovery code input screen.
      const useRecoveryLink = unauthenticatedPage.getByRole("link", { name: "Use Recovery Code" });
      await useRecoveryLink.click();
      await unauthenticatedPage.waitForURL("**/signin/recovery**", {
        waitUntil: "domcontentloaded",
      });

      // Fill the form with the plaintext version of the generated test code.
      await recoveryPage.fillRecoveryCode(plaintextCode);
      // Submit the valid code.
      await recoveryPage.submit();

      // Assert that the success state or redirect occurs as expected.
      await recoveryPage.expectSuccess();

      // Pause briefly to allow any success animations or transitions to complete.
      await unauthenticatedPage.waitForTimeout(3000);
      // Capture a screenshot of the successful recovery state.
      await unauthenticatedPage.screenshot({
        path: "e2e/test-results/auth/recovery/4-success.png",
      });
    } finally {
      // Ensure the temporary test code is removed from the database regardless of the test outcome.
      await deleteRecoveryCode(codeId);
    }
  });

  /**
   * Test case to verify that the system rejects recovery codes that have been previously marked as consumed.
   */
  test("should show error for already used recovery code", async ({
    unauthenticatedPage,
    workerUser,
  }) => {
    // Fetch the user record from the database.
    const user = await getUserByEmail(workerUser.email);
    if (!user) throw new Error("Test user not found");

    // Create a recovery code in the database that is already flagged as used.
    const testCode = "USED1234";
    const { id: codeId, plaintextCode } = await createRecoveryCode(user.id, testCode, true);

    try {
      // Navigate to sign-in and authenticate to reach the 2FA stage.
      await signInPage.goto();
      await signInPage.signInWithCredentials(workerUser.email, workerUser.password);
      await unauthenticatedPage.waitForURL("**/signin/two-factor**", {
        waitUntil: "domcontentloaded",
      });

      // Navigate to the recovery entry screen.
      const useRecoveryLink = unauthenticatedPage.getByRole("link", { name: "Use Recovery Code" });
      await useRecoveryLink.click();
      await unauthenticatedPage.waitForURL("**/signin/recovery**", {
        waitUntil: "domcontentloaded",
      });

      // Attempt to submit the already consumed code.
      await recoveryPage.fillRecoveryCode(plaintextCode);
      await recoveryPage.submit();

      // Assert that the application explicitly informs the user the code is no longer valid.
      await expect(
        unauthenticatedPage.getByText("This recovery code has already been used", { exact: false })
      ).toBeVisible({ timeout: 60000 });

      // Capture a screenshot of the used code error message.
      await unauthenticatedPage.screenshot({
        path: "e2e/test-results/auth/recovery/5-used-code.png",
      });
    } finally {
      // Clean up the used test code from the database.
      await deleteRecoveryCode(codeId);
    }
  });

  /**
   * Test case to verify the functionality of the "Back to Sign In" link within the recovery flow.
   */
  test("should navigate back to signin from recovery form", async ({
    unauthenticatedPage,
    workerUser,
  }) => {
    // Navigate to sign-in and reach the 2FA challenge.
    await signInPage.goto();
    await signInPage.signInWithCredentials(workerUser.email, workerUser.password);
    await unauthenticatedPage.waitForURL("**/signin/two-factor**", {
      waitUntil: "domcontentloaded",
    });

    // Navigate to the recovery input screen.
    const useRecoveryLink = unauthenticatedPage.getByRole("link", { name: "Use Recovery Code" });
    await useRecoveryLink.click();
    await unauthenticatedPage.waitForURL("**/signin/recovery**", {
      waitUntil: "domcontentloaded",
    });

    // Simulate a user click on the link to return to the beginning of the sign-in process.
    await recoveryPage.backToSignInLink.click();
    // Wait for the browser to navigate back to the main sign-in route.
    await unauthenticatedPage.waitForURL("**/signin", { waitUntil: "domcontentloaded" });
    // Assert that the sign-in page heading is visible.
    await expect(unauthenticatedPage.getByRole("heading", { level: 1 })).toHaveText(
      "Welcome back!"
    );

    // Capture a screenshot of the successful navigation back to the sign-in page.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/recovery/6-back-to-signin.png",
    });
  });
});
