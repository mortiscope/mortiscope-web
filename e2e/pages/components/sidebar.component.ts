import { Locator, Page } from "@playwright/test";

/**
 * Represents the sidebar navigation component used for navigating authenticated user areas.
 */
export class SidebarComponent {
  // Define locators for the sidebar container and its primary navigation elements.
  readonly sidebar: Locator;
  readonly dashboardLink: Locator;
  readonly analyzeLink: Locator;
  readonly resultsLink: Locator;
  readonly accountLink: Locator;
  readonly helpLink: Locator;
  readonly signOutButton: Locator;

  // Initialize the component by defining locators scoped to the sidebar's landmark role.
  constructor(readonly page: Page) {
    // Locate the main container for the sidebar using the `complementary` accessible role.
    this.sidebar = page.locator('[data-slot="sidebar"]');
    // Find the "Dashboard" link within the sidebar container.
    this.dashboardLink = this.sidebar.getByRole("link", { name: "Dashboard" });
    // Find the "Analyze" link within the sidebar container.
    this.analyzeLink = this.sidebar.getByRole("link", { name: "Analyze" });
    // Find the "Results" link within the sidebar container.
    this.resultsLink = this.sidebar.getByRole("link", { name: "Results" });
    // Find the "Account" link within the sidebar container.
    this.accountLink = this.sidebar.getByRole("link", { name: "Account" });
    // Find the "Help" link within the sidebar container.
    this.helpLink = this.sidebar.getByRole("link", { name: "Help" });
    // Find the "Sign Out" button by its accessible role and specific name.
    this.signOutButton = this.sidebar.getByRole("button", { name: "Sign Out" });
  }

  /**
   * Simulates a user clicking the "Dashboard" link in the sidebar.
   */
  async navigateToDashboard() {
    // Perform a click action on the `dashboardLink` locator.
    await this.dashboardLink.click();
  }

  /**
   * Simulates a user clicking the "Analyze" link in the sidebar.
   */
  async navigateToAnalyze() {
    // Perform a click action on the `analyzeLink` locator.
    await this.analyzeLink.click();
  }

  /**
   * Simulates a user clicking the "Results" link in the sidebar.
   */
  async navigateToResults() {
    // Perform a click action on the `resultsLink` locator.
    await this.resultsLink.click();
  }

  /**
   * Simulates a user clicking the "Account" link in the sidebar.
   */
  async navigateToAccount() {
    // Perform a click action on the `accountLink` locator.
    await this.accountLink.click();
  }

  /**
   * Simulates a user clicking the "Help" link in the sidebar.
   */
  async navigateToHelp() {
    // Perform a click action on the `helpLink` locator.
    await this.helpLink.click();
  }

  /**
   * Simulates a user clicking the "Sign Out" button to terminate the session.
   */
  async signOut() {
    // Perform a click action on the `signOutButton` locator.
    await this.signOutButton.click();
  }
}
