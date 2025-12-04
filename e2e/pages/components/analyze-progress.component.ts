import { expect, Locator, Page } from "@playwright/test";

/**
 * Page Object Model representing the Analyze Progress component.
 */
export class AnalyzeProgressComponent {
  readonly nav: Locator;
  readonly stepList: Locator;
  readonly analysisDetailsStep: Locator;
  readonly provideImageStep: Locator;
  readonly reviewSubmitStep: Locator;

  constructor(readonly page: Page) {
    // Locate the main navigation container by its accessible role and name.
    this.nav = page.getByRole("navigation", { name: "Progress" });
    // Target the unordered list element that holds the individual step items.
    this.stepList = this.nav.getByRole("list");
    // Define locators for each specific step based on their display text.
    this.analysisDetailsStep = this.nav.getByText("Analysis Details");
    this.provideImageStep = this.nav.getByText("Provide an Image");
    this.reviewSubmitStep = this.nav.getByText("Review and Submit");
  }

  /**
   * Asserts that the progress navigation component is visible to the user.
   */
  async expectVisible() {
    // Verify visibility of the `nav` element.
    await expect(this.nav).toBeVisible();
  }

  /**
   * Asserts that a specific step is currently displayed in the progress bar.
   */
  async expectActiveStep(stepName: "Analysis Details" | "Provide an Image" | "Review and Submit") {
    // Find the step by the provided `stepName` and verify its visibility.
    const step = this.nav.getByText(stepName);
    await expect(step).toBeVisible();
  }

  /**
   * Simulates a user click on a specific step in the progress navigation.
   */
  async clickStep(stepName: "Analysis Details" | "Provide an Image" | "Review and Submit") {
    // Locate the step by its text and simulate a click to navigate.
    await this.nav.getByText(stepName).click();
  }

  /**
   * Retrieves the total number of steps rendered within the progress list.
   */
  async getStepCount(): Promise<number> {
    // Count the number of list item elements within the `stepList`.
    return this.stepList.locator("li").count();
  }

  /**
   * Verifies that the total number of steps matches the expected count.
   */
  async expectStepCount(count: number) {
    // Retrieve the actual count and assert its equality to the expected `count`.
    const actualCount = await this.getStepCount();
    expect(actualCount).toBe(count);
  }
}
