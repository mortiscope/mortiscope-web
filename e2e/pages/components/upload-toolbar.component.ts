import { expect, Locator, Page } from "@playwright/test";

/**
 * Page Object Model representing the toolbar used to manage and organize uploaded files.
 */
export class UploadToolbarComponent {
  readonly searchInput: Locator;
  readonly sortButton: Locator;
  readonly viewModeToggle: Locator;
  readonly listViewButton: Locator;
  readonly gridViewButton: Locator;

  /**
   * Initializes the locators for the search, sort, and view mode controls.
   */
  constructor(readonly page: Page) {
    // Find the search input field by its placeholder text.
    this.searchInput = page.getByPlaceholder("Search files...");
    // Find the button that opens the sorting options menu.
    this.sortButton = page.getByRole("button", { name: "Sort options" });
    // Locate the container for view mode selection using its accessible label.
    this.viewModeToggle = page.locator('[aria-label="View mode"]');
    // Find the radio button option for enabling list view.
    this.listViewButton = page.getByRole("radio", { name: "List view" });
    // Find the radio button option for enabling grid view.
    this.gridViewButton = page.getByRole("radio", { name: "Grid view" });
  }

  /**
   * Performs a file search by entering text into the search input.
   */
  async search(query: string) {
    // Fill the `searchInput` with the specified `query` string.
    await this.searchInput.fill(query);
  }

  /**
   * Removes all text from the search input field.
   */
  async clearSearch() {
    // Use the clear method on the `searchInput` to empty the field.
    await this.searchInput.clear();
  }

  /**
   * Triggers the appearance of the sorting dropdown menu.
   */
  async openSortMenu() {
    // Simulate a user click on the `sortButton`.
    await this.sortButton.click();
  }

  /**
   * Opens the sort menu and selects a specific sorting criteria.
   */
  async selectSortOption(option: string) {
    // Open the sort menu first to make options interactive.
    await this.openSortMenu();
    // Click the specific menu item matching the provided `option` name.
    await this.page.getByRole("menuitem", { name: option }).click();
  }

  /**
   * Changes the file display layout to a list format.
   */
  async switchToListView() {
    // Simulate a user selection of the `listViewButton`.
    await this.listViewButton.click();
  }

  /**
   * Changes the file display layout to a grid format.
   */
  async switchToGridView() {
    // Simulate a user selection of the `gridViewButton`.
    await this.gridViewButton.click();
  }

  /**
   * Verifies that the search input is rendered and visible.
   */
  async expectSearchVisible(timeout = 15000) {
    // Assert that the `searchInput` is visible within the given `timeout`.
    await expect(this.searchInput).toBeVisible({ timeout });
  }

  /**
   * Verifies that the sort button is rendered and visible.
   */
  async expectSortButtonVisible(timeout = 15000) {
    // Assert that the `sortButton` is visible within the given `timeout`.
    await expect(this.sortButton).toBeVisible({ timeout });
  }

  /**
   * Verifies that the view mode toggle group is rendered and visible.
   */
  async expectViewModeToggleVisible(timeout = 15000) {
    // Assert that the `viewModeToggle` is visible within the given `timeout`.
    await expect(this.viewModeToggle).toBeVisible({ timeout });
  }

  /**
   * Verifies that the empty state message is displayed when no files match the current criteria.
   */
  async expectNoFilesFound() {
    // Assert that the specific "No Files Found" text is visible on the page.
    await expect(this.page.getByText("No Files Found")).toBeVisible();
  }
}
