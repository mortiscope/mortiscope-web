import { expect, test } from "@e2e/fixtures";
import { AnalyzeWizardPage } from "@e2e/pages/analyze/analyze-wizard.page";

// Groups all end-to-end tests for the analysis wizard workflow.
test.describe("Analyze Page", () => {
  let analyzePage: AnalyzeWizardPage;

  /**
   * Setup routine performed before each test to ensure a clean wizard state.
   */
  test.beforeEach(async ({ authenticatedPage }) => {
    // Initialize the AnalyzeWizardPage object with the authenticated browser context.
    analyzePage = new AnalyzeWizardPage(authenticatedPage);
    // Navigate to the analysis page.
    await analyzePage.goto();
    // Reset the wizard to the first step to clear any persisted session data.
    await analyzePage.resetWizardState();
    // Re-navigate to the analysis page after the reset.
    await analyzePage.goto();
    // Wait for the wizard components to be fully loaded and interactive.
    await analyzePage.waitForWizardReady();
  });

  // Groups tests verifying high-level page information and metadata.
  test.describe("Page Metadata", () => {
    /**
     * Test case to verify that the page document title contains the expected application names.
     */
    test("should have correct page title", async ({ authenticatedPage }) => {
      // Retrieve the current document title from the browser.
      const title = await authenticatedPage.title();
      // Assert that the title includes the specific module and application name.
      expect(title).toContain("Analyze");
      expect(title).toContain("MortiScope");
      // Wait for a brief period to ensure the UI is settled before capturing.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the page for metadata verification.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/1-page-title.png",
      });
    });

    /**
     * Test case to verify the current browser URL matches the expected analysis route.
     */
    test("should have correct url", async ({ authenticatedPage }) => {
      // Assert that the browser URL matches the regular expression for the analysis path.
      await expect(authenticatedPage).toHaveURL(/\/analyze/);
      // Wait for the page content to stabilize.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the page at the verified URL.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/2-correct-url.png",
      });
    });
  });

  // Groups tests related to the sidebar navigation component state.
  test.describe("Sidebar Navigation", () => {
    /**
     * Test case to verify the sidebar is visible and the current page link is marked as active.
     */
    test("should display sidebar with analyze link active", async ({ authenticatedPage }) => {
      // Use the page object to check for sidebar and link visibility.
      await expect(analyzePage.sidebar.sidebar).toBeVisible();
      await expect(analyzePage.sidebar.analyzeLink).toBeVisible();
      // Locate the specific navigation button for the `/analyze` route.
      const analyzeButton = authenticatedPage.locator('a[href="/analyze"]').locator("button");
      // Assert that the active state attribute is set to true.
      await expect(analyzeButton).toHaveAttribute("data-active", "true");
      // Wait for the sidebar transition animations to complete.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the sidebar navigation state.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/3-sidebar-active.png",
      });
    });
  });

  // Groups tests for the multi-step progress indicator at the top of the wizard.
  test.describe("Progress Indicator", () => {
    /**
     * Test case to verify the presence and segment count of the progress bar.
     */
    test("should display the three-step progress bar", async ({ authenticatedPage }) => {
      // Check that the progress component is visible to the user.
      await analyzePage.progress.expectVisible();
      // Assert that the total number of steps in the indicator is equal to three.
      await analyzePage.progress.expectStepCount(3);
      // Wait for the progress bar rendering to finalize.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the three-step progress indicator.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/4-progress-bar.png",
      });
    });

    /**
     * Test case to verify that the first step is highlighted as the active step upon entry.
     */
    test("should show Analysis Details as the active step", async ({ authenticatedPage }) => {
      // Assert that the step labeled "Analysis Details" has the active visual state.
      await analyzePage.progress.expectActiveStep("Analysis Details");
      // Wait for the active state styles to be applied.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the active step in the progress indicator.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/5-active-step-details.png",
      });
    });
  });

  // Groups tests for the first step of the wizard involving case information.
  test.describe("Step 1 — Analysis Details", () => {
    /**
     * Test case to verify the descriptive headers of the case details card.
     */
    test("should display case details card title and description", async ({
      authenticatedPage,
    }) => {
      // Check for the visibility of the primary card title and subtext.
      await analyzePage.details.expectCardTitleVisible();
      await analyzePage.details.expectCardDescriptionVisible();
      // Ensure the card title is centered in the viewport for the screenshot.
      await analyzePage.details.cardTitle.evaluate((el) => el.scrollIntoView({ block: "center" }));
      // Wait for the scroll action to finish.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the card headers.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/6-details-card-header.png",
      });
    });

    /**
     * Test case to verify all required input fields are present in the form.
     */
    test("should display all form fields", async ({ authenticatedPage }) => {
      // Verify visibility of name, date, temperature, and location inputs.
      await analyzePage.details.expectCaseNameVisible();
      await analyzePage.details.expectCaseDateVisible();
      await analyzePage.details.expectTemperatureVisible();
      await analyzePage.details.expectLocationVisible();
      // Scroll to the temperature input to ensure form visibility.
      await analyzePage.details.temperatureInput.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      // Wait for the view to stabilize.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the complete form fields.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/7-details-form-fields.png",
      });
    });

    /**
     * Test case to verify the presence of the primary navigation button.
     */
    test("should display save and continue button", async ({ authenticatedPage }) => {
      // Assert the visibility of the "Save and Continue" action.
      await analyzePage.details.expectSaveAndContinueVisible();
      // Bring the button into view for the visual check.
      await analyzePage.details.saveAndContinueButton.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      // Wait for the scroll to finish.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the primary action button.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/8-save-continue-button.png",
      });
    });

    /**
     * Test case to ensure that the user cannot go back from the first step.
     */
    test("should not display previous button on first step", async ({ authenticatedPage }) => {
      // Assert that the "Previous" button is not present or hidden.
      await analyzePage.details.expectNoPreviousButton();
      // Scroll to the bottom of the form to confirm absence of the button.
      await analyzePage.details.saveAndContinueButton.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      // Wait for the UI to settle.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot to document the absence of the previous button.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/9-no-previous-button.png",
      });
    });

    /**
     * Test case to verify the current date helper toggle.
     */
    test("should display current date toggle", async ({ authenticatedPage }) => {
      // Check visibility of the toggle with an extended timeout for dynamic loading.
      await expect(analyzePage.details.currentDateToggle).toBeVisible({ timeout: 15000 });
      await expect(analyzePage.details.currentDateToggleLabel).toBeVisible();
      // Scroll the toggle into view.
      await analyzePage.details.currentDateToggle.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      // Wait for the UI to stabilize.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the current date toggle component.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/10-current-date-toggle.png",
      });
    });

    /**
     * Test case to verify client-side validation for the case name length.
     */
    test("should show validation error for short case name", async ({ authenticatedPage }) => {
      // Input a string that is too short for the requirements.
      await analyzePage.details.fillCaseName("Case");
      // Trigger validation by moving focus away from the input.
      await analyzePage.details.caseNameInput.blur();
      // Assert that the specific error message is displayed for the `caseName` field.
      await analyzePage.details.form.expectError(
        "caseName",
        "Case name must be at least 8 characters."
      );
      // Focus on the input to capture the error state.
      await analyzePage.details.caseNameInput.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      // Wait for the error message animation.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the validation error message.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/11-case-name-validation.png",
      });
    });

    /**
     * Test case to verify the cascading nature of the location selection dropdowns.
     */
    test("should display location dropdowns in cascade", async ({ authenticatedPage }) => {
      // Verify visibility of the entire hierarchy of location selectors.
      await expect(analyzePage.details.regionSelect).toBeVisible();
      await expect(analyzePage.details.provinceSelect).toBeVisible();
      await expect(analyzePage.details.citySelect).toBeVisible();
      await expect(analyzePage.details.barangaySelect).toBeVisible();
      // Scroll to the top of the location section.
      await analyzePage.details.regionSelect.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      // Wait for the view to stabilize.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the location selection UI.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/12-location-dropdowns.png",
      });
    });

    /**
     * Test case to verify data entry in the case name field.
     */
    test("should fill case name input", async ({ authenticatedPage }) => {
      // Simulate typing a valid case name.
      await analyzePage.details.fillCaseName("Mortiscope Case Name");
      // Assert that the input value reflects the typed text.
      await expect(analyzePage.details.caseNameInput).toHaveValue("Mortiscope Case Name");
      // Center the input in the viewport.
      await analyzePage.details.caseNameInput.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      // Wait for the UI to settle.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the filled case name input.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/13-case-name-filled.png",
      });
    });

    /**
     * Test case to verify that enabling the current date toggle populates the date fields.
     */
    test("should toggle current date and populate fields", async ({ authenticatedPage }) => {
      // Click the current date toggle.
      await analyzePage.details.toggleCurrentDate();
      // Assert that the toggle is now in a checked state.
      await expect(analyzePage.details.currentDateToggle).toBeChecked();
      // Center the toggle for documentation.
      await analyzePage.details.currentDateToggle.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      // Wait for the date population logic to finish.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the enabled current date toggle.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/14-current-date-toggled.png",
      });
    });

    /**
     * Test case to verify data entry for the temperature field.
     */
    test("should fill temperature value", async ({ authenticatedPage }) => {
      // Simulate typing a temperature value.
      await analyzePage.details.fillTemperature("30");
      // Assert that the input value is correct.
      await expect(analyzePage.details.temperatureInput).toHaveValue("30");
      // Center the temperature input in the viewport.
      await analyzePage.details.temperatureInput.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      // Wait for the UI to settle.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the filled temperature field.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/15-temperature-filled.png",
      });
    });
  });

  // Groups tests for the second step where users upload or capture specimen images.
  test.describe("Step 2 — Provide an Image", () => {
    /**
     * Preparation step to navigate past the first screen with valid data.
     */
    test.beforeEach(async () => {
      // Populate the first step with valid data and proceed.
      await analyzePage.fillDetailsAndContinue({
        caseName: "Mortiscope Case Name",
        temperature: "30",
        region: "Region V (Bicol Region)",
        province: "Masbate",
        city: "Claveria",
        barangay: "Poblacion District I (Bgy. 1)",
      });
      // Wait for the upload interface to be interactive.
      await analyzePage.upload.waitForUploadReady();
    });

    /**
     * Test case to verify the headers for the image provision step.
     */
    test("should display upload step card title and description", async ({ authenticatedPage }) => {
      // Verify visibility of the title and subtext for the upload card.
      await analyzePage.upload.expectCardTitleVisible();
      await analyzePage.upload.expectCardDescriptionVisible();
      // Center the header in the viewport.
      await analyzePage.upload.cardTitle.evaluate((el) => el.scrollIntoView({ block: "center" }));
      // Wait for the UI to stabilize.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the upload step headers.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/16-upload-card-header.png",
      });
    });

    /**
     * Test case to verify both image acquisition methods are available.
     */
    test("should display upload and camera tabs", async ({ authenticatedPage }) => {
      // Assert visibility of the manual upload and live camera tabs.
      await analyzePage.upload.tabs.expectUploadTabVisible();
      await analyzePage.upload.tabs.expectCameraTabVisible();
      // Center the tabs in the viewport.
      await analyzePage.upload.tabs.uploadTab.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      // Wait for the rendering to finish.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the upload method tabs.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/17-upload-tabs.png",
      });
    });

    /**
     * Test case to verify the file upload tab is the initial selection.
     */
    test("should have upload tab active by default", async ({ authenticatedPage }) => {
      // Assert that the upload tab is marked as the active selection.
      await analyzePage.upload.tabs.expectUploadTabActive();
      // Center the tabs for the screenshot.
      await analyzePage.upload.tabs.uploadTab.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      // Wait for the UI to settle.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the default active tab.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/18-upload-tab-active.png",
      });
    });

    /**
     * Test case to verify switching to the camera acquisition method.
     */
    test("should switch to camera tab", async ({ authenticatedPage }) => {
      // Click on the camera tab.
      await analyzePage.upload.tabs.selectCameraTab();
      // Assert that the camera tab is now active.
      await analyzePage.upload.tabs.expectCameraTabActive();
      // Verify that the camera interface text is displayed.
      await expect(authenticatedPage.getByText("Use Camera")).toBeVisible();
      // Center the camera tab in the viewport.
      await analyzePage.upload.tabs.cameraTab.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      // Wait for the tab transition to finish.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the active camera tab.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/19-camera-tab-active.png",
      });
    });

    /**
     * Test case to verify successful file upload with a supported format.
     */
    test("should approve valid file format with toast notification", async ({
      authenticatedPage,
    }) => {
      // Clear any existing files to start fresh.
      await analyzePage.upload.deleteAllFiles();
      // Define the sample file name and resolve its local path.
      const name = "sample-image-1.png";
      const filePath = analyzePage.getAssetPath(name);
      // Create a promise to wait for the success toast.
      const uploadToastPromise = analyzePage.upload.waitForUploadSuccessToast(name, 90000);
      // Execute the file upload.
      await analyzePage.upload.uploadFile(filePath);
      // Wait for both the toast notification and the file to appear in the list.
      await Promise.all([uploadToastPromise, analyzePage.upload.waitForFileUploaded(name)]);
      // Wait for the toast animation to settle.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the successful upload toast.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/20-valid-format-toast.png",
      });
    });

    /**
     * Test case to verify the file management toolbar and search functionality.
     */
    test("should display toolbar and support file searching", async ({ authenticatedPage }) => {
      // Clear previous files for a controlled search environment.
      await analyzePage.upload.deleteAllFiles();
      // List of images to upload for testing search.
      const filePaths = [
        analyzePage.getAssetPath("sample-image-1.png"),
        analyzePage.getAssetPath("sample-image-2.png"),
      ];

      // Upload multiple files sequentially.
      for (const [i, filePath] of filePaths.entries()) {
        await analyzePage.upload.uploadFile(filePath);
        await analyzePage.upload.waitForFileUploaded(
          ["sample-image-1.png", "sample-image-2.png"][i]
        );
      }

      // Assert visibility of search, sort, and view mode controls.
      await analyzePage.upload.toolbar.expectSearchVisible();
      await analyzePage.upload.toolbar.expectSortButtonVisible();
      await analyzePage.upload.toolbar.expectViewModeToggleVisible();
      // Center the toolbar in the viewport.
      await analyzePage.upload.toolbar.searchInput.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      // Wait for the UI to stabilize.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the upload toolbar.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/21-upload-toolbar.png",
      });

      // Execute a search query that should return one result.
      await analyzePage.upload.toolbar.search("sample-image-1");
      // Assert that only the matching file is visible.
      await analyzePage.upload.expectFileVisible("sample-image-1.png");
      // Wait for the list to filter.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the filtered search results.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/22-search-files.png",
      });

      // Execute a search query that should return no results.
      await analyzePage.upload.toolbar.search("mortiscope");
      // Assert that the empty state message is displayed.
      await analyzePage.upload.toolbar.expectNoFilesFound();
      // Center the search input for the screenshot.
      await analyzePage.upload.toolbar.searchInput.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      // Wait for the UI to settle.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the "no results found" state.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/23-no-files-found.png",
      });
    });

    /**
     * Test case to verify view mode toggling and the availability of sort options.
     */
    test("should support view switching and sort options", async ({ authenticatedPage }) => {
      // Ensure at least one file exists to observe layout changes.
      await analyzePage.upload.deleteAllFiles();
      const filePath = analyzePage.getAssetPath("sample-image-1.png");
      await analyzePage.upload.uploadFile(filePath);
      await analyzePage.upload.waitForFileUploaded("sample-image-1.png");

      // Switch the file display to grid view.
      await analyzePage.upload.toolbar.switchToGridView();
      // Center the view toggle for documentation.
      await analyzePage.upload.toolbar.viewModeToggle.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      // Wait for the layout transition.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the grid view layout.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/24-grid-view.png",
      });

      // Switch the file display to list view.
      await analyzePage.upload.toolbar.switchToListView();
      // Center the toggle again.
      await analyzePage.upload.toolbar.viewModeToggle.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      // Wait for the layout transition.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the list view layout.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/25-list-view.png",
      });

      // Bring the sort button into view and open the sort menu.
      await analyzePage.upload.toolbar.sortButton.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      await analyzePage.upload.toolbar.openSortMenu();
      // Verify that all expected sorting criteria are present in the menu.
      await expect(
        authenticatedPage.getByRole("menuitem", { name: "Date Added (Newest)" })
      ).toBeVisible();
      await expect(
        authenticatedPage.getByRole("menuitem", { name: "Date Added (Oldest)" })
      ).toBeVisible();
      await expect(authenticatedPage.getByRole("menuitem", { name: "Name (A-Z)" })).toBeVisible();
      await expect(authenticatedPage.getByRole("menuitem", { name: "Name (Z-A)" })).toBeVisible();
      await expect(
        authenticatedPage.getByRole("menuitem", { name: "Size (Smallest)" })
      ).toBeVisible();
      await expect(
        authenticatedPage.getByRole("menuitem", { name: "Size (Largest)" })
      ).toBeVisible();
      // Wait for the menu to fully open.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the available sort options.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/26-sort-options.png",
      });
    });

    /**
     * Test case to verify rejection of unsupported file types with an error notification.
     */
    test("should reject invalid file format with toast notification", async ({
      authenticatedPage,
    }) => {
      // Attempt to upload a non-image text file.
      const invalidFilePath = analyzePage.getAssetPath("invalid-format.txt");
      await analyzePage.upload.uploadFile(invalidFilePath);
      // Locate the error toast containing the rejection message.
      const invalidToast = authenticatedPage.getByText(/is not a supported file type/);
      // Assert visibility of the error toast.
      await expect(invalidToast).toBeVisible({ timeout: 5000 });
      // Center the toast in the viewport.
      await invalidToast.evaluate((el) => el.scrollIntoView({ block: "center" }));
      // Wait for the toast animation.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the invalid format error.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/27-invalid-format-toast.png",
      });
    });
  });

  // Groups tests for the final review step before submission.
  test.describe("Step 3 — Review and Submit", () => {
    /**
     * Preparation step to populate and navigate through the first two screens.
     */
    test.beforeEach(async () => {
      // Reset wizard and navigate through details and upload steps.
      await analyzePage.resetWizardState();
      await analyzePage.goto();
      await analyzePage.waitForWizardReady();
      await analyzePage.fillDetailsAndContinue({
        caseName: "Mortiscope Case Name",
        temperature: "30",
        region: "Region V (Bicol Region)",
        province: "Masbate",
        city: "Claveria",
        barangay: "Poblacion District I (Bgy. 1)",
      });
      // Wait for step 1 success.
      await analyzePage.details.expectSuccessToast(90000);
      await analyzePage.upload.waitForUploadReady();
      await analyzePage.upload.deleteAllFiles();
      // Upload a file to satisfy step 2 requirements.
      const filePath = analyzePage.getAssetPath("sample-image-1.png");
      await analyzePage.upload.uploadFile(filePath);
      await analyzePage.upload.waitForFileUploaded("sample-image-1.png");
      // Advance to the review step.
      await analyzePage.upload.clickNext();
      // Wait for the review components to load.
      await analyzePage.review.waitForReviewReady();
    });

    /**
     * Test case to verify headers on the review page.
     */
    test("should display review step title and description", async ({ authenticatedPage }) => {
      // Assert visibility of the review step title and subtext.
      await analyzePage.review.expectReviewTitleVisible();
      await analyzePage.review.expectReviewDescriptionVisible();
      // Wait for UI stabilization.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the review step header.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/28-review-header.png",
      });
    });

    /**
     * Test case to verify the visual summary of uploaded images.
     */
    test("should display image summary section", async ({ authenticatedPage }) => {
      // Assert visibility of the image preview area.
      await analyzePage.review.expectImageSummaryVisible();
      // Verify that at least one thumbnail is displayed.
      const thumbnailCount = await analyzePage.review.getImageThumbnailCount();
      expect(thumbnailCount).toBeGreaterThanOrEqual(1);
      // Wait for thumbnails to render.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the image summary section.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/29-image-summary.png",
      });
    });

    /**
     * Test case to verify the presence of text summary labels for case data.
     */
    test("should display analysis details summary", async ({ authenticatedPage }) => {
      // Assert visibility of the textual details summary container.
      await analyzePage.review.expectDetailsSummaryVisible();
      // Check for specific labels in the summary list.
      await expect(analyzePage.review.caseNameLabel).toBeVisible();
      await expect(analyzePage.review.temperatureLabel).toBeVisible();
      await expect(analyzePage.review.caseDateLabel).toBeVisible();
      await expect(analyzePage.review.locationLabel).toBeVisible();
      // Wait for the summary to render.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the details summary section.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/30-details-summary.png",
      });
    });

    /**
     * Test case to verify the case name data is correctly carried over to review.
     */
    test("should display correct case name in review", async ({ authenticatedPage }) => {
      // Assert that the displayed case name matches the value entered in step 1.
      await analyzePage.review.expectCaseNameDisplayed("Mortiscope Case Name");
      // Wait for the text to appear.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the reviewed case name.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/31-review-case-name.png",
      });
    });

    /**
     * Test case to verify the temperature data is correctly carried over to review.
     */
    test("should display correct temperature in review", async ({ authenticatedPage }) => {
      // Assert that the displayed temperature matches the value entered in step 1.
      await analyzePage.review.expectTemperatureDisplayed("30");
      // Wait for the text to appear.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the reviewed temperature.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/32-review-temperature.png",
      });
    });

    /**
     * Test case to verify availability of navigation and submission actions.
     */
    test("should display previous and submit buttons", async ({ authenticatedPage }) => {
      // Assert visibility of buttons to go back or finish the analysis.
      await analyzePage.review.expectPreviousButtonVisible();
      await analyzePage.review.expectSubmitButtonVisible();
      // Wait for button rendering.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the final action buttons.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/33-review-action-buttons.png",
      });
    });

    /**
     * Test case to verify backward navigation from review to upload.
     */
    test("should navigate back to upload step when clicking previous", async ({
      authenticatedPage,
    }) => {
      // Click the previous button on the review screen.
      await analyzePage.review.clickPrevious();
      // Wait for the upload step components to reload.
      await analyzePage.upload.waitForUploadReady();
      // Assert that the current state is the upload step.
      await analyzePage.expectOnUploadStep();
      // Wait for the page transition.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the navigation back to step 2.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/34-back-to-upload.png",
      });
    });

    /**
     * Test case to verify the page title updates to reflect the review stage.
     */
    test("should update page title on review step", async ({ authenticatedPage }) => {
      // Retrieve the document title in the final stage.
      const title = await authenticatedPage.title();
      // Assert that the title correctly identifies the review step.
      expect(title).toContain("Review and Submit");
      // Wait for UI stabilization.
      await authenticatedPage.waitForTimeout(500);
      // Capture a screenshot of the review page metadata state.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/35-review-page-title.png",
      });
    });
  });

  // Groups tests for the comprehensive end-to-end traversal of the wizard.
  test.describe("Wizard Navigation Flow", () => {
    /**
     * Test case to verify a user can move through the entire wizard and back again without data loss.
     */
    test("should complete full wizard navigation forward and backward", async ({
      authenticatedPage,
    }) => {
      // Ensure a fresh start for the full flow test.
      await analyzePage.resetWizardState();
      await analyzePage.goto();
      await analyzePage.waitForWizardReady();

      // Verify presence on the initial details step.
      await analyzePage.expectOnDetailsStep();
      await authenticatedPage.waitForTimeout(500);
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/36-wizard-step-1.png",
      });

      // Complete step 1.
      await analyzePage.fillDetailsAndContinue({
        caseName: "Mortiscope Case Name",
        temperature: "30",
        region: "Region V (Bicol Region)",
        province: "Masbate",
        city: "Claveria",
        barangay: "Poblacion District I (Bgy. 1)",
      });
      // Wait for the transition to the upload step.
      await analyzePage.details.expectSuccessToast(60000);
      await analyzePage.upload.waitForUploadReady();
      await analyzePage.upload.deleteAllFiles();
      await analyzePage.expectOnUploadStep();
      await authenticatedPage.waitForTimeout(500);
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/37-wizard-step-2.png",
      });

      // Provide an image for step 2.
      const filePath = analyzePage.getAssetPath("sample-image-1.png");
      await analyzePage.upload.uploadFile(filePath);
      await analyzePage.upload.waitForFileUploaded("sample-image-1.png");
      // Advance to the final review step.
      await analyzePage.upload.clickNext();
      await analyzePage.review.waitForReviewReady();
      await analyzePage.expectOnReviewStep();
      await authenticatedPage.waitForTimeout(500);
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/38-wizard-step-3.png",
      });

      // Test backward navigation from step 3 to step 2.
      await analyzePage.review.clickPrevious();
      await analyzePage.upload.waitForUploadReady();
      await analyzePage.expectOnUploadStep();
      await authenticatedPage.waitForTimeout(500);
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/39-wizard-back-to-step-2.png",
      });

      // Test backward navigation from step 2 to step 1.
      await analyzePage.upload.clickPrevious();
      await analyzePage.details.waitForDetailsReady();
      await analyzePage.expectOnDetailsStep();
      await authenticatedPage.waitForTimeout(500);
      await authenticatedPage.screenshot({
        path: "e2e/test-results/analyze/40-wizard-back-to-step-1.png",
      });
    });
  });
});
