import { expect, test } from "@e2e/fixtures";

// Groups all tests related to the landing page.
test.describe("Landing Page", () => {
  /**
   * Test case to verify that the landing page loads correctly.
   */
  test("should display the landing page", async ({ unauthenticatedPage }) => {
    // Navigate to the root URL.
    await unauthenticatedPage.goto("/");

    // Locate the main hero image and wait for its entrance animation to complete.
    const flyImage = unauthenticatedPage.getByAltText("Chrysomya Megacephala fly");
    // The long timeout is to accommodate the long animation.
    await expect(flyImage).toHaveCSS("opacity", "1", { timeout: 15000 });

    // Add a deliberate pause to ensure any other staggered animations have settled before taking a screenshot.
    await unauthenticatedPage.waitForTimeout(4000);

    // Capture a screenshot for visual regression testing.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/public/landing-page/1-hero.png",
    });

    // Assert that the final URL is correct.
    await expect(unauthenticatedPage).toHaveURL("/");
  });

  /**
   * Test case to verify that the "Sign In" link is visible and correctly navigates the user to the sign-in page.
   */
  test("should have sign in link and navigate to sign in page", async ({ unauthenticatedPage }) => {
    // Navigate to the root URL.
    await unauthenticatedPage.goto("/");

    // Find the sign-in link by its accessible role and name.
    const signInLink = unauthenticatedPage.getByRole("link", {
      name: /sign in/i,
    });
    await expect(signInLink).toBeVisible();

    // Simulate a user click on the link.
    await signInLink.click();
    // Wait for the browser to navigate to the /signin URL.
    await unauthenticatedPage.waitForURL("**/signin", { waitUntil: "domcontentloaded" });

    // Capture a screenshot of the resulting page for visual verification.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/public/landing-page/2-signin-navigation.png",
    });
  });

  /**
   * Test case to verify that the primary call-to-action button (Start Analysis)
   * is visible and correctly navigates an unauthenticated user to the sign-up page.
   */
  test("should have start analysis button and navigate to signup page", async ({
    unauthenticatedPage,
  }) => {
    // Navigate to the root URL.
    await unauthenticatedPage.goto("/");

    // Find the "Start Analysis" link/button.
    const startAnalysisButton = unauthenticatedPage.getByRole("link", {
      name: /start analysis/i,
    });
    await expect(startAnalysisButton).toBeVisible();

    // Simulate a user click.
    await startAnalysisButton.click();
    // Wait for the browser to navigate to the /signup URL.
    await unauthenticatedPage.waitForURL("**/signup", { waitUntil: "domcontentloaded" });

    // Capture a screenshot of the resulting page for visual verification.
    await unauthenticatedPage.screenshot({
      path: "e2e/test-results/public/landing-page/3-signup-navigation.png",
    });
  });
});
