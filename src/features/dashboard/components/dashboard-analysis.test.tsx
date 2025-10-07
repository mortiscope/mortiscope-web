import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { DashboardAnalysis } from "@/features/dashboard/components/dashboard-analysis";
import { useCaseDataPoller } from "@/features/dashboard/hooks/use-case-data-poller";
import { CaseData } from "@/features/dashboard/schemas/dashboard";

// Mock the custom polling hook to control data flow and prevent actual network requests.
vi.mock("@/features/dashboard/hooks/use-case-data-poller", () => ({
  useCaseDataPoller: vi.fn(),
}));

// Mock the UI Skeleton component to simplify the rendered output during loading states.
vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton-loader" />,
}));

// Mock the TooltipProvider to ensure tooltip logic is present without requiring complex DOM positioning.
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-provider">{children}</div>
  ),
}));

// Mock the Forensic Insights widget to verify its presence and the props it receives.
vi.mock("@/features/dashboard/components/forensic-insights-widget", () => ({
  ForensicInsightsWidget: (props: unknown) => (
    <div data-testid="forensic-insights-widget" data-props={JSON.stringify(props)} />
  ),
}));

// Mock the Verification Status widget to verify its presence and the props it receives.
vi.mock("@/features/dashboard/components/verification-status-widget", () => ({
  VerificationStatusWidget: (props: unknown) => (
    <div data-testid="verification-status-widget" data-props={JSON.stringify(props)} />
  ),
}));

// Mock the Quality Metrics widget to verify its presence and the props it receives.
vi.mock("@/features/dashboard/components/quality-metrics-widget", () => ({
  QualityMetricsWidget: (props: unknown) => (
    <div data-testid="quality-metrics-widget" data-props={JSON.stringify(props)} />
  ),
}));

// Mock the Dashboard Table container to verify its presence and the data passed to it.
vi.mock("@/features/dashboard/components/dashboard-table-container", () => ({
  DashboardTableContainer: (props: unknown) => (
    <div data-testid="dashboard-table-container" data-props={JSON.stringify(props)} />
  ),
}));

/**
 * Test suite for the `DashboardAnalysis` component.
 */
describe("DashboardAnalysis", () => {
  const mockInitialData: CaseData[] = [
    {
      caseId: "1",
      caseName: "Test Case",
      caseDate: "2025-01-01T00:00:00Z",
      verificationStatus: "Verified",
      pmiEstimation: "24h",
      oldestStage: "Pupa",
      averageConfidence: "95%",
      imageCount: 10,
      detectionCount: 5,
      location: {
        region: "Region I",
        province: "Province 1",
        city: "City 1",
        barangay: "Barangay 1",
      },
      temperature: "25",
    },
  ];
  const mockDateRange = {
    from: new Date("2025-01-01"),
    to: new Date("2025-01-31"),
  };

  /**
   * Test case to verify the basic layout and global provider rendering.
   */
  it("renders the tooltip provider and layout grid", async () => {
    // Arrange: Mock the poller to return initial case data.
    vi.mocked(useCaseDataPoller).mockReturnValue({
      data: mockInitialData,
    } as unknown as ReturnType<typeof useCaseDataPoller>);

    // Act: Render the dashboard analysis component.
    render(<DashboardAnalysis initialCaseData={mockInitialData} dateRange={mockDateRange} />);

    // Assert: Verify that the tooltip wrapper and at least one child widget are in the DOM.
    expect(screen.getByTestId("tooltip-provider")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("forensic-insights-widget")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that the component correctly initializes the data polling hook.
   */
  it("fetches case data using the poller hook", async () => {
    // Arrange: Mock the poller to return the specific initial dataset.
    vi.mocked(useCaseDataPoller).mockReturnValue({
      data: mockInitialData,
    } as unknown as ReturnType<typeof useCaseDataPoller>);

    // Act: Render the component.
    render(<DashboardAnalysis initialCaseData={mockInitialData} dateRange={mockDateRange} />);

    // Assert: Verify the hook was called with the correct parameters and data was passed to the table.
    expect(useCaseDataPoller).toHaveBeenCalledWith(mockInitialData, mockDateRange);

    await waitFor(() => {
      const tableContainer = screen.getByTestId("dashboard-table-container");
      const props = JSON.parse(tableContainer.getAttribute("data-props") || "{}");
      expect(props.data).toEqual(mockInitialData);
    });
  });

  /**
   * Test case to verify that the date filter state is propagated to all sub-widgets.
   */
  it("passes the date range to all widget components", async () => {
    // Arrange: Setup the hook to return initial data.
    vi.mocked(useCaseDataPoller).mockReturnValue({
      data: mockInitialData,
    } as unknown as ReturnType<typeof useCaseDataPoller>);

    // Act: Render the component.
    render(<DashboardAnalysis initialCaseData={mockInitialData} dateRange={mockDateRange} />);

    // Assert: Check each widget to ensure the date range prop matches the input date range.
    await waitFor(() => {
      const widgets = [
        "forensic-insights-widget",
        "verification-status-widget",
        "quality-metrics-widget",
        "dashboard-table-container",
      ];

      widgets.forEach((id) => {
        const element = screen.getByTestId(id);
        const props = JSON.parse(element.getAttribute("data-props") || "{}");
        expect(props.dateRange.from).toBe(mockDateRange.from.toISOString());
        expect(props.dateRange.to).toBe(mockDateRange.to.toISOString());
      });
    });
  });

  /**
   * Test case to verify that the UI reacts correctly when the polling hook returns updated information.
   */
  it("updates widgets when the poller returns new data", async () => {
    // Arrange: Define a new dataset with an additional case.
    const newData: CaseData[] = [
      ...mockInitialData,
      {
        ...mockInitialData[0],
        caseId: "case-2",
      },
    ];
    // Arrange: Mock the hook to return the expanded dataset.
    vi.mocked(useCaseDataPoller).mockReturnValue({
      data: newData,
    } as unknown as ReturnType<typeof useCaseDataPoller>);

    // Act: Render the component.
    render(<DashboardAnalysis initialCaseData={mockInitialData} dateRange={mockDateRange} />);

    // Assert: Verify that the child components receive the updated data length and content.
    await waitFor(() => {
      const tableContainer = screen.getByTestId("dashboard-table-container");
      const props = JSON.parse(tableContainer.getAttribute("data-props") || "{}");
      expect(props.data).toHaveLength(2);
      expect(props.data).toEqual(newData);
    });
  });
});
