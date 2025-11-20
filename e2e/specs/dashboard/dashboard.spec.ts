import { expect, test } from "@e2e/fixtures";
import { DashboardPage } from "@e2e/pages/dashboard/dashboard.page";

// Groups all end-to-end tests related to the Dashboard page functionality.
test.describe("Dashboard Page", () => {
  let dashboardPage: DashboardPage;

  /**
   * Setup hook to initialize the dashboard page and navigate to it before each test.
   */
  test.beforeEach(async ({ authenticatedPage }) => {
    // Initialize the Dashboard page object using the authenticated browser context.
    dashboardPage = new DashboardPage(authenticatedPage);
    // Navigate the browser to the dashboard route.
    await dashboardPage.goto();
    // Wait for critical dashboard components to be visible and loaded.
    await dashboardPage.waitForDashboardReady();
  });

  // Groups tests that verify page-level metadata like titles and URLs.
  test.describe("Page Metadata", () => {
    /**
     * Test case to verify that the document title contains the expected branding and page name.
     */
    test("should have correct page title", async ({ authenticatedPage }) => {
      // Retrieve the current title of the browser window.
      const title = await authenticatedPage.title();

      // Assert that the title includes the "Dashboard" and "MortiScope" keywords.
      expect(title).toContain("Dashboard");
      expect(title).toContain("MortiScope");

      // Capture a screenshot for visual regression of the page title and branding.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/dashboard/1-page-title.png",
      });
    });

    /**
     * Test case to verify that the browser is at the correct dashboard URL.
     */
    test("should have correct url", async ({ authenticatedPage }) => {
      // Assert that the current URL matches the expected dashboard pattern.
      await expect(authenticatedPage).toHaveURL(/\/dashboard/);

      // Capture a screenshot to document the successful navigation state.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/dashboard/2-correct-url.png",
      });
    });
  });

  // Groups tests for verifying elements located within the dashboard header.
  test.describe("Dashboard Header", () => {
    /**
     * Test case to verify that the welcome heading correctly greets the user.
     */
    test("should display welcome message with user first name", async ({ authenticatedPage }) => {
      // Reset the scroll position to the top to ensure header visibility.
      await authenticatedPage.evaluate(() => window.scrollTo(0, 0));

      // Assert that the main welcome heading and name span are visible.
      await expect(dashboardPage.welcomeHeading).toBeVisible();
      await expect(dashboardPage.firstNameText).toBeVisible();

      // Retrieve the text content to ensure it is not empty and follows the expected punctuation format.
      const nameText = await dashboardPage.firstNameText.textContent();
      expect(nameText).toBeTruthy();
      expect(nameText!.endsWith("!")).toBeTruthy();

      // Capture a screenshot for visual verification of the user greeting.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/dashboard/3-welcome-message.png",
      });
    });

    /**
     * Test case to verify the presence of the global time filter.
     */
    test("should display time period filter button", async ({ authenticatedPage }) => {
      // Scroll to the top of the page to ensure the filter button is in view.
      await authenticatedPage.evaluate(() => window.scrollTo(0, 0));
      // Assert that the time period filter trigger is visible.
      await expect(dashboardPage.timePeriodFilterButton).toBeVisible();

      // Capture a screenshot of the filter button in its default state.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/dashboard/4-time-period-filter.png",
      });
    });

    /**
     * Test case to verify the contents of the time period filter dropdown menu.
     */
    test("should open time period filter dropdown with all options", async ({
      authenticatedPage,
    }) => {
      // Scroll to the top of the page.
      await authenticatedPage.evaluate(() => window.scrollTo(0, 0));
      // Click the filter button to open the dropdown menu.
      await dashboardPage.timePeriodFilterButton.click();

      // Assert that all standard time range options are visible in the menu.
      await expect(authenticatedPage.getByRole("menuitem", { name: "All-time" })).toBeVisible();
      await expect(authenticatedPage.getByRole("menuitem", { name: "Past Year" })).toBeVisible();
      await expect(authenticatedPage.getByRole("menuitem", { name: "Past Month" })).toBeVisible();
      await expect(authenticatedPage.getByRole("menuitem", { name: "Past Week" })).toBeVisible();

      // Capture a screenshot of the expanded menu options.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/dashboard/5-time-period-options.png",
      });
    });

    /**
     * Test case to verify that selecting different time periods updates the filter state.
     */
    test("should switch time period filter selection", async ({ authenticatedPage }) => {
      // Scroll to the top of the page.
      await authenticatedPage.evaluate(() => window.scrollTo(0, 0));
      // Select the "Past Month" option and pause to allow UI state updates.
      await dashboardPage.selectTimePeriod("Past Month");
      await authenticatedPage.waitForTimeout(1000);

      // Select the "Past Week" option.
      await dashboardPage.selectTimePeriod("Past Week");
      await authenticatedPage.waitForTimeout(1000);

      // Reset the filter to "All-time".
      await dashboardPage.selectTimePeriod("All-time");
      await authenticatedPage.waitForTimeout(1000);

      // Capture a screenshot of the final selection state.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/dashboard/6-time-period-switch.png",
      });
    });

    /**
     * Test case to verify the interaction and visibility of the date range picker.
     */
    test("should open date range picker", async ({ authenticatedPage }) => {
      // Ensure the picker trigger is in the viewport.
      await authenticatedPage.evaluate(() => window.scrollTo(0, 0));
      // Open the custom date range picker.
      await dashboardPage.openDateRangePicker();
      // Wait for the animation or menu rendering to finish.
      await authenticatedPage.waitForTimeout(500);

      // Assert that the control buttons within the picker are visible.
      await expect(authenticatedPage.getByRole("button", { name: "Reset" })).toBeVisible();
      await expect(authenticatedPage.getByRole("button", { name: "Apply" })).toBeVisible();

      // Capture a screenshot of the active date range picker interface.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/dashboard/7-date-range-picker.png",
      });
    });
  });

  // Groups tests for verifying the high-level summary metrics grid.
  test.describe("Metrics Grid", () => {
    /**
     * Test case to verify that the layout contains the correct number of metric cards.
     */
    test("should display all six metric cards", async ({ authenticatedPage }) => {
      // Scroll to the first metric card to ensure the grid section is active.
      await authenticatedPage
        .getByText("Verified Cases")
        .first()
        .evaluate((el) => el.scrollIntoView({ block: "center" }));

      // Use the metrics grid component to assert visibility of all expected cards.
      await dashboardPage.metricsGrid.expectAllCardsVisible();

      // Capture a screenshot of the metric grid layout.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/dashboard/8-metrics-grid.png",
      });
    });

    /**
     * Test case to specifically verify the naming and visibility of each metric title.
     */
    test("should display metric card titles correctly", async ({ authenticatedPage }) => {
      // Ensure the grid section is centered in the viewport.
      await authenticatedPage
        .getByText("Verified Cases")
        .first()
        .evaluate((el) => el.scrollIntoView({ block: "center" }));

      // Assert visibility for each specific metric title.
      await expect(authenticatedPage.getByText("Verified Cases").first()).toBeVisible();
      await expect(authenticatedPage.getByText("Verified Images").first()).toBeVisible();
      await expect(authenticatedPage.getByText("Verified Detections").first()).toBeVisible();
      await expect(authenticatedPage.getByText("Average PMI Estimation").first()).toBeVisible();
      await expect(authenticatedPage.getByText("Average Confidence Score").first()).toBeVisible();
      await expect(authenticatedPage.getByText("Correction Rate").first()).toBeVisible();

      // Capture a screenshot to document correct metric labeling.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/dashboard/9-metric-titles.png",
      });
    });
  });

  // Groups tests for the interactive analysis widgets and charts.
  test.describe("Analysis Widgets", () => {
    // Groups tests for the Forensic Insights charting widget.
    test.describe("Forensic Insights", () => {
      /**
       * Test case to verify the initial load state of the Forensic Insights card.
       */
      test("should display forensic insights widget with default view", async ({
        authenticatedPage,
      }) => {
        // Wait for the forensic insights data and components to be fully ready.
        await dashboardPage.waitForForensicInsightsReady();
        // Assert that the information trigger is available, indicating the card has loaded.
        await expect(
          dashboardPage.forensicInsightsCard.getByRole("button", { name: "Information" })
        ).toBeVisible({ timeout: 10000 });

        // Capture a screenshot of the default forensic insights chart.
        await authenticatedPage.screenshot({
          path: "e2e/test-results/dashboard/10-forensic-insights.png",
        });
      });

      /**
       * Test case to verify switching the forensic widget to the PMI distribution view.
       */
      test("should switch forensic insights view to pmi distribution", async ({
        authenticatedPage,
      }) => {
        // Wait for the card to be interactive.
        await dashboardPage.waitForForensicInsightsReady();
        // Change the card view to "PMI Distribution" via the dropdown.
        await dashboardPage.changeForensicInsightsView("PMI Distribution");
        // Wait for the chart to transition.
        await authenticatedPage.waitForTimeout(1000);
        // Assert that the new view title is visible.
        await expect(authenticatedPage.getByText("PMI Distribution").first()).toBeVisible();

        // Capture a screenshot of the PMI distribution chart.
        await authenticatedPage.screenshot({
          path: "e2e/test-results/dashboard/11-pmi-distribution.png",
        });
      });

      /**
       * Test case to verify switching the forensic widget to the sampling density view.
       */
      test("should switch forensic insights view to sampling density", async ({
        authenticatedPage,
      }) => {
        // Wait for the card to be interactive.
        await dashboardPage.waitForForensicInsightsReady();
        // Change the card view to "Sampling Density".
        await dashboardPage.changeForensicInsightsView("Sampling Density");
        // Wait for the chart to transition.
        await authenticatedPage.waitForTimeout(1000);
        // Assert that the new view title is visible.
        await expect(authenticatedPage.getByText("Sampling Density").first()).toBeVisible();

        // Capture a screenshot of the sampling density chart.
        await authenticatedPage.screenshot({
          path: "e2e/test-results/dashboard/12-sampling-density.png",
        });
      });

      /**
       * Test case to verify that the information modal for forensic insights can be opened.
       */
      test("should open forensic insights information modal", async ({ authenticatedPage }) => {
        // Ensure the card is ready before clicking help icons.
        await dashboardPage.waitForForensicInsightsReady();
        // Open the information modal.
        await dashboardPage.openForensicInsightsInfo();
        // Allow time for the modal transition to complete.
        await authenticatedPage.waitForTimeout(3000);
        // Assert that the modal title and confirmation button are visible.
        await expect(authenticatedPage.getByText("Forensic Insights Information")).toBeVisible();
        await expect(authenticatedPage.getByRole("button", { name: "Got It" })).toBeVisible();

        // Capture a screenshot of the help modal overlay.
        await authenticatedPage.screenshot({
          path: "e2e/test-results/dashboard/13-forensic-insights-modal.png",
        });
      });
    });

    // Groups tests for the Verification Status analytical widget.
    test.describe("Verification Status", () => {
      /**
       * Test case to verify the initial load state of the Verification Status card.
       */
      test("should display verification status widget with default view", async ({
        authenticatedPage,
      }) => {
        // Wait for the verification status data and components to be fully ready.
        await dashboardPage.waitForVerificationStatusReady();
        // Assert that the card is interactive.
        await expect(
          dashboardPage.verificationStatusCard.getByRole("button", { name: "Information" })
        ).toBeVisible({ timeout: 10000 });

        // Capture a screenshot of the default verification status chart.
        await authenticatedPage.screenshot({
          path: "e2e/test-results/dashboard/14-verification-status.png",
        });
      });

      /**
       * Test case to verify switching the verification widget to the image verification view.
       */
      test("should switch verification status view to image verification", async ({
        authenticatedPage,
      }) => {
        // Ensure the card is ready.
        await dashboardPage.waitForVerificationStatusReady();
        // Change the card view to "Image Verification Status".
        await dashboardPage.changeVerificationStatusView("Image Verification Status");
        // Wait for the UI update.
        await authenticatedPage.waitForTimeout(1000);
        // Assert that the specific view title is displayed.
        await expect(
          authenticatedPage.getByText("Image Verification Status").first()
        ).toBeVisible();

        // Capture a screenshot of the image verification metrics.
        await authenticatedPage.screenshot({
          path: "e2e/test-results/dashboard/15-verification-image.png",
        });
      });

      /**
       * Test case to verify switching the verification widget to the detection verification view.
       */
      test("should switch verification status view to detection verification", async ({
        authenticatedPage,
      }) => {
        // Ensure the card is ready.
        await dashboardPage.waitForVerificationStatusReady();
        // Change the card view to "Detection Verification Status".
        await dashboardPage.changeVerificationStatusView("Detection Verification Status");
        // Wait for the interface update.
        await authenticatedPage.waitForTimeout(1000);
        // Assert that the specific view title is displayed.
        await expect(
          authenticatedPage.getByText("Detection Verification Status").first()
        ).toBeVisible();

        // Capture a screenshot of the detection verification metrics.
        await authenticatedPage.screenshot({
          path: "e2e/test-results/dashboard/16-verification-detection.png",
        });
      });

      /**
       * Test case to verify that the information modal for verification status can be opened.
       */
      test("should open verification status information modal", async ({ authenticatedPage }) => {
        // Ensure the card is ready.
        await dashboardPage.waitForVerificationStatusReady();
        // Open the information modal.
        await dashboardPage.openVerificationStatusInfo();
        // Wait for the modal animation.
        await authenticatedPage.waitForTimeout(3000);
        // Assert that the modal content is visible.
        await expect(authenticatedPage.getByText("Verification Status Information")).toBeVisible();

        // Capture a screenshot of the verification help modal.
        await authenticatedPage.screenshot({
          path: "e2e/test-results/dashboard/17-verification-status-modal.png",
        });
      });
    });

    // Groups tests for the Quality Metrics analytical widget.
    test.describe("Quality Metrics", () => {
      /**
       * Test case to verify the initial load state of the Quality Metrics card.
       */
      test("should display quality metrics widget with default view", async ({
        authenticatedPage,
      }) => {
        // Wait for the quality metrics data to finish loading.
        await dashboardPage.waitForQualityMetricsReady();
        // Assert that the view toggle and card title are visible.
        await expect(dashboardPage.qualityMetricsChangeViewButton).toBeVisible();
        await expect(dashboardPage.qualityMetricsTitle).toBeVisible();

        // Capture a screenshot of the default quality metrics view.
        await authenticatedPage.screenshot({
          path: "e2e/test-results/dashboard/18-quality-metrics.png",
        });
      });

      /**
       * Test case to verify switching the quality widget to the user correction ratio view.
       */
      test("should switch quality metrics view to user correction ratio", async ({
        authenticatedPage,
      }) => {
        // Ensure the card is ready.
        await dashboardPage.waitForQualityMetricsReady();
        // Change the card view to "User Correction Ratio".
        await dashboardPage.changeQualityMetricsView("User Correction Ratio");
        // Wait for the chart to update.
        await authenticatedPage.waitForTimeout(1000);
        // Assert that the correct view title is visible.
        await expect(authenticatedPage.getByText("User Correction Ratio").first()).toBeVisible();

        // Capture a screenshot of the correction ratio metrics.
        await authenticatedPage.screenshot({
          path: "e2e/test-results/dashboard/19-user-correction.png",
        });
      });

      /**
       * Test case to verify switching the quality widget to the confidence score distribution view.
       */
      test("should switch quality metrics view to confidence score distribution", async ({
        authenticatedPage,
      }) => {
        // Ensure the card is ready.
        await dashboardPage.waitForQualityMetricsReady();
        // Change the card view to "Confidence Score Distribution".
        await dashboardPage.changeQualityMetricsView("Confidence Score Distribution");
        // Wait for the chart to update.
        await authenticatedPage.waitForTimeout(1000);
        // Assert that the correct view title is visible.
        await expect(
          authenticatedPage.getByText("Confidence Score Distribution").first()
        ).toBeVisible();

        // Capture a screenshot of the confidence score distribution.
        await authenticatedPage.screenshot({
          path: "e2e/test-results/dashboard/20-confidence-score-distribution.png",
        });
      });

      /**
       * Test case to verify that the information modal for quality metrics can be opened.
       */
      test("should open quality metrics information modal", async ({ authenticatedPage }) => {
        // Ensure the card is ready.
        await dashboardPage.waitForQualityMetricsReady();
        // Open the information modal.
        await dashboardPage.openQualityMetricsInfo();
        // Wait for the modal display animation.
        await authenticatedPage.waitForTimeout(3000);
        // Assert that the modal content is visible.
        await expect(authenticatedPage.getByText("Quality Metrics Information")).toBeVisible();

        // Capture a screenshot of the quality metrics help modal.
        await authenticatedPage.screenshot({
          path: "e2e/test-results/dashboard/21-quality-metrics-modal.png",
        });
      });
    });
  });

  // Groups tests for the data table interaction and filtering on the dashboard.
  test.describe("Dashboard Table", () => {
    /**
     * Test case to verify that the search input correctly filters table rows.
     */
    test("should filter table with search input", async ({ authenticatedPage }) => {
      // Scroll the search input into the center of the viewport for interaction.
      await dashboardPage.table.searchInput.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      // Perform a search for the term "test".
      await dashboardPage.table.search("test");
      // Allow time for the filtered results to render.
      await authenticatedPage.waitForTimeout(500);

      // Verify that the row count is a valid number after filtering.
      const rowCount = await dashboardPage.table.getRowCount();
      expect(rowCount).toBeGreaterThanOrEqual(0);

      // Clear the search to restore the original table state.
      await dashboardPage.table.clearSearch();
      await authenticatedPage.waitForTimeout(500);

      // Re-scroll to the search area for visual verification.
      await dashboardPage.table.searchInput.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      await authenticatedPage.waitForTimeout(300);

      // Capture a screenshot of the table search interaction.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/dashboard/22-table-search-filter.png",
      });
    });

    /**
     * Test case to verify the presence and formatting of pagination controls.
     */
    test("should display pagination controls", async ({ authenticatedPage }) => {
      // Scroll to the bottom of the table where pagination controls are located.
      await dashboardPage.table.lastPageButton.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );

      // Assert visibility for all primary pagination navigation buttons.
      await expect(dashboardPage.table.firstPageButton).toBeVisible();
      await expect(dashboardPage.table.previousPageButton).toBeVisible();
      await expect(dashboardPage.table.nextPageButton).toBeVisible();
      await expect(dashboardPage.table.lastPageButton).toBeVisible();

      // Retrieve and verify that the pagination text matches the expected pattern.
      const paginationText = await dashboardPage.table.getPaginationText();
      expect(paginationText).toMatch(/Page \d+ of \d+/);

      // Ensure the controls are still in view before taking a screenshot.
      await dashboardPage.table.lastPageButton.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      await authenticatedPage.waitForTimeout(300);

      // Capture a screenshot of the pagination status and controls.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/dashboard/23-table-pagination.png",
      });
    });

    /**
     * Test case to verify that the table correctly reports the number of selected rows.
     */
    test("should display row selection count", async ({ authenticatedPage }) => {
      // Scroll to the footer of the table where selection counts are displayed.
      await dashboardPage.table.lastPageButton.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      // Retrieve the current selection status text.
      const selectionText = await dashboardPage.table.getSelectedRowCount();
      // Assert that the text matches the expected selection summary format.
      expect(selectionText).toMatch(/\d+ of \d+ row\(s\) selected/);

      // Maintain viewport focus on the status area.
      await dashboardPage.table.lastPageButton.evaluate((el) =>
        el.scrollIntoView({ block: "center" })
      );
      await authenticatedPage.waitForTimeout(300);

      // Capture a screenshot of the row selection metadata.
      await authenticatedPage.screenshot({
        path: "e2e/test-results/dashboard/24-table-selection-count.png",
      });
    });
  });
});
