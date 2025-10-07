import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { QualityMetricsWidget } from "@/features/dashboard/components/quality-metrics-widget";
import { useQualityMetricsPoller } from "@/features/dashboard/hooks/use-quality-metrics-poller";

// Mock the polling hook to control data availability and fetching states during testing.
vi.mock("@/features/dashboard/hooks/use-quality-metrics-poller", () => ({
  useQualityMetricsPoller: vi.fn(),
}));

// Mock the toolbar to simulate view selection and modal trigger interactions.
vi.mock("@/features/dashboard/components/quality-metrics-toolbar", () => ({
  QualityMetricsToolbar: ({
    onViewSelect,
    onInfoClick,
    selectedView,
  }: {
    onViewSelect: (view: string) => void;
    onInfoClick: () => void;
    selectedView: string;
  }) => (
    <div data-testid="mock-toolbar">
      <span data-testid="current-view">{selectedView}</span>
      <button onClick={() => onViewSelect("performance")} data-testid="btn-performance">
        Model Performance by Stage
      </button>
      <button onClick={() => onViewSelect("correction")} data-testid="btn-correction">
        User Correction Ratio
      </button>
      <button onClick={() => onViewSelect("confidence")} data-testid="btn-confidence">
        Confidence Score Distribution
      </button>
      <button onClick={() => onViewSelect("unknown")} data-testid="btn-unknown">
        Unknown
      </button>
      <button onClick={onInfoClick} data-testid="btn-info">
        Information Modal
      </button>
    </div>
  ),
}));

// Mock specific chart components to simplify the render tree and focus on data passing.
vi.mock("@/features/dashboard/components/dashboard-line-chart", () => ({
  DashboardLineChart: () => null,
}));

vi.mock("@/features/dashboard/components/dashboard-pie-chart", () => ({
  DashboardPieChart: () => null,
}));

vi.mock("@/features/dashboard/components/dashboard-distribution-chart", () => ({
  DashboardDistributionChart: () => null,
}));

// Mock the information modal to verify state-driven visibility.
vi.mock("@/features/dashboard/components/quality-metrics-modal", () => ({
  QualityMetricsModal: () => null,
}));

// Mock Next.js dynamic imports to ensure asynchronous components render immediately in the test.
vi.mock("next/dynamic", () => ({
  default: (
    loader: () => Promise<unknown>,
    options: { loading?: () => React.JSX.Element; ssr?: boolean }
  ) => {
    const DynamicComponent = (props: { data?: unknown[]; isOpen?: boolean }) => {
      React.useEffect(() => {
        try {
          loader()
            .then(() => {})
            .catch(() => {});
        } catch {}
      }, []);

      return (
        <>
          {options?.loading && <div hidden>{options.loading()}</div>}
          {props.data ? (
            <div data-testid="mock-chart" data-props={JSON.stringify(props.data)} />
          ) : null}
          {props.isOpen !== undefined ? (
            props.isOpen ? (
              <div data-testid="mock-modal" />
            ) : null
          ) : null}
        </>
      );
    };
    DynamicComponent.displayName = "LoadableComponent";
    return DynamicComponent;
  },
}));

// Mock the UI Skeleton used for loading states.
vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="mock-skeleton" />,
}));

// Mock the loading spinner for partial data states.
vi.mock("react-spinners", () => ({
  BeatLoader: () => <div data-testid="beat-loader" />,
}));

// Mock Framer Motion to bypass animation logic.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
  },
}));

/**
 * Test suite for the `QualityMetricsWidget` component.
 */
describe("QualityMetricsWidget", () => {
  const mockDateRange = undefined;

  const mockData = {
    modelPerformanceData: [{ stage: "Stage 1", accuracy: 90 }],
    correctionData: [{ name: "Verified", value: 100 }],
    confidenceData: [{ range: "90-100", count: 50 }],
  };

  /**
   * Test case to verify that the skeleton UI is displayed when no data is available during a fetch.
   */
  it("renders the skeleton during initial loading (no data)", () => {
    // Arrange: Mock the poller to return a fetching state with null data.
    vi.mocked(useQualityMetricsPoller).mockReturnValue({
      modelPerformanceData: null,
      correctionData: null,
      confidenceData: null,
      isFetching: true,
    } as unknown as ReturnType<typeof useQualityMetricsPoller>);

    render(<QualityMetricsWidget dateRange={mockDateRange} />);

    // Assert: Check that the skeleton component is rendered.
    expect(screen.getByTestId("mock-skeleton")).toBeInTheDocument();
  });

  /**
   * Test case to verify the initial render state and default chart data application.
   */
  it("renders the default view (Performance) when data is loaded", async () => {
    // Arrange: Mock the poller to return valid data.
    vi.mocked(useQualityMetricsPoller).mockReturnValue({
      ...mockData,
      isFetching: false,
    } as unknown as ReturnType<typeof useQualityMetricsPoller>);

    render(<QualityMetricsWidget dateRange={mockDateRange} />);

    // Assert: Verify the toolbar and the correct initial card title are present.
    expect(screen.getByTestId("mock-toolbar")).toBeInTheDocument();
    expect(
      screen.getByText("Model Performance by Stage", { selector: '[data-slot="card-title"]' })
    ).toBeInTheDocument();

    // Assert: Confirm that the chart component receives the expected performance data.
    await waitFor(() => {
      const chart = screen.getByTestId("mock-chart");
      expect(chart).toBeInTheDocument();
      expect(JSON.parse(chart.getAttribute("data-props")!)).toEqual(mockData.modelPerformanceData);
    });
  });

  /**
   * Test case to verify switching the view to the User Correction Ratio metric.
   */
  it("switches to Correction view and renders chart", async () => {
    // Arrange: Render the widget with data.
    vi.mocked(useQualityMetricsPoller).mockReturnValue({
      ...mockData,
      isFetching: false,
    } as unknown as ReturnType<typeof useQualityMetricsPoller>);

    render(<QualityMetricsWidget dateRange={mockDateRange} />);

    // Act: Select the correction ratio view.
    fireEvent.click(screen.getByTestId("btn-correction"));

    // Assert: Verify the chart updates to the correction data and the card title reflects the change.
    await waitFor(() => {
      const chart = screen.getByTestId("mock-chart");
      expect(chart).toBeInTheDocument();
      expect(JSON.parse(chart.getAttribute("data-props")!)).toEqual(mockData.correctionData);
    });

    expect(
      screen.getByText("User Correction Ratio", { selector: '[data-slot="card-title"]' })
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify switching the view to the Confidence Score Distribution metric.
   */
  it("switches to Confidence view and renders chart", async () => {
    // Arrange: Render the widget with data.
    vi.mocked(useQualityMetricsPoller).mockReturnValue({
      ...mockData,
      isFetching: false,
    } as unknown as ReturnType<typeof useQualityMetricsPoller>);

    render(<QualityMetricsWidget dateRange={mockDateRange} />);

    // Act: Select the confidence distribution view.
    fireEvent.click(screen.getByTestId("btn-confidence"));

    // Assert: Verify the chart updates to the confidence data and the card title reflects the change.
    await waitFor(() => {
      const chart = screen.getByTestId("mock-chart");
      expect(chart).toBeInTheDocument();
      expect(JSON.parse(chart.getAttribute("data-props")!)).toEqual(mockData.confidenceData);
    });

    expect(
      screen.getByText("Confidence Score Distribution", { selector: '[data-slot="card-title"]' })
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that an empty dataset triggers a loading spinner for all views.
   */
  it("renders ChartLoader when data is empty for the selected view", async () => {
    // Arrange: Mock the poller to return empty arrays.
    vi.mocked(useQualityMetricsPoller).mockReturnValue({
      modelPerformanceData: [],
      correctionData: [],
      confidenceData: [],
      isFetching: false,
    } as unknown as ReturnType<typeof useQualityMetricsPoller>);

    render(<QualityMetricsWidget dateRange={mockDateRange} />);

    // Assert: Confirm the loader is shown for the default performance view.
    expect(screen.getByTestId("beat-loader")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-chart")).not.toBeInTheDocument();

    // Act & Assert: Check that switching to correction also shows a loader.
    fireEvent.click(screen.getByTestId("btn-correction"));
    await waitFor(() => {
      expect(screen.getAllByTestId("beat-loader")).toHaveLength(1);
    });

    // Act & Assert: Check that switching to confidence also shows a loader.
    fireEvent.click(screen.getByTestId("btn-confidence"));
    await waitFor(() => {
      expect(screen.getAllByTestId("beat-loader")).toHaveLength(1);
    });
  });

  /**
   * Test case to verify the component state when an invalid or unknown view is selected.
   */
  it("handles unknown view correctly (fallback icon)", async () => {
    // Arrange: Render the widget in a ready state.
    vi.mocked(useQualityMetricsPoller).mockReturnValue({
      ...mockData,
      isFetching: false,
    } as unknown as ReturnType<typeof useQualityMetricsPoller>);

    render(<QualityMetricsWidget dateRange={mockDateRange} />);

    // Act: Click a button representing an unhandled view state.
    fireEvent.click(screen.getByTestId("btn-unknown"));

    // Assert: Verify that neither the chart nor the loader are rendered.
    await waitFor(() => {
      expect(screen.queryByTestId("mock-chart")).not.toBeInTheDocument();
      expect(screen.queryByTestId("beat-loader")).not.toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that clicking the info button toggles the modal visibility.
   */
  it("opens the modal when info button is clicked", () => {
    // Arrange: Render the widget in a ready state.
    vi.mocked(useQualityMetricsPoller).mockReturnValue({
      ...mockData,
      isFetching: false,
    } as unknown as ReturnType<typeof useQualityMetricsPoller>);

    render(<QualityMetricsWidget dateRange={mockDateRange} />);

    // Act: Click the information button.
    fireEvent.click(screen.getByTestId("btn-info"));

    // Assert: Verify that the modal is now rendered.
    expect(screen.getByTestId("mock-modal")).toBeInTheDocument();
  });
});
