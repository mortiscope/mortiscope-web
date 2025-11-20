import { BasePage } from "@e2e/pages/base.page";
import { MetricsGridComponent } from "@e2e/pages/components/dashboard-metrics-grid.component";
import { DashboardTableComponent } from "@e2e/pages/components/dashboard-table.component";
import { SidebarComponent } from "@e2e/pages/components/sidebar.component";
import { expect, Locator, Page } from "@playwright/test";

/**
 * Page Object Model representing the Dashboard page and its associated interactions.
 */
export class DashboardPage extends BasePage {
  readonly welcomeHeading: Locator;
  readonly firstNameText: Locator;
  readonly timePeriodFilterButton: Locator;
  readonly dateRangePickerButton: Locator;
  readonly metricsGrid: MetricsGridComponent;
  readonly table: DashboardTableComponent;
  readonly sidebar: SidebarComponent;

  readonly forensicInsightsTitle: Locator;
  readonly verificationStatusTitle: Locator;
  readonly qualityMetricsTitle: Locator;

  readonly forensicInsightsCard: Locator;
  readonly verificationStatusCard: Locator;
  readonly qualityMetricsCard: Locator;
  readonly qualityMetricsInfoButton: Locator;
  readonly qualityMetricsChangeViewButton: Locator;

  readonly sidebarDashboardLink: Locator;
  readonly sidebarAnalyzeLink: Locator;
  readonly sidebarResultsLink: Locator;
  readonly sidebarAccountLink: Locator;
  readonly sidebarSignOutButton: Locator;
  readonly sidebarLogo: Locator;

  readonly headerPageTitle: Locator;
  readonly headerUserAvatar: Locator;

  constructor(page: Page) {
    super(page);

    // Initialize the main welcome heading locator by its role and text content.
    this.welcomeHeading = page.getByRole("heading", { level: 1 }).filter({ hasText: "Welcome," });
    // Target the specific span containing the user name within the welcome heading.
    this.firstNameText = this.welcomeHeading.locator("span").nth(1);
    // Locate the button used to trigger the time period filter dropdown.
    this.timePeriodFilterButton = page.getByRole("button", { name: "Time period filter" });
    // Find the date range picker button using a regular expression to match various month names or the default placeholder.
    this.dateRangePickerButton = page
      .locator("button")
      .filter({ hasText: /Pick a date|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/ })
      .first();
    // Initialize child components for the metrics grid, data table, and sidebar.
    this.metricsGrid = new MetricsGridComponent(page);
    this.table = new DashboardTableComponent(page);
    this.sidebar = new SidebarComponent(page);

    // Define locators for the titles of the various analytical cards.
    this.forensicInsightsTitle = page.getByText("Life Stage Distribution").first();
    this.verificationStatusTitle = page.getByText("Case Verification Status").first();
    // Locate the quality metrics title based on a specific data attribute and multiple possible text values.
    this.qualityMetricsTitle = page
      .locator('[data-slot="card-title"]')
      .filter({
        hasText: /Model Performance by Stage|User Correction Ratio|Confidence Score Distribution/,
      })
      .first();

    // Identify the main card containers by their test ID attributes.
    this.forensicInsightsCard = page.locator('[data-testid="forensic-insights-card"]');
    this.verificationStatusCard = page.locator('[data-testid="verification-status-card"]');
    this.qualityMetricsCard = page.locator('[data-testid="quality-metrics-card"]');
    // Define locators for interactive buttons within the quality metrics card.
    this.qualityMetricsInfoButton = this.qualityMetricsCard.getByRole("button", {
      name: "Information",
    });
    this.qualityMetricsChangeViewButton = this.qualityMetricsCard.getByRole("button", {
      name: "Change view",
    });

    // Initialize locators for navigation links within the sidebar based on their href attributes.
    this.sidebarDashboardLink = page.locator('a[href="/dashboard"]');
    this.sidebarAnalyzeLink = page.locator('a[href="/analyze"]');
    this.sidebarResultsLink = page.locator('a[href="/results"]');
    this.sidebarAccountLink = page.locator('a[href="/account"]');
    // Locate the sign out button using a regular expression to handle different label states.
    this.sidebarSignOutButton = page.getByRole("button", { name: /Sign Out|Signing Out/ });
    this.sidebarLogo = page.getByAltText("Mortiscope Logo");

    // Define locators for elements located within the page header.
    this.headerPageTitle = page.locator("header").getByRole("heading", { level: 1 });
    this.headerUserAvatar = page.locator("header img[alt]");
  }

  /**
   * Navigates the browser directly to the dashboard URL.
   */
  async goto() {
    // Navigate the browser to the `/dashboard` route.
    await this.page.goto("/dashboard");
  }

  /**
   * Waits for the essential dashboard elements to be visible and interactive.
   */
  async waitForDashboardReady() {
    // Wait for the initial DOM content to be fully loaded.
    await this.page.waitForLoadState("domcontentloaded");

    // Execute multiple wait conditions in parallel to ensure the sidebar and main header elements are ready.
    await Promise.all([
      this.sidebar.sidebar.waitFor({ state: "visible", timeout: 30000 }),
      this.welcomeHeading.waitFor({ state: "visible", timeout: 30000 }),
      this.timePeriodFilterButton.waitFor({ state: "visible", timeout: 15000 }),
    ]);
  }

  /**
   * Selects a specific time period from the filter dropdown menu.
   */
  async selectTimePeriod(period: "All-time" | "Past Year" | "Past Month" | "Past Week") {
    // Ensure the filter button is within the viewport before attempting to click.
    await this.timePeriodFilterButton.scrollIntoViewIfNeeded();
    // Click the button to open the time period menu.
    await this.timePeriodFilterButton.click();
    // Locate the specific menu item corresponding to the desired period.
    const menuItem = this.page.getByRole("menuitem", { name: period });
    // Wait for the menu item to become visible to the user.
    await menuItem.waitFor({ state: "visible", timeout: 5000 });
    // Use a dispatched click event to trigger the selection.
    await menuItem.dispatchEvent("click");
  }

  /**
   * Opens the calendar date range picker interface.
   */
  async openDateRangePicker() {
    // Simulate a user click on the date range picker button.
    await this.dateRangePickerButton.click();
  }

  /**
   * Clicks the reset button within the date range picker.
   */
  async clickDateRangeReset() {
    // Locate and click the button labeled "Reset" within the picker.
    await this.page.getByRole("button", { name: "Reset" }).click();
  }

  /**
   * Applies the currently selected date range.
   */
  async clickDateRangeApply() {
    // Locate and click the button labeled "Apply" to confirm the date selection.
    await this.page.getByRole("button", { name: "Apply" }).click();
  }

  /**
   * Changes the active view for the Forensic Insights card.
   */
  async changeForensicInsightsView(
    view: "Life Stage Distribution" | "PMI Distribution" | "Sampling Density"
  ) {
    // Open the view selection menu within the forensic insights card.
    await this.forensicInsightsCard.getByRole("button", { name: "Change view" }).click();
    // Select the requested view from the menu items.
    await this.page.getByRole("menuitem", { name: view }).click();
  }

  /**
   * Changes the active view for the Verification Status card.
   */
  async changeVerificationStatusView(
    view: "Case Verification Status" | "Image Verification Status" | "Detection Verification Status"
  ) {
    // Open the view selection menu within the verification status card.
    await this.verificationStatusCard.getByRole("button", { name: "Change view" }).click();
    // Select the requested view from the menu items.
    await this.page.getByRole("menuitem", { name: view }).click();
  }

  /**
   * Changes the active view for the Quality Metrics card.
   */
  async changeQualityMetricsView(
    view: "Model Performance by Stage" | "User Correction Ratio" | "Confidence Score Distribution"
  ) {
    // Click the change view button specifically for the quality metrics component.
    await this.qualityMetricsChangeViewButton.click();
    // Select the requested view from the menu items.
    await this.page.getByRole("menuitem", { name: view }).click();
  }

  /**
   * Opens the information tooltip or modal for the Forensic Insights card.
   */
  async openForensicInsightsInfo() {
    // Click the information button located inside the forensic insights card.
    await this.forensicInsightsCard.getByRole("button", { name: "Information" }).click();
  }

  /**
   * Opens the information tooltip or modal for the Verification Status card.
   */
  async openVerificationStatusInfo() {
    // Click the information button located inside the verification status card.
    await this.verificationStatusCard.getByRole("button", { name: "Information" }).click();
  }

  /**
   * Opens the information tooltip or modal for the Quality Metrics card.
   */
  async openQualityMetricsInfo() {
    // Click the information button specifically for quality metrics.
    await this.qualityMetricsInfoButton.click();
  }

  /**
   * Ensures the Quality Metrics card is fully loaded and visible.
   */
  async waitForQualityMetricsReady() {
    // Wait for the card element to be attached to the DOM, allowing for a longer loading window.
    await this.qualityMetricsCard.waitFor({ state: "attached", timeout: 80000 });
    // Scroll the card into the visible viewport area.
    await this.qualityMetricsCard.scrollIntoViewIfNeeded();
    // Wait for the interactive information button to become visible.
    await this.qualityMetricsInfoButton.waitFor({ state: "visible", timeout: 10000 });
  }

  /**
   * Ensures the Forensic Insights card is fully loaded and visible.
   */
  async waitForForensicInsightsReady() {
    // Wait for the card element to be attached to the DOM.
    await this.forensicInsightsCard.waitFor({ state: "attached", timeout: 80000 });
    // Scroll the card into the visible viewport area.
    await this.forensicInsightsCard.scrollIntoViewIfNeeded();
    // Confirm the card is interactive by waiting for its information button.
    await this.forensicInsightsCard
      .getByRole("button", { name: "Information" })
      .waitFor({ state: "visible", timeout: 10000 });
  }

  /**
   * Ensures the Verification Status card is fully loaded and visible.
   */
  async waitForVerificationStatusReady() {
    // Wait for the card element to be present in the document.
    await this.verificationStatusCard.waitFor({ state: "attached", timeout: 80000 });
    // Scroll the card into the visible viewport area.
    await this.verificationStatusCard.scrollIntoViewIfNeeded();
    // Confirm the card is ready by waiting for its information button visibility.
    await this.verificationStatusCard
      .getByRole("button", { name: "Information" })
      .waitFor({ state: "visible", timeout: 10000 });
  }

  /**
   * Asserts that the welcome message displays the expected user name.
   */
  async expectWelcomeMessage(firstName: string) {
    // Verify that the welcome heading is visible to the user.
    await expect(this.welcomeHeading).toBeVisible();
    // Check that the name text contains the provided `firstName` string.
    await expect(this.firstNameText).toContainText(`${firstName}!`);
  }

  /**
   * Asserts that the page header title matches the expected text.
   */
  async expectHeaderTitle(title: string) {
    // Verify the text content of the primary header heading.
    await expect(this.headerPageTitle).toHaveText(title);
  }

  /**
   * Asserts that all standard sidebar navigation elements are visible.
   */
  async expectSidebarVisible() {
    // Verify visibility for the logo and all primary navigation links in the sidebar.
    await expect(this.sidebarLogo).toBeVisible();
    await expect(this.sidebar.dashboardLink).toBeVisible();
    await expect(this.sidebar.analyzeLink).toBeVisible();
    await expect(this.sidebar.resultsLink).toBeVisible();
    await expect(this.sidebar.accountLink).toBeVisible();
    await expect(this.sidebar.signOutButton).toBeVisible();
  }

  /**
   * Asserts that the Dashboard link is marked as the active route in the interface.
   */
  async expectDashboardActive() {
    // Locate the button element within the dashboard link.
    const button = this.sidebarDashboardLink.locator("button");
    // Verify that the `data-active` attribute is set to true.
    await expect(button).toHaveAttribute("data-active", "true");
  }

  /**
   * Navigates to the Analyze page using the sidebar link.
   */
  async navigateToAnalyze() {
    // Wait for the analyze link to be visible before interacting.
    await this.sidebar.analyzeLink.waitFor({ state: "visible", timeout: 15000 });
    // Execute the navigation action via the sidebar component.
    await this.sidebar.navigateToAnalyze();
  }

  /**
   * Navigates to the Results page using the sidebar link.
   */
  async navigateToResults() {
    // Wait for the results link to be visible before interacting.
    await this.sidebar.resultsLink.waitFor({ state: "visible", timeout: 15000 });
    // Execute the navigation action via the sidebar component.
    await this.sidebar.navigateToResults();
  }

  /**
   * Navigates to the Account page using the sidebar link.
   */
  async navigateToAccount() {
    // Wait for the account link to be visible before interacting.
    await this.sidebar.accountLink.waitFor({ state: "visible", timeout: 15000 });
    // Execute the navigation action via the sidebar component.
    await this.sidebar.navigateToAccount();
  }
}
