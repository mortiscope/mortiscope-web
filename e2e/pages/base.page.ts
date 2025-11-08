import type { Locator, Page } from "@playwright/test";

/**
 * Base Page Object Model providing shared utility methods for all page instances.
 */
export class BasePage {
  readonly page: Page;

  /**
   * Initializes the base page with a Playwright page instance.
   */
  constructor(page: Page) {
    // Store the page instance for use in derived classes and utility methods.
    this.page = page;
  }

  /**
   * Navigates the browser to a specific application path.
   */
  async goto(path: string) {
    // Navigate the current page to the provided string path.
    await this.page.goto(path);
  }

  /**
   * Retrieves the current document title from the browser.
   */
  async getTitle(): Promise<string> {
    // Return the string value of the browser window title.
    return this.page.title();
  }

  /**
   * Pauses execution until the network activity has ceased.
   */
  async waitForPageLoad() {
    // Wait for the `networkidle` state to ensure all resources have finished loading.
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Pauses execution until the browser URL matches a specific pattern.
   */
  async waitForUrl(urlPattern: string | RegExp) {
    // Wait for the page URL to match the provided string or regular expression.
    await this.page.waitForURL(urlPattern);
  }

  /**
   * Performs a click action and simultaneously waits for a navigation event to occur.
   */
  async clickAndWaitForNavigation(locator: Locator) {
    // Use `Promise.all` to ensure the navigation listener is active before the click is performed.
    await Promise.all([this.page.waitForNavigation(), locator.click()]);
  }

  /**
   * Captures the current visual state of the page and saves it to the results directory.
   */
  async takeScreenshot(name: string) {
    // Save a PNG file to the `e2e/test-results/` directory using the provided name.
    await this.page.screenshot({ path: `e2e/test-results/${name}.png` });
  }

  /**
   * Determines if a specific element is currently visible in the viewport.
   */
  async isVisible(locator: Locator): Promise<boolean> {
    // Return a boolean indicating the visibility state of the targeted element.
    return locator.isVisible();
  }

  /**
   * Retrieves the text content of a targeted element.
   */
  async getText(locator: Locator): Promise<string | null> {
    // Extract the text content from the element identified by the locator.
    return locator.textContent();
  }

  /**
   * Creates a locator for an element based on its `data-testid` attribute.
   */
  getByTestId(testId: string): Locator {
    // Target the element using the framework-standard test identifier.
    return this.page.getByTestId(testId);
  }

  /**
   * Creates a locator for an element based on its accessible ARIA role and attributes.
   */
  getByRole(
    role: Parameters<Page["getByRole"]>[0],
    options?: Parameters<Page["getByRole"]>[1]
  ): Locator {
    // Target the element by its functional role and optional filtering criteria.
    return this.page.getByRole(role, options);
  }

  /**
   * Creates a locator for an element containing specific text or matching a pattern.
   */
  getByText(text: string | RegExp): Locator {
    // Target the element by its visible text content.
    return this.page.getByText(text);
  }
}
