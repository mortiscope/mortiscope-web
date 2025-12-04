import { expect, Locator, Page } from "@playwright/test";

/**
 * Page Object Model representing the tab navigation for selecting between different image upload methods.
 */
export class UploadMethodTabsComponent {
  readonly uploadTab: Locator;
  readonly cameraTab: Locator;

  /**
   * Initializes the locators for the individual tabs within the component.
   */
  constructor(readonly page: Page) {
    // Locate the tab for uploading images by its accessible role and descriptive name.
    this.uploadTab = page.getByRole("tab", { name: /Upload Image/i });
    // Locate the tab for using the device camera by its accessible role and descriptive name.
    this.cameraTab = page.getByRole("tab", { name: /Use Camera/i });
  }

  /**
   * Performs a user click to switch to the image upload interface.
   */
  async selectUploadTab() {
    // Simulate a user click on the upload tab.
    await this.uploadTab.click();
  }

  /**
   * Performs a user click to switch to the camera capture interface.
   */
  async selectCameraTab() {
    // Simulate a user click on the camera tab.
    await this.cameraTab.click();
  }

  /**
   * Verifies that the upload tab is present and visible to the user.
   */
  async expectUploadTabVisible() {
    // Assert that the `uploadTab` locator is visible on the page.
    await expect(this.uploadTab).toBeVisible();
  }

  /**
   * Verifies that the camera tab is present and visible to the user.
   */
  async expectCameraTabVisible() {
    // Assert that the `cameraTab` locator is visible on the page.
    await expect(this.cameraTab).toBeVisible();
  }

  /**
   * Verifies that the upload tab is currently selected and active.
   */
  async expectUploadTabActive() {
    // Assert that the `data-state` attribute is set to `active` for the upload tab.
    await expect(this.uploadTab).toHaveAttribute("data-state", "active");
  }

  /**
   * Verifies that the camera tab is currently selected and active.
   */
  async expectCameraTabActive() {
    // Assert that the `data-state` attribute is set to `active` for the camera tab.
    await expect(this.cameraTab).toHaveAttribute("data-state", "active");
  }
}
