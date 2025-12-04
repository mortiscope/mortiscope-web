import { expect, Locator, Page } from "@playwright/test";

/**
 * Page Object Model representing the upload dropzone component and its associated interactions.
 */
export class UploadDropzoneComponent {
  readonly dropzone: Locator;
  readonly fileInput: Locator;
  readonly uploadTabText: Locator;
  readonly cameraTabText: Locator;

  /**
   * Initializes the locators for the upload dropzone component.
   */
  constructor(readonly page: Page) {
    // Locate the dropzone container using its specific border styling classes.
    this.dropzone = page.locator(".border-dashed, .border-emerald-300, .border-solid").first();
    // Locate the hidden file input element within the dropzone.
    this.fileInput = this.dropzone.locator('input[type="file"]');
    // Find the text label for the device upload tab.
    this.uploadTabText = page.getByText("Upload from Device");
    // Find the text label for the camera upload tab.
    this.cameraTabText = page.getByText("Use Camera");
  }

  /**
   * Ensures the component is fully loaded and interactive before proceeding with test steps.
   */
  async waitForReady() {
    // Wait for the upload tab text to become visible within the interface.
    await this.uploadTabText.waitFor({ state: "visible", timeout: 15000 });
    // Verify that the `fileInput` is enabled and ready to receive files.
    await expect(this.fileInput).toBeEnabled({ timeout: 15000 });
  }

  /**
   * Handles the selection and attachment of multiple files to the input element.
   */
  async uploadFiles(filePaths: string[]) {
    // Set the provided `filePaths` array onto the file input element.
    await this.fileInput.setInputFiles(filePaths);
  }

  /**
   * Handles the selection and attachment of a single file to the input element.
   */
  async uploadFile(filePath: string) {
    // Set the single provided `filePath` onto the file input element.
    await this.fileInput.setInputFiles(filePath);
  }

  /**
   * Verifies that the option to upload from the device is displayed to the user.
   */
  async expectUploadFromDeviceVisible() {
    // Assert that the `uploadTabText` element is visible in the viewport.
    await expect(this.uploadTabText).toBeVisible();
  }

  /**
   * Verifies that a warning message is displayed when details need to be saved before uploading.
   */
  async expectSaveDetailsFirstVisible() {
    // Assert that the text indicating details must be saved first is visible.
    await expect(this.page.getByText("Save Details First")).toBeVisible();
  }

  /**
   * Verifies that the error message for reaching the maximum allowed files is displayed.
   */
  async expectMaxFilesReached() {
    // Assert that the text indicating the maximum file limit has been reached is visible.
    await expect(this.page.getByText("Maximum files reached")).toBeVisible();
  }

  /**
   * Verifies the general visibility of the dropzone interaction area.
   */
  async expectDropzoneVisible() {
    // Assert that the `dropzone` container is visible on the page.
    await expect(this.dropzone).toBeVisible();
  }
}
