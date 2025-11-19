import { expect, Locator, Page } from "@playwright/test";

/**
 * Component object model representing the grid of metric cards on the dashboard.
 */
export class MetricsGridComponent {
  readonly verifiedCasesCard: Locator;
  readonly verifiedImagesCard: Locator;
  readonly verifiedDetectionsCard: Locator;
  readonly averagePmiCard: Locator;
  readonly averageConfidenceCard: Locator;
  readonly correctionRateCard: Locator;

  private readonly cardTitles = [
    "Verified Cases",
    "Verified Images",
    "Verified Detections",
    "Average PMI Estimation",
    "Average Confidence Score",
    "Correction Rate",
  ] as const;

  constructor(readonly page: Page) {
    // Locate the "Verified Cases" card by traversing up from the title text.
    this.verifiedCasesCard = page.getByText("Verified Cases").locator("..").locator("..");
    // Locate the "Verified Images" card by traversing up from the title text.
    this.verifiedImagesCard = page.getByText("Verified Images").locator("..").locator("..");
    // Locate the "Verified Detections" card by traversing up from the title text.
    this.verifiedDetectionsCard = page.getByText("Verified Detections").locator("..").locator("..");
    // Locate the "Average PMI Estimation" card by traversing up from the title text.
    this.averagePmiCard = page.getByText("Average PMI Estimation").locator("..").locator("..");
    // Locate the "Average Confidence Score" card by traversing up from the title text.
    this.averageConfidenceCard = page
      .getByText("Average Confidence Score")
      .locator("..")
      .locator("..");
    // Locate the "Correction Rate" card by traversing up from the title text.
    this.correctionRateCard = page.getByText("Correction Rate").locator("..").locator("..");
  }

  /**
   * Asserts that every metric card defined in the `cardTitles` array is visible on the page.
   */
  async expectAllCardsVisible() {
    // Iterate through each expected title and verify its visibility.
    for (const title of this.cardTitles) {
      await expect(this.page.getByText(title).first()).toBeVisible();
    }
  }

  /**
   * Retrieves the numerical or text value displayed within a specific metric card.
   */
  async getCardValue(title: (typeof this.cardTitles)[number]): Promise<string> {
    // Locate the parent container for the card based on the provided title.
    const card = this.page.getByText(title).locator("..").locator("..").last();
    // Identify the specific element containing the metric value using its font class.
    const valueElement = card.locator("div.font-plus-jakarta-sans").last();
    // Return the text content of the element or an empty string if null.
    return (await valueElement.textContent()) ?? "";
  }

  /**
   * Verifies that the dashboard metrics display an empty state or zeroed values.
   */
  async expectEmptyState() {
    // Check for the presence of the "0 / 0" placeholder text which indicates no data.
    await expect(this.page.getByText("0 / 0").first()).toBeVisible();
  }
}
