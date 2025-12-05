import { BasePage } from "@e2e/pages/base.page";
import { AnalyzeProgressComponent } from "@e2e/pages/components/analyze-progress.component";
import { SidebarComponent } from "@e2e/pages/components/sidebar.component";
import { UploadDropzoneComponent } from "@e2e/pages/components/upload-dropzone.component";
import { UploadMethodTabsComponent } from "@e2e/pages/components/upload-method-tabs.component";
import { UploadToolbarComponent } from "@e2e/pages/components/upload-toolbar.component";
import { expect, Locator, Page } from "@playwright/test";

/**
 * Page Object Model representing the Analyze Upload page.
 */
export class AnalyzeUploadPage extends BasePage {
  readonly sidebar: SidebarComponent;
  readonly progress: AnalyzeProgressComponent;
  readonly dropzone: UploadDropzoneComponent;
  readonly tabs: UploadMethodTabsComponent;
  readonly toolbar: UploadToolbarComponent;

  readonly cardTitle: Locator;
  readonly cardDescription: Locator;
  readonly previousButton: Locator;
  readonly nextButton: Locator;
  readonly supportedFormatsLink: Locator;
  readonly supportedFormatsModalTitle: Locator;
  readonly supportedFormatsGotItButton: Locator;

  constructor(page: Page) {
    super(page);

    // Initialize sub-components related to navigation and upload functionality.
    this.sidebar = new SidebarComponent(page);
    this.progress = new AnalyzeProgressComponent(page);
    this.dropzone = new UploadDropzoneComponent(page);
    this.tabs = new UploadMethodTabsComponent(page);
    this.toolbar = new UploadToolbarComponent(page);

    // Identify the main card headers and descriptions.
    this.cardTitle = page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: /^Provide an Image$/ });
    this.cardDescription = page.getByText(
      "Choose to upload an image file or take a new one with your device's camera."
    );

    // Locate the primary workflow navigation buttons.
    this.previousButton = page.getByRole("button", { name: "Previous", exact: true });
    this.nextButton = page.getByRole("button", { name: "Next", exact: true });

    // Target elements within the supported formats help modal.
    this.supportedFormatsLink = page.getByRole("button", { name: "here" });
    this.supportedFormatsModalTitle = page.getByText("Supported File Formats");
    this.supportedFormatsGotItButton = page.getByRole("button", { name: "Got It" });
  }

  /**
   * Waits for the upload page and the dropzone component to be fully ready for interaction.
   */
  async waitForUploadReady() {
    // Ensure the document state is ready before checking component visibility.
    await this.page.waitForLoadState("domcontentloaded");
    // Wait for the sidebar and main title to appear with specific timeouts for data loading.
    await Promise.all([
      this.sidebar.sidebar.waitFor({ state: "visible", timeout: 30000 }),
      this.cardTitle.waitFor({ state: "visible", timeout: 60000 }),
    ]);
    // Ensure the dropzone component logic is fully initialized.
    await this.dropzone.waitForReady();
  }

  /**
   * Performs a batch upload of multiple files using the dropzone component.
   */
  async uploadFiles(filePaths: string[]) {
    // Ensure the dropzone is ready before attempting to inject files.
    await this.dropzone.waitForReady();
    // Use the `dropzone` fixture to process the array of `filePaths`.
    await this.dropzone.uploadFiles(filePaths);
  }

  /**
   * Performs an upload of a single file using the dropzone component.
   */
  async uploadFile(filePath: string) {
    // Ensure the dropzone is ready before attempting to inject the file.
    await this.dropzone.waitForReady();
    // Use the `dropzone` fixture to process the specific `filePath`.
    await this.dropzone.uploadFile(filePath);
  }

  /**
   * Navigates the user to the previous step in the analysis flow.
   */
  async clickPrevious() {
    // Simulate a user click on the `previousButton`.
    await this.previousButton.click();
  }

  /**
   * Navigates the user to the next step in the analysis flow.
   */
  async clickNext() {
    // Simulate a user click on the `nextButton`.
    await this.nextButton.click();
  }

  /**
   * Opens the informational modal containing details about supported image formats.
   */
  async openSupportedFormatsModal() {
    // Click the inline link to trigger the modal visibility.
    await this.supportedFormatsLink.click();
  }

  /**
   * Dismisses the supported formats informational modal.
   */
  async closeSupportedFormatsModal() {
    // Click the confirmation button within the modal to close it.
    await this.supportedFormatsGotItButton.click();
  }

  /**
   * Calculates the number of files currently successfully uploaded and listed.
   */
  async getUploadedFileCount(): Promise<number> {
    // Locate all view buttons which represent individual uploaded items.
    const viewButtons = this.page.locator('div[role="button"][aria-label^="View "]');
    return viewButtons.count();
  }

  /**
   * Removes a specific file from the upload list by its file name.
   */
  async removeFile(fileName: string) {
    // Locate the specific removal button using the `fileName` in the accessible name.
    await this.page
      .getByRole("button", { name: `Remove ${fileName}` })
      .first()
      .click();
  }

  /**
   * Iteratively removes all uploaded files from the list until it is empty.
   */
  async deleteAllFiles() {
    // Locate all rendered file items.
    const allViewButtons = this.page.locator('div[role="button"][aria-label^="View "]');

    let remaining = await allViewButtons.count();

    // If no buttons are found immediately, perform a short wait to account for lazy rendering.
    if (remaining === 0) {
      try {
        await allViewButtons.first().waitFor({ state: "visible", timeout: 5000 });
        remaining = await allViewButtons.count();
      } catch {
        return;
      }
    }

    const maxAttempts = remaining + 5;
    let attempts = 0;

    // Execute a loop to click removal buttons until no files remain or the safety limit is reached.
    while (remaining > 0 && attempts < maxAttempts) {
      attempts++;

      const removeBtn = this.page.getByRole("button", { name: /^Remove / }).first();
      if ((await removeBtn.count()) === 0) break;

      const ariaLabel = await removeBtn.getAttribute("aria-label");
      if (!ariaLabel) break;
      const fileName = ariaLabel.replace(/^Remove\s+/, "");
      const specificViewBtn = this.page.locator(
        `div[role="button"][aria-label="View ${fileName}"]`
      );

      // Wait for the button to be interactable to prevent animation-related click failures.
      try {
        await expect(removeBtn).toBeEnabled({ timeout: 30000 });
      } catch {
        remaining = await allViewButtons.count();
        continue;
      }

      await removeBtn.click();

      // Confirm the specific file was removed from the DOM before proceeding.
      try {
        await expect(specificViewBtn).toHaveCount(0, { timeout: 30000 });
      } catch {
        await this.page.waitForTimeout(1000);
      }

      // Add a small delay to allow the layout to settle between deletions.
      await this.page.waitForTimeout(300);
      remaining = await allViewButtons.count();
    }

    // Final assertion that all file items have been cleared.
    await expect(allViewButtons).toHaveCount(0, { timeout: 15000 });
  }

  /**
   * Waits for a specific file to finish the server-side upload process.
   */
  async waitForFileUploaded(fileName: string, timeout: number = 90000) {
    // Wait for the individual file control to become visible in the list.
    await this.page
      .getByRole("button", { name: `Remove ${fileName}` })
      .first()
      .waitFor({ state: "visible", timeout });

    // Locate the container to check for the successful status indicator.
    const fileItemContainer = this.page
      .locator(`div[role="button"][aria-label="View ${fileName}"]`)
      .first()
      .locator("xpath=..");

    // Assert that the upload success icon or label is rendered.
    await expect(fileItemContainer.locator('[aria-label="Upload successful"]')).toBeVisible({
      timeout,
    });
  }

  /**
   * Sequentially waits for a list of file names to complete their upload state.
   */
  async waitForAllFilesUploaded(fileNames: string[], timeout: number = 60000) {
    for (const name of fileNames) {
      await this.waitForFileUploaded(name, timeout);
    }
  }

  /**
   * Asserts that the page's main card title is visible.
   */
  async expectCardTitleVisible() {
    // Verify visibility of the `cardTitle` locator.
    await expect(this.cardTitle).toBeVisible();
  }

  /**
   * Asserts that the page's instruction description is visible.
   */
  async expectCardDescriptionVisible() {
    // Verify visibility of the `cardDescription` locator.
    await expect(this.cardDescription).toBeVisible();
  }

  /**
   * Asserts that the previous step navigation button is visible.
   */
  async expectPreviousButtonVisible() {
    // Verify visibility of the `previousButton` locator.
    await expect(this.previousButton).toBeVisible();
  }

  /**
   * Asserts that the next step navigation button is visible.
   */
  async expectNextButtonVisible() {
    // Verify visibility of the `nextButton` locator.
    await expect(this.nextButton).toBeVisible();
  }

  /**
   * Asserts that the next step button is currently locked.
   */
  async expectNextButtonDisabled() {
    // Verify the `nextButton` is in a disabled state, usually occurring before any files are uploaded.
    await expect(this.nextButton).toBeDisabled();
  }

  /**
   * Asserts that the next step button is interactable.
   */
  async expectNextButtonEnabled() {
    // Verify the `nextButton` is in an enabled state, allowing progression to the next step.
    await expect(this.nextButton).toBeEnabled();
  }

  /**
   * Asserts that the supported formats modal and its required content are visible.
   */
  async expectSupportedFormatsModalVisible() {
    // Verify the modal title and required format descriptions are rendered for the user.
    await expect(this.supportedFormatsModalTitle).toBeVisible();
    await expect(
      this.page.getByText("Please upload an image in one of the approved formats.")
    ).toBeVisible();
    await expect(this.page.getByText("JPEG / JPG")).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "PNG" })).toBeVisible();
    await expect(this.page.getByText("WebP")).toBeVisible();
    await expect(this.page.getByText("HEIF / HEIC")).toBeVisible();
  }

  /**
   * Asserts that the supported formats modal has been dismissed.
   */
  async expectSupportedFormatsModalHidden() {
    // Verify that the `supportedFormatsModalTitle` is no longer present in the viewport.
    await expect(this.supportedFormatsModalTitle).toBeHidden();
  }

  /**
   * Asserts that a specific file is visible in the list of uploaded items.
   */
  async expectFileVisible(fileName: string, timeout: number = 30000) {
    // Verify that a view button containing the `fileName` is displayed within the timeout.
    await expect(this.page.getByRole("button", { name: `View ${fileName}` }).first()).toBeVisible({
      timeout,
    });
  }

  /**
   * Asserts that a specific file has been removed from the list of uploaded items.
   */
  async expectFileRemoved(fileName: string) {
    // Verify that the view button for the specified `fileName` is hidden or removed from the DOM.
    await expect(this.page.getByRole("button", { name: `View ${fileName}` }).first()).toBeHidden();
  }

  /**
   * Asserts that a success notification toast is displayed for a specific file upload.
   */
  async waitForUploadSuccessToast(fileName: string, timeout: number = 30000) {
    // Sanitize the file name to be used safely within a regular expression.
    const escapedFileName = fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Locate the sonner toast containing the file name and the upload success message.
    const successToast = this.page
      .locator("[data-sonner-toast]")
      .filter({ hasText: new RegExp(`${escapedFileName}\\s+uploaded\\.?`, "i") })
      .first();

    // Verify the toast becomes visible within the specified `timeout`.
    await expect(successToast).toBeVisible({ timeout });
  }
}
