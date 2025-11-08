import { expect, Page } from "@playwright/test";

/**
 * Represents a reusable form component to handle common form interactions and assertions.
 */
export class FormComponent {
  // Initializes the component with a reference to the Playwright page object.
  constructor(readonly page: Page) {}

  /**
   * Iterates through a data object to fill multiple input fields based on their name attributes.
   */
  async fill(data: Record<string, string>) {
    // Loop through each key-value pair in the provided data object.
    for (const [key, value] of Object.entries(data)) {
      // Locate the input element using the `name` attribute matching the current key.
      const input = this.page.locator(`[name="${key}"]`);
      // Simulate the user typing the value into the identified input field.
      await input.fill(value);
    }
  }

  /**
   * Simulates a user clicking the form submission button.
   */
  async submit(buttonName: string = "Submit") {
    // Find the button by its accessible role and specified name, then perform a click action.
    await this.page.getByRole("button", { name: buttonName }).click();
  }

  /**
   * Retrieves the inner text of a validation error message associated with a specific field.
   */
  async getErrorMessage(fieldName: string) {
    // Navigate the DOM tree to find the error message within the container of the specified field.
    return await this.page
      .locator('[data-slot="form-item"]')
      .filter({ has: this.page.locator(`[name="${fieldName}"]`) })
      .locator('[data-slot="form-message"]')
      .innerText();
  }

  /**
   * Asserts that a specific form field displays the expected validation error text.
   */
  async expectError(fieldName: string, message: string) {
    // Locate the error message element corresponding to the provided field name.
    const error = this.page
      .locator('[data-slot="form-item"]')
      .filter({ has: this.page.locator(`[name="${fieldName}"]`) })
      .locator('[data-slot="form-message"]');
    // Verify that the element contains the expected error string.
    await expect(error).toContainText(message);
  }

  /**
   * Verifies that a success message is visible on the page after a successful form submission.
   */
  async expectSuccess(message: string) {
    // Assert that the text element representing the success message is present in the viewport.
    await expect(this.page.getByText(message)).toBeVisible();
  }
}
