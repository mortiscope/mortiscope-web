import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { ForensicInsightsWidget } from "@/features/dashboard/components/forensic-insights-widget";
import { useForensicInsightsPoller } from "@/features/dashboard/hooks/use-forensic-insights-poller";

// Mock the polling hook to control data states and loading status during tests.
vi.mock("@/features/dashboard/hooks/use-forensic-insights-poller", () => ({
  useForensicInsightsPoller: vi.fn(),
}));

// Mock the toolbar component to simulate view switching and modal triggers.
vi.mock("@/features/dashboard/components/forensic-insights-toolbar", () => ({
  ForensicInsightsToolbar: ({
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
      <button onClick={() => onViewSelect("life-stage")} data-testid="btn-life">
        Life Stage
      </button>
      <button onClick={() => onViewSelect("pmi")} data-testid="btn-pmi">
        PMI Distribution
      </button>
      <button onClick={() => onViewSelect("sampling")} data-testid="btn-sampling">
        Sampling Density
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

// Mock the bar chart to verify that correct data and labels are passed down.
vi.mock("@/features/dashboard/components/dashboard-bar-chart", () => ({
  DashboardBarChart: (props: { data: unknown[]; xAxisLabel?: string; yAxisLabel?: string }) => (
    <div data-testid="mock-bar-chart" data-props={JSON.stringify(props)} />
  ),
}));

// Mock the info modal to verify its visibility state.
vi.mock("@/features/dashboard/components/forensic-insights-modal", () => ({
  ForensicInsightsModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="mock-modal" /> : null,
}));

// Mock Next.js dynamic imports to ensure components are rendered synchronously in the test environment.
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
            <div data-testid="mock-bar-chart" data-props={JSON.stringify(props)} />
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

// Mock the BeatLoader used for partial data loading states.
vi.mock("react-spinners", () => ({
  BeatLoader: () => <div data-testid="beat-loader" />,
}));

// Mock Framer Motion to bypass animation delays in the test environment.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
  },
}));

/**
 * Test suite for the `ForensicInsightsWidget` component.
 */
describe("ForensicInsightsWidget", () => {
  const mockDateRange = undefined;

  const mockLifeData = [{ name: "Egg", quantity: 10 }];
  const mockPmiData = [{ name: "0-12h", quantity: 5 }];
  const mockSamplingData = [{ name: "Low", quantity: 20 }];

  /**
   * Test case to verify that the skeleton UI is displayed while the data is fetching.
   */
  it("renders the skeleton during initial loading", () => {
    // Arrange: Mock the poller to return a fetching state with no data.
    vi.mocked(useForensicInsightsPoller).mockReturnValue({
      lifeStageData: null,
      pmiData: null,
      samplingData: null,
      isFetching: true,
    } as unknown as ReturnType<typeof useForensicInsightsPoller>);

    render(<ForensicInsightsWidget dateRange={mockDateRange} />);

    // Assert: Check that the `Skeleton` component is rendered.
    expect(screen.getByTestId("mock-skeleton")).toBeInTheDocument();
  });

  /**
   * Test case to verify the initial render and default chart configuration.
   */
  it("renders the default view (Life Stage) correctly when data exists", async () => {
    // Arrange: Mock the poller to return complete datasets.
    vi.mocked(useForensicInsightsPoller).mockReturnValue({
      lifeStageData: mockLifeData,
      pmiData: mockPmiData,
      samplingData: mockSamplingData,
      isFetching: false,
    } as unknown as ReturnType<typeof useForensicInsightsPoller>);

    render(<ForensicInsightsWidget dateRange={mockDateRange} />);

    // Assert: Ensure the toolbar and default distribution heading are present.
    expect(screen.getByTestId("mock-toolbar")).toBeInTheDocument();
    expect(screen.getByText("Life Stage Distribution", { selector: "h1" })).toBeInTheDocument();

    // Assert: Check that the chart receives the correct data and axis labels for the life stage view.
    await waitFor(() => {
      const chart = screen.getByTestId("mock-bar-chart");
      const props = JSON.parse(chart.getAttribute("data-props") || "{}");

      expect(props.data).toEqual(mockLifeData);
      expect(props.xAxisLabel).toBe("Life Stage");
      expect(props.yAxisLabel).toBe("Quantity");
    });
  });

  /**
   * Test case to verify switching to the Post-Mortem Interval (PMI) distribution view.
   */
  it("switches to PMI view and updates chart configuration", async () => {
    // Arrange: Render the widget with available data.
    vi.mocked(useForensicInsightsPoller).mockReturnValue({
      lifeStageData: mockLifeData,
      pmiData: mockPmiData,
      samplingData: mockSamplingData,
      isFetching: false,
    } as unknown as ReturnType<typeof useForensicInsightsPoller>);

    render(<ForensicInsightsWidget dateRange={mockDateRange} />);

    // Act: Click the button to switch the view to PMI.
    fireEvent.click(screen.getByTestId("btn-pmi"));

    // Assert: Verify that the heading and chart properties update to reflect PMI data.
    expect(screen.getByText("PMI Distribution", { selector: "h1" })).toBeInTheDocument();

    await waitFor(() => {
      const chart = screen.getByTestId("mock-bar-chart");
      const props = JSON.parse(chart.getAttribute("data-props") || "{}");

      expect(props.data).toEqual(mockPmiData);
      expect(props.xAxisLabel).toBe("Time Interval");
      expect(props.yAxisLabel).toBe("Number of Cases");
    });
  });

  /**
   * Test case to verify switching to the Sampling Density view.
   */
  it("switches to Sampling view and updates chart configuration", async () => {
    // Arrange: Render the widget with available data.
    vi.mocked(useForensicInsightsPoller).mockReturnValue({
      lifeStageData: mockLifeData,
      pmiData: mockPmiData,
      samplingData: mockSamplingData,
      isFetching: false,
    } as unknown as ReturnType<typeof useForensicInsightsPoller>);

    render(<ForensicInsightsWidget dateRange={mockDateRange} />);

    // Act: Click the button to switch the view to Sampling.
    fireEvent.click(screen.getByTestId("btn-sampling"));

    // Assert: Verify that the heading and chart properties update to reflect Sampling data.
    expect(screen.getByText("Sampling Density", { selector: "h1" })).toBeInTheDocument();

    await waitFor(() => {
      const chart = screen.getByTestId("mock-bar-chart");
      const props = JSON.parse(chart.getAttribute("data-props") || "{}");

      expect(props.data).toEqual(mockSamplingData);
      expect(props.xAxisLabel).toBe("Image Count");
    });
  });

  /**
   * Test case to verify that a loader is shown if the selected view has no data.
   */
  it("renders ChartLoader (BeatLoader) when data for the selected view is empty", async () => {
    // Arrange: Mock the poller to return an empty array for the default life stage view.
    vi.mocked(useForensicInsightsPoller).mockReturnValue({
      lifeStageData: [],
      pmiData: mockPmiData,
      samplingData: mockSamplingData,
      isFetching: false,
    } as unknown as ReturnType<typeof useForensicInsightsPoller>);

    render(<ForensicInsightsWidget dateRange={mockDateRange} />);

    // Assert: Confirm that the `BeatLoader` is shown and the chart is hidden.
    expect(screen.getByTestId("beat-loader")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-bar-chart")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify the fallback behavior when an unrecognized view is selected.
   */
  it("handles unknown view correctly (fallback)", async () => {
    // Arrange: Render the widget with standard data.
    vi.mocked(useForensicInsightsPoller).mockReturnValue({
      lifeStageData: mockLifeData,
      pmiData: mockPmiData,
      samplingData: mockSamplingData,
      isFetching: false,
    } as unknown as ReturnType<typeof useForensicInsightsPoller>);

    render(<ForensicInsightsWidget dateRange={mockDateRange} />);

    // Act: Simulate selecting a view that is not handled by the component logic.
    fireEvent.click(screen.getByTestId("btn-unknown"));

    // Assert: Check that the component falls back to a loading state.
    await waitFor(() => {
      expect(screen.queryByTestId("mock-bar-chart")).not.toBeInTheDocument();
      expect(screen.getByTestId("beat-loader")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that the information modal opens upon interaction.
   */
  it("opens the modal when info button is clicked", () => {
    // Arrange: Render the widget in a ready state.
    vi.mocked(useForensicInsightsPoller).mockReturnValue({
      lifeStageData: mockLifeData,
      isFetching: false,
    } as unknown as ReturnType<typeof useForensicInsightsPoller>);

    render(<ForensicInsightsWidget dateRange={mockDateRange} />);

    // Act: Click the information button in the toolbar.
    fireEvent.click(screen.getByTestId("btn-info"));

    // Assert: Verify that the modal is now rendered in the document.
    expect(screen.getByTestId("mock-modal")).toBeInTheDocument();
  });

  /**
   * Test case to verify that `null` or missing data results in a loading state across different views.
   */
  it("handles null data gracefully for dependent views", async () => {
    // Arrange: Mock the poller to return null for secondary datasets.
    vi.mocked(useForensicInsightsPoller).mockReturnValue({
      lifeStageData: [],
      pmiData: null,
      samplingData: null,
      isFetching: false,
    } as unknown as ReturnType<typeof useForensicInsightsPoller>);

    render(<ForensicInsightsWidget dateRange={mockDateRange} />);

    // Act & Assert: Verify that switching to PMI shows the loader.
    fireEvent.click(screen.getByTestId("btn-pmi"));
    expect(screen.getByTestId("beat-loader")).toBeInTheDocument();

    // Act & Assert: Verify that switching to Sampling shows the loader.
    fireEvent.click(screen.getByTestId("btn-sampling"));
    expect(screen.getByTestId("beat-loader")).toBeInTheDocument();
  });
});
