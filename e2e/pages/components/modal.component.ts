import { expect, Locator, Page } from "@playwright/test";

/**
 * Represents a reusable modal or dialog component to handle interactions within overlay windows.
 */
export class ModalComponent {
  // Define locators for the various structural parts of the dialog component.
  readonly content: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly footer: Locator;
  readonly closeButton: Locator;

  // Initialize the component by mapping internal locators to specific data-slot attributes.
  constructor(readonly page: Page) {
    // Locate the main container for the dialog content.
    this.content = page.locator('[data-slot="dialog-content"]');
    // Locate the element containing the dialog title text.
    this.title = page.locator('[data-slot="dialog-title"]');
    // Locate the element containing the dialog description or body text.
    this.description = page.locator('[data-slot="dialog-description"]');
    // Locate the container for actions, typically located at the bottom of the dialog.
    this.footer = page.locator('[data-slot="dialog-footer"]');
    // Locate the button used to dismiss or close the dialog overlay.
    this.closeButton = page.locator('[data-slot="dialog-close"]');
  }

  /**
   * Asserts that the modal content is currently visible to the user.
   */
  async isVisible() {
    // Verify that the main dialog content locator is present and visible in the DOM.
    await expect(this.content).toBeVisible();
  }

  /**
   * Asserts that the modal content is no longer visible or has been removed from the DOM.
   */
  async isHidden() {
    // Verify that the main dialog content locator is hidden from the user's view.
    await expect(this.content).toBeHidden();
  }

  /**
   * Retrieves the current text content of the dialog title.
   */
  async getTitle() {
    // Return the inner text of the identified title element for validation.
    return await this.title.innerText();
  }

  /**
   * Simulates a user action to close the modal using the designated close button.
   */
  async close() {
    // Trigger a click event on the locator assigned to the close button.
    await this.closeButton.click();
  }

  /**
   * Interacts with a specific button located within the modal footer based on its accessible name.
   */
  async clickButton(name: string) {
    // Scope the search for the button to the footer element to avoid ambiguity with other page elements.
    await this.footer.getByRole("button", { name }).click();
  }
}
