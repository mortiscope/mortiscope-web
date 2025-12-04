import { BasePage } from "@e2e/pages/base.page";
import { AnalyzeProgressComponent } from "@e2e/pages/components/analyze-progress.component";
import { FormComponent } from "@e2e/pages/components/form.component";
import { SidebarComponent } from "@e2e/pages/components/sidebar.component";
import { expect, Locator, Page } from "@playwright/test";

/**
 * Page Object Model representing the Analyze Details page.
 */
export class AnalyzeDetailsPage extends BasePage {
  readonly sidebar: SidebarComponent;
  readonly progress: AnalyzeProgressComponent;
  readonly form: FormComponent;

  readonly cardTitle: Locator;
  readonly cardDescription: Locator;

  readonly caseNameInput: Locator;
  readonly caseNameLabel: Locator;

  readonly caseDateLabel: Locator;
  readonly datePickerButton: Locator;
  readonly timeInput: Locator;
  readonly currentDateToggle: Locator;
  readonly currentDateToggleLabel: Locator;

  readonly temperatureInput: Locator;
  readonly temperatureLabel: Locator;
  readonly temperatureUnitSelect: Locator;
  readonly historicalTempToggle: Locator;
  readonly historicalTempToggleLabel: Locator;

  readonly locationLabel: Locator;
  readonly regionSelect: Locator;
  readonly provinceSelect: Locator;
  readonly citySelect: Locator;
  readonly barangaySelect: Locator;

  readonly saveAndContinueButton: Locator;

  constructor(page: Page) {
    super(page);

    // Initialize sub-components associated with the analyze details view.
    this.sidebar = new SidebarComponent(page);
    this.progress = new AnalyzeProgressComponent(page);
    this.form = new FormComponent(page);

    // Identify the main card headers and descriptions.
    this.cardTitle = page.locator('[data-slot="card-title"]').filter({ hasText: /^Case Details$/ });
    this.cardDescription = page.getByText("Fill in the necessary information about the case.");

    // Locate case name identification fields.
    this.caseNameLabel = page.getByText("Case Name", { exact: true });
    this.caseNameInput = page.getByPlaceholder("Enter case name");

    // Define locators for date and time selection controls.
    this.caseDateLabel = page.getByText("Case Date and Time");
    this.datePickerButton = page
      .locator("button")
      .filter({ hasText: /Pick a date|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/ })
      .first();
    this.timeInput = page.getByPlaceholder("Enter a time");
    this.currentDateToggle = page.getByLabel("Set to Current Date and Time");
    this.currentDateToggleLabel = page.getByText("Set to Current Date and Time");

    // Target the ambient temperature inputs and automated retrieval toggles.
    this.temperatureLabel = page.getByText("Ambient Temperature");
    this.temperatureInput = page.getByPlaceholder("Enter ambient temperature");
    this.temperatureUnitSelect = page.getByRole("combobox", { name: "Temperature Unit" });
    this.historicalTempToggle = page.getByLabel("Set Temperature Based on Date");
    this.historicalTempToggleLabel = page.getByText("Set Temperature Based on Date");

    // Locate the hierarchical geographical selection dropdowns.
    this.locationLabel = page.getByText("Location", { exact: true });
    this.regionSelect = page.getByRole("combobox", { name: "Region" });
    this.provinceSelect = page.getByRole("combobox", { name: "Province" });
    this.citySelect = page.getByRole("combobox", { name: "City/Municipality" });
    this.barangaySelect = page.getByRole("combobox", { name: "Barangay" });

    // Target the primary submission button.
    this.saveAndContinueButton = page.getByRole("button", { name: /Save and Continue|Saving/ });
  }

  /**
   * Navigates the browser to the analyze details route.
   */
  async goto() {
    // Navigate to the `/analyze` URL.
    await this.page.goto("/analyze");
  }

  /**
   * Ensures the page is fully loaded and critical form elements are interactable.
   */
  async waitForDetailsReady() {
    // Wait for the initial DOM content to be loaded.
    await this.page.waitForLoadState("domcontentloaded");
    // Concurrently wait for the sidebar, title, and primary input to become visible.
    await Promise.all([
      this.sidebar.sidebar.waitFor({ state: "visible", timeout: 30000 }),
      this.cardTitle.waitFor({ state: "visible", timeout: 30000 }),
      this.caseNameInput.waitFor({ state: "visible", timeout: 15000 }),
    ]);
  }

  /**
   * Inputs the provided string into the case name field.
   */
  async fillCaseName(name: string) {
    // Fill the `caseNameInput` with the specified `name`.
    await this.caseNameInput.fill(name);
  }

  /**
   * Toggles the setting to use the current date and time.
   */
  async toggleCurrentDate() {
    // Click the toggle to synchronize the form with the current system time.
    await this.currentDateToggle.click();
  }

  /**
   * Inputs the temperature value into the form.
   */
  async fillTemperature(value: string) {
    // Fill the `temperatureInput` with the provided string value.
    await this.temperatureInput.fill(value);
  }

  /**
   * Selects a specific temperature unit from the unit dropdown.
   */
  async selectTemperatureUnit(unit: "°C" | "°F") {
    // Open the unit selection dropdown.
    await this.temperatureUnitSelect.click();
    // Select the option matching the provided `unit`.
    await this.page.getByRole("option", { name: unit }).click();
  }

  /**
   * Toggles the setting to automatically fetch historical temperature data.
   */
  async toggleHistoricalTemp() {
    // Click the toggle to enable historical temperature lookup based on date and location.
    await this.historicalTempToggle.click();
  }

  /**
   * Selects a region from the region dropdown.
   */
  async selectRegion(region: string) {
    // Open the region selection combobox.
    await this.regionSelect.click();
    // Select the specific region option.
    await this.page.getByRole("option", { name: region, exact: true }).click();
  }

  /**
   * Selects a province from the province dropdown.
   */
  async selectProvince(province: string) {
    // Open the province selection combobox.
    await this.provinceSelect.click();
    // Select the specific province option.
    await this.page.getByRole("option", { name: province }).click();
  }

  /**
   * Selects a city or municipality from the city dropdown.
   */
  async selectCity(city: string) {
    // Open the city selection combobox.
    await this.citySelect.click();
    // Select the specific city option.
    await this.page.getByRole("option", { name: city }).click();
  }

  /**
   * Selects a barangay from the barangay dropdown.
   */
  async selectBarangay(barangay: string) {
    // Open the barangay selection combobox.
    await this.barangaySelect.click();
    // Select the specific barangay option.
    await this.page.getByRole("option", { name: barangay }).click();
  }

  /**
   * Executes the submission of the case details form.
   */
  async clickSaveAndContinue() {
    // Click the save button to proceed to the next step of the analysis.
    await this.saveAndContinueButton.click();
  }

  /**
   * Asserts that the card title is visible to the user.
   */
  async expectCardTitleVisible() {
    // Verify that `cardTitle` is visible in the viewport.
    await expect(this.cardTitle).toBeVisible();
  }

  /**
   * Asserts that the card description text is visible.
   */
  async expectCardDescriptionVisible() {
    // Verify that `cardDescription` is visible to provide context to the user.
    await expect(this.cardDescription).toBeVisible();
  }

  /**
   * Asserts that the case name input and its label are visible.
   */
  async expectCaseNameVisible() {
    // Verify visibility of both the label and the input field.
    await expect(this.caseNameLabel).toBeVisible();
    await expect(this.caseNameInput).toBeVisible();
  }

  /**
   * Asserts that the date selection components are visible.
   */
  async expectCaseDateVisible() {
    // Verify visibility of the date label and the picker button.
    await expect(this.caseDateLabel).toBeVisible();
    await expect(this.datePickerButton).toBeVisible();
  }

  /**
   * Asserts that the temperature input components are visible.
   */
  async expectTemperatureVisible() {
    // Verify visibility of the temperature label and input field.
    await expect(this.temperatureLabel).toBeVisible();
    await expect(this.temperatureInput).toBeVisible();
  }

  /**
   * Asserts that the location selection components are visible.
   */
  async expectLocationVisible() {
    // Verify visibility of the location label and the initial region selector.
    await expect(this.locationLabel).toBeVisible();
    await expect(this.regionSelect).toBeVisible();
  }

  /**
   * Asserts that the save and continue button is visible.
   */
  async expectSaveAndContinueVisible() {
    // Verify the presence of the primary action button.
    await expect(this.saveAndContinueButton).toBeVisible();
  }

  /**
   * Asserts that the save and continue button is in a disabled state.
   */
  async expectSaveAndContinueDisabled() {
    // Verify that the button is disabled, typically when form validation has not been met.
    await expect(this.saveAndContinueButton).toBeDisabled();
  }

  /**
   * Asserts that the save and continue button is in an enabled state.
   */
  async expectSaveAndContinueEnabled() {
    // Verify that the button is enabled and ready for interaction.
    await expect(this.saveAndContinueButton).toBeEnabled();
  }

  /**
   * Asserts that any global form loading indicators have disappeared.
   */
  async expectFormLoadingComplete() {
    // Wait for the loading text to be hidden, using an extended timeout for slow data fetching.
    await expect(this.page.getByText("Loading form data...")).toBeHidden({ timeout: 90000 });
  }

  /**
   * Asserts that a success toast notification appears after saving.
   */
  async expectSuccessToast(timeout = 35000) {
    // Verify that a toast message confirming the save or update action is displayed.
    await expect(
      this.page.getByText(/Case details have been saved|Case details have been updated/)
    ).toBeVisible({ timeout });
  }

  /**
   * Asserts that the "Previous" navigation button is not present on this page.
   */
  async expectNoPreviousButton() {
    // Verify that the "Previous" button is hidden, as this is the first step of the flow.
    await expect(this.page.getByRole("button", { name: "Previous" })).toBeHidden();
  }
}
