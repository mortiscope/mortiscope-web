import { expect, Locator, Page } from "@playwright/test";

/**
 * Utility function to ensure the basic HTML document has been completely loaded and parsed.
 */
export async function waitForPageReady(page: Page) {
  // Wait for the 'domcontentloaded' event to ensure the DOM tree is ready for interaction.
  await page.waitForLoadState("domcontentloaded");
}

/**
 * Monitors a specific CSS property on a locator until it matches the expected value, signaling an animation has finished.
 */
export async function waitForAnimationEnd(
  locator: Locator,
  cssProperty: string = "opacity",
  value: string = "1",
  timeout: number = 10000
) {
  // Assert that the element reaches the target CSS state within the specified time limit.
  await expect(locator).toHaveCSS(cssProperty, value, { timeout });
}

/**
 * Synchronizes the test with the browser URL after a client-side transition in a Single Page Application (SPA).
 */
export async function waitForSpaURL(page: Page, url: string | RegExp) {
  // Wait for the URL to change and the new content to be parsed without requiring a full page reload.
  await page.waitForURL(url, { waitUntil: "domcontentloaded" });
}

/**
 * Intercepts and waits for a specific network response based on a partial or regular expression URL match.
 */
export async function waitForResponse(page: Page, urlPart: string | RegExp) {
  // Listen for background network traffic and resolve when a response URL matches the provided criteria.
  return page.waitForResponse((resp) =>
    typeof urlPart === "string" ? resp.url().includes(urlPart) : urlPart.test(resp.url())
  );
}
