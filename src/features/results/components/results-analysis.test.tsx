import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PmiWidget } from "@/features/results/components/pmi-widget";
import { ResultsAnalysis } from "@/features/results/components/results-analysis";
import { ReviewedImagesWidget } from "@/features/results/components/reviewed-images-widget";
import { SummaryChartWidget } from "@/features/results/components/summary-chart-widget";

// Mock the `PmiWidget` component to verify unit selection and information triggers.
vi.mock("@/features/results/components/pmi-widget", () => ({
  PmiWidget: vi.fn(
    ({
      onUnitSelect,
      onInfoClick,
    }: {
      onUnitSelect: (unit: string) => void;
      onInfoClick: () => void;
    }) => (
      <div data-testid="pmi-widget">
        <button onClick={() => onUnitSelect("Days")}>Select Days</button>
        <button onClick={onInfoClick}>Info</button>
      </div>
    )
  ),
}));

// Mock the `SummaryChartWidget` to verify data source selection and information triggers.
vi.mock("@/features/results/components/summary-chart-widget", () => ({
  SummaryChartWidget: vi.fn(
    ({
      onDataSourceSelect,
      onInfoClick,
    }: {
      onDataSourceSelect: (id: string) => void;
      onInfoClick: () => void;
    }) => (
      <div data-testid="summary-chart-widget">
        <button onClick={() => onDataSourceSelect("upload-1")}>Select Upload 1</button>
        <button onClick={() => onDataSourceSelect("maximum-stages")}>Select Max Stages</button>
        <button onClick={onInfoClick}>Info</button>
      </div>
    )
  ),
}));

// Mock the `ReviewedImagesWidget` to isolate testing of the main analysis container.
vi.mock("@/features/results/components/reviewed-images-widget", () => ({
  ReviewedImagesWidget: vi.fn(() => <div data-testid="reviewed-images-widget" />),
}));

// Mock the `ResultsAnalysisSkeleton` to confirm it displays during loading states.
vi.mock("@/features/results/components/results-skeleton", () => ({
  ResultsAnalysisSkeleton: () => <div data-testid="results-skeleton" />,
}));

// Mock the `PmiExplanationModal` to verify its visibility control through state handlers.
vi.mock("@/features/results/components/pmi-explanation-modal", () => ({
  PmiExplanationModal: vi.fn(
    ({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) =>
      isOpen ? (
        <div data-testid="pmi-explanation-modal">
          <button onClick={() => onOpenChange(false)}>Close</button>
        </div>
      ) : null
  ),
}));

// Mock the `CaseSummaryInformationModal` to verify visibility triggers from the chart widget.
vi.mock("@/features/results/components/case-summary-information-modal", () => ({
  CaseSummaryInformationModal: vi.fn(
    ({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) =>
      isOpen ? (
        <div data-testid="case-summary-modal">
          <button onClick={() => onOpenChange(false)}>Close</button>
        </div>
      ) : null
  ),
}));

// Mock the `TooltipProvider` to bypass Radix UI context requirements in a unit test.
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Initialize standard mock data representing the core case entity.
const mockCaseData = {
  id: "case-123",
  userId: "user-123",
  caseName: "Mortiscope Case",
  temperatureCelsius: 25,
  locationRegion: "Region",
  locationProvince: "Province",
  locationCity: "City",
  locationBarangay: "Barangay",
  caseDate: new Date(),
  createdAt: new Date(),
  recalculationNeeded: false,
  status: "active" as const,
  notes: "",
};

// Initialize mock data representing the results of a forensic entomology analysis.
const mockAnalysisResult = {
  caseId: "case-123",
  status: "completed" as const,
  pmiDays: 2.5,
  pmiHours: 60,
  pmiMinutes: 3600,
  explanation: "Analysis complete",
  totalCounts: null,
  oldestStageDetected: "pupa",
  pmiSourceImageKey: null,
  stageUsedForCalculation: null,
  temperatureProvided: 25,
  calculatedAdh: 1000,
  ldtUsed: 10,
  updatedAt: new Date(),
};

// Initialize mock upload objects with associated bug detections for data aggregation testing.
const mockUploads = [
  {
    id: "upload-1",
    key: "key-1",
    name: "image-1.jpg",
    url: "http://example.com/1.jpg",
    size: 1000,
    type: "image/jpeg",
    width: 100,
    height: 100,
    userId: "user-123",
    caseId: "case-123",
    createdAt: new Date(),
    detections: [
      {
        id: "det-1",
        uploadId: "upload-1",
        label: "adult",
        originalLabel: "adult",
        confidence: 0.9,
        originalConfidence: 0.9,
        xMin: 0,
        yMin: 0,
        xMax: 10,
        yMax: 10,
        status: "user_confirmed" as const,
        createdById: "user-123",
        lastModifiedById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ],
  },
  {
    id: "upload-2",
    key: "key-2",
    name: "image-2.jpg",
    url: "http://example.com/2.jpg",
    size: 1000,
    type: "image/jpeg",
    width: 100,
    height: 100,
    userId: "user-123",
    caseId: "case-123",
    createdAt: new Date(),
    detections: [
      {
        id: "det-2",
        uploadId: "upload-2",
        label: "pupa",
        originalLabel: "pupa",
        confidence: 0.8,
        originalConfidence: 0.8,
        xMin: 0,
        yMin: 0,
        xMax: 10,
        yMax: 10,
        status: "model_generated" as const,
        createdById: "user-123",
        lastModifiedById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ],
  },
];

/**
 * Test suite for the `ResultsAnalysis` component.
 */
describe("ResultsAnalysis", () => {
  /**
   * Test case to verify that a skeleton UI appears while data is fetching.
   */
  it("renders the skeleton when isLoading is true", () => {
    // Arrange: Render with the loading flag enabled.
    render(
      <ResultsAnalysis
        caseData={mockCaseData}
        analysisResult={mockAnalysisResult}
        uploads={mockUploads}
        isLoading={true}
      />
    );

    // Assert: Confirm the skeleton is present and actual widgets are absent.
    expect(screen.getByTestId("results-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("pmi-widget")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that missing case metadata triggers a loading/skeleton state.
   */
  it("renders the skeleton when caseData is missing", () => {
    // Arrange: Provide an undefined `caseData` object.
    render(
      <ResultsAnalysis
        caseData={undefined}
        analysisResult={mockAnalysisResult}
        uploads={mockUploads}
        isLoading={false}
      />
    );

    // Assert: Confirm the skeleton is displayed as a fallback.
    expect(screen.getByTestId("results-skeleton")).toBeInTheDocument();
  });

  /**
   * Test case to verify that missing analysis results trigger a loading/skeleton state.
   */
  it("renders the skeleton when analysisResult is missing", () => {
    // Arrange: Provide a null `analysisResult`.
    render(
      <ResultsAnalysis
        caseData={mockCaseData}
        analysisResult={null}
        uploads={mockUploads}
        isLoading={false}
      />
    );

    // Assert: Confirm the skeleton is displayed as a fallback.
    expect(screen.getByTestId("results-skeleton")).toBeInTheDocument();
  });

  /**
   * Test case to verify the successful rendering of all primary dashboard widgets.
   */
  it("renders all widgets when data is available", () => {
    // Arrange: Render with complete valid data.
    render(
      <ResultsAnalysis
        caseData={mockCaseData}
        analysisResult={mockAnalysisResult}
        uploads={mockUploads}
        isLoading={false}
      />
    );

    // Assert: Verify presence of the chart, PMI widget, and image review tracker.
    expect(screen.getByTestId("summary-chart-widget")).toBeInTheDocument();
    expect(screen.getByTestId("pmi-widget")).toBeInTheDocument();
    expect(screen.getByTestId("reviewed-images-widget")).toBeInTheDocument();
  });

  /**
   * Test case to verify that PMI values and units are correctly passed to the PMI widget.
   */
  it("passes correct initial props to PmiWidget", () => {
    // Arrange: Render the analysis container.
    render(
      <ResultsAnalysis
        caseData={mockCaseData}
        analysisResult={mockAnalysisResult}
        uploads={mockUploads}
        isLoading={false}
      />
    );

    // Assert: Confirm the widget received values matching `mockAnalysisResult`.
    expect(PmiWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        pmiValue: 60,
        selectedUnit: "Hours",
        hasEstimation: true,
        isRecalculationNeeded: false,
      }),
      undefined
    );
  });

  /**
   * Test case to verify that the parent container manages time unit state changes.
   */
  it("updates PmiWidget props when unit is changed", async () => {
    // Arrange: Initialize user interactions.
    const user = userEvent.setup();
    render(
      <ResultsAnalysis
        caseData={mockCaseData}
        analysisResult={mockAnalysisResult}
        uploads={mockUploads}
        isLoading={false}
      />
    );

    // Act: Click the mock button that triggers a unit change to 'Days'.
    const selectDaysButton = screen.getByText("Select Days");
    await user.click(selectDaysButton);

    // Assert: Confirm the widget was updated with the new unit and corresponding value.
    expect(PmiWidget).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pmiValue: 2.5,
        selectedUnit: "Days",
      }),
      undefined
    );
  });

  /**
   * Test case to verify that image review progress is correctly calculated from the uploads array.
   */
  it("passes correct reviewed counts to ReviewedImagesWidget", () => {
    // Arrange: Render the analysis container.
    render(
      <ResultsAnalysis
        caseData={mockCaseData}
        analysisResult={mockAnalysisResult}
        uploads={mockUploads}
        isLoading={false}
      />
    );

    // Assert: Confirm that one out of two images is marked as reviewed based on detection status.
    expect(ReviewedImagesWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        hasDetections: true,
        reviewedCount: 1,
        totalCount: 2,
      }),
      undefined
    );
  });

  /**
   * Test case to verify that bug counts are aggregated globally by default.
   */
  it("aggregates chart data correctly for 'overall' source by default", () => {
    // Arrange: Render the analysis container.
    render(
      <ResultsAnalysis
        caseData={mockCaseData}
        analysisResult={mockAnalysisResult}
        uploads={mockUploads}
        isLoading={false}
      />
    );

    // Assert: Confirm the chart data reflects the total count of each bug stage across all images.
    expect(SummaryChartWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedDataSource: "overall",
        chartData: expect.arrayContaining([
          expect.objectContaining({ name: "adult", quantity: 1 }),
          expect.objectContaining({ name: "pupa", quantity: 1 }),
        ]),
      }),
      undefined
    );
  });

  /**
   * Test case to verify that the chart filters data when a specific image is selected.
   */
  it("updates chart data when a specific upload is selected", async () => {
    // Arrange: Initialize user interactions.
    const user = userEvent.setup();
    render(
      <ResultsAnalysis
        caseData={mockCaseData}
        analysisResult={mockAnalysisResult}
        uploads={mockUploads}
        isLoading={false}
      />
    );

    // Act: Click the mock button that triggers a source change to 'upload-1'.
    const selectUploadButton = screen.getByText("Select Upload 1");
    await user.click(selectUploadButton);

    // Assert: Confirm the chart was updated to show only detections belonging to 'upload-1'.
    expect(SummaryChartWidget).toHaveBeenLastCalledWith(
      expect.objectContaining({
        selectedDataSource: "upload-1",
        chartData: expect.arrayContaining([
          expect.objectContaining({ name: "adult", quantity: 1 }),
          expect.objectContaining({ name: "pupa", quantity: 0 }),
        ]),
      }),
      undefined
    );
  });

  /**
   * Test case to verify that 'maximum-stages' logic finds the highest count per stage across images.
   */
  it("updates chart data when 'maximum-stages' is selected", async () => {
    // Arrange: Initialize user interactions and provide data where one image has more detections than another.
    const user = userEvent.setup();
    const mockUploadsWithMaxStages = [
      {
        ...mockUploads[0],
        detections: [
          ...mockUploads[0].detections,
          { ...mockUploads[0].detections[0], id: "det-3" },
        ],
      },
      {
        ...mockUploads[1],
      },
    ];

    render(
      <ResultsAnalysis
        caseData={mockCaseData}
        analysisResult={mockAnalysisResult}
        uploads={mockUploadsWithMaxStages}
        isLoading={false}
      />
    );

    // Act: Click the mock button to select the maximum-stages data source.
    const selectMaxButton = screen.getByText("Select Max Stages");
    await user.click(selectMaxButton);

    // Assert: Confirm the chart displays the maximum counts found (2 adults in one image, 1 pupa in another).
    expect(SummaryChartWidget).toHaveBeenLastCalledWith(
      expect.objectContaining({
        selectedDataSource: "maximum-stages",
        chartData: expect.arrayContaining([
          expect.objectContaining({ name: "adult", quantity: 2 }),
          expect.objectContaining({ name: "pupa", quantity: 1 }),
        ]),
      }),
      undefined
    );
  });

  /**
   * Test case to verify the trigger mechanism for the PMI explanation modal.
   */
  it("opens PmiExplanationModal when info is clicked on PmiWidget", async () => {
    // Arrange: Initialize user interactions.
    const user = userEvent.setup();
    render(
      <ResultsAnalysis
        caseData={mockCaseData}
        analysisResult={mockAnalysisResult}
        uploads={mockUploads}
        isLoading={false}
      />
    );

    // Assert: Ensure the modal is initially hidden.
    expect(screen.queryByTestId("pmi-explanation-modal")).not.toBeInTheDocument();

    // Act: Click the info trigger within the PMI widget.
    const pmiWidget = screen.getByTestId("pmi-widget");
    const infoButton = pmiWidget.querySelector("button:last-child");
    await user.click(infoButton!);

    // Assert: Confirm the explanation modal is now visible in the DOM.
    await waitFor(() => {
      expect(screen.getByTestId("pmi-explanation-modal")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify the trigger mechanism for the chart informational modal.
   */
  it("opens CaseSummaryInformationModal when info is clicked on SummaryChartWidget", async () => {
    // Arrange: Initialize user interactions.
    const user = userEvent.setup();
    render(
      <ResultsAnalysis
        caseData={mockCaseData}
        analysisResult={mockAnalysisResult}
        uploads={mockUploads}
        isLoading={false}
      />
    );

    // Assert: Ensure the modal is initially hidden.
    expect(screen.queryByTestId("case-summary-modal")).not.toBeInTheDocument();

    // Act: Click the info trigger within the chart widget.
    const chartWidget = screen.getByTestId("summary-chart-widget");
    const infoButton = chartWidget.querySelector("button:last-child");
    await user.click(infoButton!);

    // Assert: Confirm the summary info modal is now visible in the DOM.
    await waitFor(() => {
      expect(screen.getByTestId("case-summary-modal")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that recalculation status is propagated down to relevant widgets.
   */
  it("handles isRecalculationNeeded prop correctly", () => {
    // Arrange: Render with the recalculation flag set to true.
    render(
      <ResultsAnalysis
        caseData={mockCaseData}
        analysisResult={mockAnalysisResult}
        uploads={mockUploads}
        isLoading={false}
        isRecalculationNeeded={true}
      />
    );

    // Assert: Confirm the PMI widget received the flag to display a warning.
    expect(PmiWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        isRecalculationNeeded: true,
      }),
      undefined
    );
  });

  /**
   * Test case to verify the conditional logic for enabling the PMI info button.
   */
  it("calculates isInfoButtonEnabled correctly based on estimation presence", () => {
    // Arrange: Render with valid analysis data.
    render(
      <ResultsAnalysis
        caseData={mockCaseData}
        analysisResult={mockAnalysisResult}
        uploads={mockUploads}
        isLoading={false}
      />
    );

    // Assert: Confirm the info button is enabled when estimation values are present.
    expect(PmiWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        isInfoButtonEnabled: true,
      }),
      undefined
    );
  });

  /**
   * Test case to verify that cases featuring only adult stages allow viewing explanation even without a PMI value.
   */
  it("enables info button for adult-only case with no estimation", () => {
    // Arrange: Create a result where only adults are found, resulting in no numeric PMI estimate.
    const adultOnlyResult = {
      ...mockAnalysisResult,
      pmiMinutes: null,
      pmiHours: null,
      pmiDays: null,
      oldestStageDetected: "adult",
    };

    render(
      <ResultsAnalysis
        caseData={mockCaseData}
        analysisResult={adultOnlyResult}
        uploads={mockUploads}
        isLoading={false}
      />
    );

    // Assert: Confirm the info button is still interactive so users can read why no PMI was estimated.
    expect(PmiWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        hasEstimation: false,
        isInfoButtonEnabled: true,
      }),
      undefined
    );
  });
});
