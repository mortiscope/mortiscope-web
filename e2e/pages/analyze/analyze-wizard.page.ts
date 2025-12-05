import { AnalyzeDetailsPage } from "@e2e/pages/analyze/analyze-details.page";
import { AnalyzeReviewPage } from "@e2e/pages/analyze/analyze-review.page";
import { AnalyzeUploadPage } from "@e2e/pages/analyze/analyze-upload.page";
import { BasePage } from "@e2e/pages/base.page";
import { AnalyzeProgressComponent } from "@e2e/pages/components/analyze-progress.component";
import { SidebarComponent } from "@e2e/pages/components/sidebar.component";
import { expect, Page } from "@playwright/test";
import path from "path";

/**
 * Page Object Model representing the Analyze Wizard.
 */
export class AnalyzeWizardPage extends BasePage {
  readonly sidebar: SidebarComponent;
  readonly progress: AnalyzeProgressComponent;
  readonly details: AnalyzeDetailsPage;
  readonly upload: AnalyzeUploadPage;
  readonly review: AnalyzeReviewPage;

  readonly assetsDir: string;

  constructor(page: Page) {
    super(page);

    // Initialize the shared layout components and the specific pages that constitute the wizard steps.
    this.sidebar = new SidebarComponent(page);
    this.progress = new AnalyzeProgressComponent(page);
    this.details = new AnalyzeDetailsPage(page);
    this.upload = new AnalyzeUploadPage(page);
    this.review = new AnalyzeReviewPage(page);

    // Define the absolute path to the local directory containing test assets like images.
    this.assetsDir = path.resolve(__dirname, "../../assets");
  }

  /**
   * Navigates the browser to the root analyze route and waits for the initial DOM to load.
   */
  async goto() {
    // Navigate to the `/analyze` URL.
    await this.page.goto("/analyze", { waitUntil: "domcontentloaded" });
  }

  /**
   * Ensures the wizard container is ready for interaction by checking the sidebar and form loading states.
   */
  async waitForWizardReady() {
    // Wait for the document to be loaded.
    await this.page.waitForLoadState("domcontentloaded");
    // Confirm the sidebar navigation is visible.
    await this.sidebar.sidebar.waitFor({ state: "visible", timeout: 30000 });
    // Verify that the details form has completed its internal data fetching or initialization.
    await this.details.expectFormLoadingComplete();
  }

  /**
   * Constructs a full file system path for a given asset filename.
   */
  getAssetPath(fileName: string): string {
    // Combine the `assetsDir` with the provided `fileName` using the platform-specific separator.
    return path.join(this.assetsDir, fileName);
  }

  /**
   * Clears the local storage to reset any cached wizard state or progress.
   */
  async resetWizardState() {
    // Execute a script within the browser context to remove the `analyze-storage` key.
    await this.page.evaluate(() => {
      localStorage.removeItem("analyze-storage");
    });
  }

  /**
   * Automates the completion of the Details step by filling all required case information and proceeding.
   */
  async fillDetailsAndContinue(data: {
    caseName: string;
    temperature: string;
    region: string;
    province: string;
    city: string;
    barangay: string;
  }) {
    // Use the details page fixture to input the case name.
    await this.details.fillCaseName(data.caseName);
    // Automatically set the case time to the current browser time.
    await this.details.toggleCurrentDate();
    // Input the environmental temperature and set the unit.
    await this.details.fillTemperature(data.temperature);
    await this.details.selectTemperatureUnit("°C");
    // Select the geographical hierarchy, adding pauses to accommodate cascaded dropdown population.
    await this.details.selectRegion(data.region);
    await this.page.waitForTimeout(1000);
    await this.details.selectProvince(data.province);
    await this.page.waitForTimeout(1000);
    await this.details.selectCity(data.city);
    await this.page.waitForTimeout(1000);
    await this.details.selectBarangay(data.barangay);
    // Brief pause to ensure state synchronization before submission.
    await this.page.waitForTimeout(500);
    // Click the button to save data and move to the upload step.
    await this.details.clickSaveAndContinue();
  }

  /**
   * Automates the Image Upload step by resolving file paths, uploading them, and proceeding.
   */
  async uploadImagesAndContinue(fileNames: string[]) {
    // Map the array of file names to their respective absolute paths on the system.
    const filePaths = fileNames.map((name) => this.getAssetPath(name));
    // Trigger the file upload process through the upload page fixture.
    await this.upload.uploadFiles(filePaths);
    // Wait for the server-side processing of all files to finish.
    await this.upload.waitForAllFilesUploaded(fileNames);
    // Navigate to the review step.
    await this.upload.clickNext();
  }

  /**
   * Asserts that the wizard is currently displaying the Details step.
   */
  async expectOnDetailsStep() {
    // Verify visibility of the card title belonging to the `details` section.
    await expect(this.details.cardTitle).toBeVisible();
  }

  /**
   * Asserts that the wizard is currently displaying the Upload step.
   */
  async expectOnUploadStep() {
    // Verify visibility of the card title belonging to the `upload` section.
    await expect(this.upload.cardTitle).toBeVisible();
  }

  /**
   * Asserts that the wizard is currently displaying the Review step.
   */
  async expectOnReviewStep() {
    // Verify visibility of the title belonging to the `review` section.
    await expect(this.review.reviewTitle).toBeVisible();
  }

  /**
   * Verifies that the browser page title contains the expected string.
   */
  async expectPageTitle(expectedTitle: string) {
    // Retrieve the current document title from the browser.
    const title = await this.page.title();
    // Assert that the `title` contains the `expectedTitle` substring.
    expect(title).toContain(expectedTitle);
  }
}
