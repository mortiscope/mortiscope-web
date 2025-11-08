import { Locator, Page } from "@playwright/test";

/**
 * Represents the primary navigation bar component to manage top-level site navigation interactions.
 */
export class NavigationComponent {
  // Define locators for the navigation container and individual navigation elements.
  readonly nav: Locator;
  readonly logo: Locator;
  readonly homeLink: Locator;
  readonly featuresLink: Locator;
  readonly aboutLink: Locator;
  readonly signInButton: Locator;

  // Initialize the component by defining locators scoped to the navigation bar.
  constructor(readonly page: Page) {
    // Locate the main `nav` element which serves as the parent container.
    this.nav = page.locator("nav");
    // Find the branding logo by targeting the first anchor tag linking to the root path within the navigation.
    this.logo = this.nav.locator("a[href='/']").first();
    // Identify the "Home" navigation link by its visible text.
    this.homeLink = this.nav.getByText("Home");
    // Identify the "Features" navigation link by its visible text.
    this.featuresLink = this.nav.getByText("Features");
    // Identify the "About" navigation link by its visible text.
    this.aboutLink = this.nav.getByText("About");
    // Identify the "Sign In" button by its accessible role and specific name.
    this.signInButton = this.nav.getByRole("button", { name: "Sign In" });
  }

  /**
   * Simulates a user click on the "Home" navigation link.
   */
  async clickHome() {
    // Perform a click action on the `homeLink` locator.
    await this.homeLink.click();
  }

  /**
   * Simulates a user click on the "Features" navigation link.
   */
  async clickFeatures() {
    // Perform a click action on the `featuresLink` locator.
    await this.featuresLink.click();
  }

  /**
   * Simulates a user click on the "About" navigation link.
   */
  async clickAbout() {
    // Perform a click action on the `aboutLink` locator.
    await this.aboutLink.click();
  }

  /**
   * Simulates a user click on the "Sign In" button.
   */
  async clickSignIn() {
    // Perform a click action on the `signInButton` locator.
    await this.signInButton.click();
  }

  /**
   * Simulates a user click on the brand logo.
   */
  async clickLogo() {
    // Perform a click action on the `logo` locator to navigate to the root URL.
    await this.logo.click();
  }
}
