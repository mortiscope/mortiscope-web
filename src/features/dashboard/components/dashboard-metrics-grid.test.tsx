import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardMetricsGrid } from "@/features/dashboard/components/dashboard-metrics-grid";
import { useMetricsPoller } from "@/features/dashboard/hooks/use-metrics-poller";

// Mock the custom hook to control the polling state and data returned to the grid.
vi.mock("@/features/dashboard/hooks/use-metrics-poller", () => ({
  useMetricsPoller: vi.fn(),
}));

// Mock the skeleton component to verify that loading states are handled visually.
vi.mock("@/features/dashboard/components/dashboard-skeleton", () => ({
  DashboardMetricsGridSkeleton: () => <div data-testid="metrics-skeleton" />,
}));

// Mock utility functions to ensure consistent formatting of numerical values in tests.
vi.mock("@/lib/utils", () => ({
  formatConfidence: (val: number) => `${(val * 100).toFixed(0)}%`,
}));

// Mock the Card components to simplify the DOM structure for easier querying.
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="metric-card" className={className}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="metric-title" className={className}>
      {children}
    </div>
  ),
}));

/**
 * Test suite for the `DashboardMetricsGrid` component.
 */
describe("DashboardMetricsGrid", () => {
  const mockData = {
    verified: 5,
    totalCases: 10,
    totalImages: 50,
    verifiedImages: 25,
    totalDetectionsCount: 200,
    verifiedDetectionsCount: 100,
    averagePMI: 24.5,
    averageConfidence: 0.95,
    correctionRate: 12.5,
    activeCases: 2,
    completedCases: 8,
  };

  // Reset mocks before each test to ensure a clean state and prevent cross-test contamination.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the skeleton loader is displayed during the initial fetch.
   */
  it("renders the skeleton when fetching and no data is available", () => {
    // Arrange: Mock the hook to indicate an active fetch with no existing data.
    vi.mocked(useMetricsPoller).mockReturnValue({
      data: null,
      isFetching: true,
    } as unknown as ReturnType<typeof useMetricsPoller>);

    // Act: Render the metrics grid.
    render(<DashboardMetricsGrid initialData={mockData} dateRange={undefined} />);

    // Assert: Check for the presence of the skeleton loader.
    expect(screen.getByTestId("metrics-skeleton")).toBeInTheDocument();
  });

  /**
   * Test case to verify that initial server-side data is used while polling is inactive or pending.
   */
  it("renders metrics using initial data when polling data is not yet available", () => {
    // Arrange: Mock the hook to return null data while not fetching.
    vi.mocked(useMetricsPoller).mockReturnValue({
      data: null,
      isFetching: false,
    } as unknown as ReturnType<typeof useMetricsPoller>);

    // Act: Render the grid with `initialData`.
    render(<DashboardMetricsGrid initialData={mockData} dateRange={undefined} />);

    // Assert: Verify that the labels and values match the `initialData` object.
    expect(screen.getByText("Verified Cases")).toBeInTheDocument();
    expect(screen.getByText("5 / 10")).toBeInTheDocument();
    expect(screen.getAllByTestId("metric-card")).toHaveLength(6);
  });

  /**
   * Test case to verify that the UI updates when the polling hook retrieves refreshed data.
   */
  it("renders metrics using polled data when available", () => {
    // Arrange: Define updated metrics that differ from the initial state.
    const polledData = {
      ...mockData,
      verified: 8,
      totalCases: 12,
      averagePMI: 30.0,
    };

    // Arrange: Mock the hook to return the new `polledData`.
    vi.mocked(useMetricsPoller).mockReturnValue({
      data: polledData,
      isFetching: false,
    } as unknown as ReturnType<typeof useMetricsPoller>);

    // Act: Render the component.
    render(<DashboardMetricsGrid initialData={mockData} dateRange={undefined} />);

    // Assert: Verify that the UI reflects the values from the `polledData`.
    expect(screen.getByText("8 / 12")).toBeInTheDocument();
    expect(screen.getByText("30.00 hours")).toBeInTheDocument();
  });

  /**
   * Test case to verify that empty datasets display safe fallback characters instead of broken calculations.
   */
  it("displays fallback values when there is no data (totalCases is 0)", () => {
    // Arrange: Set `totalCases` to zero to trigger empty-state logic.
    const emptyData = {
      ...mockData,
      totalCases: 0,
    };

    // Arrange: Mock the hook to return the empty dataset.
    vi.mocked(useMetricsPoller).mockReturnValue({
      data: emptyData,
      isFetching: false,
    } as unknown as ReturnType<typeof useMetricsPoller>);

    // Act: Render the component.
    render(<DashboardMetricsGrid initialData={emptyData} dateRange={undefined} />);

    // Assert: Check that ratios show 0/0 and averages show the em-dash fallback.
    const cards = screen.getAllByTestId("metric-card");

    expect(cards[0]).toHaveTextContent("0 / 0");
    expect(cards[1]).toHaveTextContent("0 / 0");
    expect(cards[2]).toHaveTextContent("0 / 0");
    expect(cards[3]).toHaveTextContent("—");
    expect(cards[4]).toHaveTextContent("—");
    expect(cards[5]).toHaveTextContent("—");
  });

  /**
   * Test case to verify that the `onLoadingChange` callback is triggered whenever the fetching state toggles.
   */
  it("calls onLoadingChange when isFetching state changes", () => {
    // Arrange: Initialize a mock callback and set `isFetching` to true.
    const onLoadingChange = vi.fn();

    vi.mocked(useMetricsPoller).mockReturnValue({
      data: mockData,
      isFetching: true,
    } as unknown as ReturnType<typeof useMetricsPoller>);

    // Act: Initial render.
    const { rerender } = render(
      <DashboardMetricsGrid
        initialData={mockData}
        dateRange={undefined}
        onLoadingChange={onLoadingChange}
      />
    );

    // Assert: Verify the callback was called with `true`.
    expect(onLoadingChange).toHaveBeenCalledWith(true);

    // Act: Rerender with `isFetching` set to false.
    vi.mocked(useMetricsPoller).mockReturnValue({
      data: mockData,
      isFetching: false,
    } as unknown as ReturnType<typeof useMetricsPoller>);

    rerender(
      <DashboardMetricsGrid
        initialData={mockData}
        dateRange={undefined}
        onLoadingChange={onLoadingChange}
      />
    );

    // Assert: Verify the callback was called with `false`.
    expect(onLoadingChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the confidence score is formatted as a percentage string.
   */
  it("renders formatted confidence score correctly", () => {
    // Arrange: Provide data with a confidence decimal.
    vi.mocked(useMetricsPoller).mockReturnValue({
      data: mockData,
      isFetching: false,
    } as unknown as ReturnType<typeof useMetricsPoller>);

    // Act: Render the grid.
    render(<DashboardMetricsGrid initialData={mockData} dateRange={undefined} />);

    // Assert: Verify that 0.95 is displayed as 95%.
    expect(screen.getByText("95%")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the correction rate displays with a percentage symbol.
   */
  it("renders correction rate with percentage symbol", () => {
    // Arrange: Provide valid metric data.
    vi.mocked(useMetricsPoller).mockReturnValue({
      data: mockData,
      isFetching: false,
    } as unknown as ReturnType<typeof useMetricsPoller>);

    // Act: Render the grid.
    render(<DashboardMetricsGrid initialData={mockData} dateRange={undefined} />);

    // Assert: Verify the correction rate string.
    expect(screen.getByText("12.5%")).toBeInTheDocument();
  });
});
