import { BasePage } from "@e2e/pages/base.page";
import { AnalyzeProgressComponent } from "@e2e/pages/components/analyze-progress.component";
import { SidebarComponent } from "@e2e/pages/components/sidebar.component";
import { expect, Locator, Page } from "@playwright/test";

/**
 * Page Object Model representing the Analyze Review page.
 */
export class AnalyzeReviewPage extends BasePage {
  readonly sidebar: SidebarComponent;
  readonly progress: AnalyzeProgressComponent;

  readonly reviewTitle: Locator;
  readonly reviewDescription: Locator;

  readonly imageSummaryTitle: Locator;
  readonly imageSummaryNoImages: Locator;
  readonly imageThumbnails: Locator;
  readonly viewAllOverlay: Locator;

  readonly detailsSummaryTitle: Locator;
  readonly caseNameLabel: Locator;
  readonly temperatureLabel: Locator;
  readonly caseDateLabel: Locator;
  readonly locationLabel: Locator;

  readonly previousButton: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  readonly processingOverlay: Locator;
  readonly processingMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Initialize the shared layout components for sidebar navigation and stepper progress.
    this.sidebar = new SidebarComponent(page);
    this.progress = new AnalyzeProgressComponent(page);

    // Define locators for the primary card header and instructional subtext.
    this.reviewTitle = page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: /^Review and Submit$/ });
    this.reviewDescription = page.getByText(
      "Carefully review the details and images below before finalzing the submission."
    );

    // Set up locators for the image summary section including thumbnails and empty states.
    this.imageSummaryTitle = page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: /^Image Summary$/ });
    this.imageSummaryNoImages = page.getByText("No images were uploaded.");
    this.imageThumbnails = page.locator('img[alt^="Uploaded image"]');
    this.viewAllOverlay = page.getByText("View All");

    // Identify the labels used to verify the summary of text-based analysis details.
    this.detailsSummaryTitle = page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: /^Analysis Details$/ });
    this.caseNameLabel = page.getByText("Case Name", { exact: true });
    this.temperatureLabel = page.getByText("Temperature", { exact: true });
    this.caseDateLabel = page.getByText("Case Date", { exact: true });
    this.locationLabel = page.getByText("Location", { exact: true });

    // Define locators for navigation and action-oriented buttons at the bottom of the form.
    this.previousButton = page.getByRole("button", { name: "Previous" });
    this.submitButton = page.getByRole("button", { name: /Submit|Submitting/ });
    this.cancelButton = page.getByRole("button", { name: /Cancel|Cancelling/ });

    // Target the full-screen overlay and message displayed while the request is being processed.
    this.processingOverlay = page.getByTestId("processing-overlay");
    this.processingMessage = this.processingOverlay.locator("p");
  }

  /**
   * Ensures the review page has finished loading and essential elements are ready for interaction.
   */
  async waitForReviewReady() {
    // Wait for the document to reach the DOMContentLoaded state.
    await this.page.waitForLoadState("domcontentloaded");
    // Ensure the sidebar and main title are visible before proceeding with test steps.
    await Promise.all([
      this.sidebar.sidebar.waitFor({ state: "visible", timeout: 30000 }),
      this.reviewTitle.waitFor({ state: "visible", timeout: 30000 }),
    ]);
  }

  /**
   * Simulates a user interaction to navigate back to the previous data entry step.
   */
  async clickPrevious() {
    // Click the `previousButton` to return to the previous screen.
    await this.previousButton.click();
  }

  /**
   * Simulates a user interaction to finalize and submit the analysis.
   */
  async clickSubmit() {
    // Click the `submitButton` to initiate the submission process.
    await this.submitButton.click();
  }

  /**
   * Simulates a user interaction to cancel the current analysis flow.
   */
  async clickCancel() {
    // Click the `cancelButton` to abort the operation.
    await this.cancelButton.click();
  }

  /**
   * Retrieves the text content for the case name currently displayed in the summary.
   */
  async getCaseNameValue(): Promise<string> {
    // Navigate to the parent container of the label to find the sibling paragraph value.
    const card = this.page.getByText("Case Name", { exact: true }).locator("..");
    const value = card.locator("p.font-normal");
    return (await value.textContent()) ?? "";
  }

  /**
   * Retrieves the text content for the temperature currently displayed in the summary.
   */
  async getTemperatureValue(): Promise<string> {
    // Use the `temperatureLabel` as a reference point to locate the corresponding value field.
    const card = this.page.getByText("Temperature", { exact: true }).locator("..");
    const value = card.locator("p.font-normal");
    return (await value.textContent()) ?? "";
  }

  /**
   * Retrieves the text content for the case date currently displayed in the summary.
   */
  async getCaseDateValue(): Promise<string> {
    // Use the `caseDateLabel` as a reference point to locate the corresponding value field.
    const card = this.page.getByText("Case Date", { exact: true }).locator("..");
    const value = card.locator("p.font-normal");
    return (await value.textContent()) ?? "";
  }

  /**
   * Retrieves the text content for the location currently displayed in the summary.
   */
  async getLocationValue(): Promise<string> {
    // Use the `locationLabel` as a reference point to locate the corresponding value field.
    const card = this.page.getByText("Location", { exact: true }).locator("..");
    const value = card.locator("p.font-normal");
    return (await value.textContent()) ?? "";
  }

  /**
   * Asserts that the main review title is visible on the screen.
   */
  async expectReviewTitleVisible() {
    // Verify visibility of the `reviewTitle` element.
    await expect(this.reviewTitle).toBeVisible();
  }

  /**
   * Asserts that the review description text is visible on the screen.
   */
  async expectReviewDescriptionVisible() {
    // Verify visibility of the `reviewDescription` element.
    await expect(this.reviewDescription).toBeVisible();
  }

  /**
   * Asserts that the image summary container is visible.
   */
  async expectImageSummaryVisible() {
    // Verify visibility of the `imageSummaryTitle` element.
    await expect(this.imageSummaryTitle).toBeVisible();
  }

  /**
   * Asserts that the details summary container is visible.
   */
  async expectDetailsSummaryVisible() {
    // Verify visibility of the `detailsSummaryTitle` element.
    await expect(this.detailsSummaryTitle).toBeVisible();
  }

  /**
   * Asserts that the button to return to the previous page is visible.
   */
  async expectPreviousButtonVisible() {
    // Verify visibility of the `previousButton` element.
    await expect(this.previousButton).toBeVisible();
  }

  /**
   * Asserts that the submission button is visible.
   */
  async expectSubmitButtonVisible() {
    // Verify visibility of the `submitButton` element.
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Asserts that the submission button is enabled and ready for interaction.
   */
  async expectSubmitButtonEnabled() {
    // Verify that the `submitButton` is currently enabled.
    await expect(this.submitButton).toBeEnabled();
  }

  /**
   * Asserts that the submission button is disabled, preventing user interaction.
   */
  async expectSubmitButtonDisabled() {
    // Verify that the `submitButton` is currently disabled.
    await expect(this.submitButton).toBeDisabled();
  }

  /**
   * Asserts that the processing overlay is visible during background tasks.
   */
  async expectProcessingOverlayVisible() {
    // Use a specific timeout to allow the overlay to appear during processing.
    await expect(this.processingOverlay).toBeVisible({ timeout: 15000 });
  }

  /**
   * Asserts that the processing overlay has been removed from view.
   */
  async expectProcessingOverlayHidden() {
    // Use an extended timeout to wait for background submission tasks to complete.
    await expect(this.processingOverlay).toBeHidden({ timeout: 30000 });
  }

  /**
   * Asserts that the cancellation button is visible.
   */
  async expectCancelButtonVisible() {
    // Verify visibility of the `cancelButton` element.
    await expect(this.cancelButton).toBeVisible();
  }

  /**
   * Asserts that the message indicating a lack of uploaded images is displayed.
   */
  async expectNoImagesMessage() {
    // Verify visibility of the `imageSummaryNoImages` element.
    await expect(this.imageSummaryNoImages).toBeVisible();
  }

  /**
   * Counts the total number of image thumbnails currently rendered on the page.
   */
  async getImageThumbnailCount(): Promise<number> {
    // Return the count of elements found by the `imageThumbnails` locator.
    return this.imageThumbnails.count();
  }

  /**
   * Verifies that the displayed case name matches the expected value.
   */
  async expectCaseNameDisplayed(name: string) {
    // Retrieve the actual text value and assert it contains the expected `name`.
    const value = await this.getCaseNameValue();
    expect(value).toContain(name);
  }

  /**
   * Verifies that the displayed temperature matches the expected value.
   */
  async expectTemperatureDisplayed(temp: string) {
    // Retrieve the actual text value and assert it contains the expected `temp`.
    const value = await this.getTemperatureValue();
    expect(value).toContain(temp);
  }
}
