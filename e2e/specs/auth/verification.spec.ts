import { expect, test } from "@e2e/fixtures";
import {
  createVerificationToken,
  deleteVerificationToken,
  getUserByEmail,
  restoreUserVerified,
  setUserUnverified,
} from "@e2e/fixtures/database.fixture";
import { VerificationPage } from "@e2e/pages/auth/verification.page";

// Groups all tests related to the email verification landing page and token processing.
test.describe("Verification Page", () => {
  let verificationPage: VerificationPage;

  // Initialize the Page Object Model before each test execution.
  test.beforeEach(async ({ unauthenticatedPage }) => {
    // Use the unauthenticated page fixture to initialize the verification page object.
    verificationPage = new VerificationPage(unauthenticatedPage);
  });

  /**
   * Test case to verify that accessing the verification route without a token displays the correct informational state.
   */
  test("should show info message when visiting without token", async ({ unauthenticatedPage }) => {
    // Navigate to the verification page URL without any query parameters.
    await verificationPage.goto();
    // Assert that the UI displays the instructions for users arriving without a token.
    await verificationPage.expectMissingTokenState();

    // Capture a screenshot of the informational landing state.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/verification/1-missing-token.png",
    });
  });

  /**
   * Test case to verify that an unrecognized or malformed token triggers an error message.
   */
  test("should show error for invalid token", async ({ unauthenticatedPage }) => {
    // Navigate to the verification page using a non-existent token string.
    await verificationPage.goto("invalid-token-123");
    // Assert that the interface reports the token as invalid or expired.
    await verificationPage.expectInvalidTokenError();

    // Capture a screenshot of the invalid token error state.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/verification/2-invalid-token.png",
    });
  });

  /**
   * Test case to verify successful email verification when a valid token is provided.
   */
  test("should show success message with valid token", async ({
    unauthenticatedPage,
    workerUser,
  }) => {
    // Retrieve the current user state from the database to facilitate restoration later.
    const user = await getUserByEmail(workerUser.email);
    const originalVerified = user?.emailVerified;

    // Manually set the user's verification status to null in the database.
    await setUserUnverified(workerUser.email);
    // Generate a legitimate verification token for the test user in the database.
    const token = await createVerificationToken(workerUser.email);

    try {
      // Navigate to the verification route using the freshly created token.
      await verificationPage.goto(token);
      // Wait for a few seconds to allow backend processing and UI updates to settle.
      await unauthenticatedPage.waitForTimeout(3000);
      // Assert that the success message is displayed to the user.
      await verificationPage.expectSuccess("Email successfully verified.");
      // Assert that the button to continue to sign-in is visible.
      await expect(verificationPage.proceedToSignInButton).toBeVisible();

      // Capture a screenshot of the successful verification state.
      await unauthenticatedPage.screenshot({
        path: "e2e/test-results/auth/verification/3-success.png",
      });
    } finally {
      // Remove the temporary verification token from the database.
      await deleteVerificationToken(token);
      // Restore the user's original verification timestamp if it existed before the test.
      if (originalVerified) {
        await restoreUserVerified(workerUser.email, originalVerified);
      }
    }
  });

  /**
   * Test case to verify the navigation link leading from the verification error state back to the root URL.
   */
  test("should navigate back to homepage from error state", async ({ unauthenticatedPage }) => {
    // Trigger an error state by providing an invalid token.
    await verificationPage.goto("invalid-token-123");
    // Simulate a user click on the link to return to the homepage.
    await verificationPage.backToHomeButton.click();
    // Wait for the browser to navigate back to the root URL.
    await unauthenticatedPage.waitForURL("**/", { waitUntil: "domcontentloaded" });

    // Locate a specific hero element on the landing page to confirm successful navigation.
    const flyImage = unauthenticatedPage.getByAltText("Chrysomya Megacephala fly");
    // Assert that the homepage image is visible and its entrance animation has completed.
    await expect(flyImage).toHaveCSS("opacity", "1", { timeout: 15000 });
    // Pause briefly to ensure the visual state of the landing page is fully settled.
    await unauthenticatedPage.waitForTimeout(4000);

    // Capture a screenshot of the homepage following navigation from the verification screen.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/auth/verification/4-back-to-homepage.png",
    });
  });
});
