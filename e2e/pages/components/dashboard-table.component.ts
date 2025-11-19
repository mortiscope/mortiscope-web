import { ModalComponent } from "@e2e/pages/components/modal.component";
import { expect, Locator, Page } from "@playwright/test";

/**
 * Component object model representing the data table on the dashboard, including its filtering and pagination.
 */
export class DashboardTableComponent {
  readonly searchInput: Locator;
  readonly columnsButton: Locator;
  readonly deleteButton: Locator;
  readonly emptyStateText: Locator;
  readonly modal: ModalComponent;

  readonly firstPageButton: Locator;
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly lastPageButton: Locator;

  constructor(readonly page: Page) {
    // Locate the search input field by its placeholder text.
    this.searchInput = page.getByPlaceholder("Search cases...");
    // Identify the button used to open the column visibility menu.
    this.columnsButton = page.getByRole("button", { name: "Columns" });
    // Locate the delete action button for bulk row removal.
    this.deleteButton = page.getByRole("button", { name: "Delete" });
    // Identify the text displayed when the table contains no data.
    this.emptyStateText = page.getByText("No Cases Found");
    // Initialize the shared modal component used for table-related confirmations.
    this.modal = new ModalComponent(page);

    // Locate the individual pagination control buttons by their accessible names.
    this.firstPageButton = page.getByRole("button", { name: "Go to first page" }).first();
    this.previousPageButton = page.getByRole("button", { name: "Go to previous page" }).first();
    this.nextPageButton = page.getByRole("button", { name: "Go to next page" }).first();
    this.lastPageButton = page.getByRole("button", { name: "Go to last page" }).first();
  }

  /**
   * Performs a search operation by filling the search input with a specific query.
   */
  async search(query: string) {
    // Fill the `searchInput` locator with the provided `query` string.
    await this.searchInput.fill(query);
  }

  /**
   * Clears all text from the search input field.
   */
  async clearSearch() {
    // Simulate a user clearing the content of the search field.
    await this.searchInput.clear();
  }

  /**
   * Toggles the visibility of a specific table column via the column menu.
   */
  async toggleColumn(columnLabel: string) {
    // Click the columns dropdown button to reveal the options.
    await this.columnsButton.click();
    // Locate and click the menu item matching the specified `columnLabel`.
    await this.page.getByRole("menuitem", { name: columnLabel }).click();
  }

  /**
   * Clicks the detail view button for a specific row in the table.
   */
  async clickViewCase(index: number = 0) {
    // Identify all buttons intended for viewing case details.
    const viewButtons = this.page.getByRole("button", { name: "View case details" });
    // Simulate a click on the button at the specified `index`.
    await viewButtons.nth(index).click();
  }

  /**
   * Selects a specific row by clicking its checkbox locator.
   */
  async selectRow(index: number = 0) {
    // Target the checkbox element located within a specific table row index.
    const checkboxes = this.page.locator("table tbody tr").nth(index).getByRole("checkbox");
    // Simulate a user checking the row selection box.
    await checkboxes.click();
  }

  /**
   * Triggers the deletion process for all currently selected table rows.
   */
  async clickDeleteSelected() {
    // Click the delete button to initiate the removal of selected records.
    await this.deleteButton.click();
  }

  /**
   * Navigates the table to the first page of results.
   */
  async goToFirstPage() {
    // Click the first page pagination control.
    await this.firstPageButton.click();
  }

  /**
   * Navigates the table to the previous page of results.
   */
  async goToPreviousPage() {
    // Click the previous page pagination control.
    await this.previousPageButton.click();
  }

  /**
   * Navigates the table to the next page of results.
   */
  async goToNextPage() {
    // Click the next page pagination control.
    await this.nextPageButton.click();
  }

  /**
   * Navigates the table to the final page of results.
   */
  async goToLastPage() {
    // Click the last page pagination control.
    await this.lastPageButton.click();
  }

  /**
   * Retrieves the total count of rows currently rendered in the table body.
   */
  async getRowCount(): Promise<number> {
    // Count the number of `tr` elements within the table body.
    return this.page.locator("table tbody tr").count();
  }

  /**
   * Retrieves the status text indicating how many rows are currently selected.
   */
  async getSelectedRowCount(): Promise<string> {
    // Locate the text element describing row selection status using a regular expression.
    const text = await this.page
      .getByText(/\d+ of \d+ row\(s\) selected/)
      .first()
      .textContent();
    // Return the text content or an empty string if the element is not found.
    return text ?? "";
  }

  /**
   * Retrieves the status text indicating the current pagination state.
   */
  async getPaginationText(): Promise<string> {
    // Locate the text element describing the current page index and total pages.
    const text = await this.page
      .getByText(/Page \d+ of \d+/)
      .first()
      .textContent();
    // Return the text content or an empty string if the element is not found.
    return text ?? "";
  }

  /**
   * Asserts that a column header with the specified text is visible in the table.
   */
  async expectColumnVisible(headerText: string) {
    // Verify visibility of the `columnheader` matching the `headerText`.
    await expect(this.page.getByRole("columnheader", { name: headerText })).toBeVisible();
  }

  /**
   * Asserts that a column header with the specified text is not visible in the table.
   */
  async expectColumnHidden(headerText: string) {
    // Verify that the `columnheader` matching the `headerText` is hidden from the UI.
    await expect(this.page.getByRole("columnheader", { name: headerText })).toBeHidden();
  }

  /**
   * Asserts that search results are highlighted within the table view.
   */
  async expectSearchResultsHighlighted() {
    // Check for the presence of the specific CSS class used for highlighting search matches.
    await expect(this.page.locator(".bg-emerald-200").first()).toBeVisible();
  }

  /**
   * Asserts that the empty state message is displayed to the user.
   */
  async expectEmptyState() {
    // Verify that the `emptyStateText` locator is visible.
    await expect(this.emptyStateText).toBeVisible();
  }

  /**
   * Asserts that the bulk delete button is visible on the page.
   */
  async expectDeleteButtonVisible() {
    // Verify the visibility of the `deleteButton`.
    await expect(this.deleteButton).toBeVisible();
  }

  /**
   * Asserts that the bulk delete button is hidden or removed from the page.
   */
  async expectDeleteButtonHidden() {
    // Verify that the `deleteButton` is not visible to the user.
    await expect(this.deleteButton).not.toBeVisible();
  }
}
