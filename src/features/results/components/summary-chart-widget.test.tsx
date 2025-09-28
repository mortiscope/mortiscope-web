import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SummaryChartWidget as SummaryChartWidgetType } from "@/features/results/components/summary-chart-widget";

// Mock the UI Card component to verify the layout container and its styling classes.
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
}));

// Mock the loading spinner to verify that a fallback is shown during asynchronous component loading.
vi.mock("react-spinners", () => ({
  BeatLoader: () => <div data-testid="beat-loader">BeatLoader</div>,
}));

// Mock the toolbar to verify that the correct chart selection state is passed down.
vi.mock("@/features/results/components/summary-chart-toolbar", () => ({
  SummaryChartToolbar: (props: { selectedChart: string }) => (
    <div data-testid="summary-chart-toolbar">Toolbar - Selected: {props.selectedChart}</div>
  ),
}));

// Mock individual chart components to verify the switching logic without rendering complex SVG structures.
vi.mock("@/features/results/components/results-bar-chart", () => ({
  ResultsBarChart: () => <div data-testid="results-bar-chart">Bar Chart Content</div>,
}));

vi.mock("@/features/results/components/results-line-chart", () => ({
  ResultsLineChart: () => <div data-testid="results-line-chart">Line Chart Content</div>,
}));

vi.mock("@/features/results/components/results-composed-chart", () => ({
  ResultsComposedChart: () => (
    <div data-testid="results-composed-chart">Composed Chart Content</div>
  ),
}));

vi.mock("@/features/results/components/results-pie-chart", () => ({
  ResultsPieChart: () => <div data-testid="results-pie-chart">Pie Chart Content</div>,
}));

vi.mock("@/features/results/components/results-radar-chart", () => ({
  ResultsRadarChart: () => <div data-testid="results-radar-chart">Radar Chart Content</div>,
}));

// Mock dynamic imports to handle Suspense-based loading and lazy-loaded chart components.
vi.mock("next/dynamic", () => ({
  default: (
    loader: () => Promise<React.ComponentType<unknown> | { default: React.ComponentType<unknown> }>,
    options?: { loading?: () => React.ReactNode }
  ) => {
    const validLoader = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const loaded = await loader();
      if (typeof loaded === "function") {
        return { default: loaded };
      }
      return loaded as { default: React.ComponentType<unknown> };
    };

    const LazyComponent = React.lazy(validLoader);
    const LoadingComponent = options?.loading || (() => <div>Loading...</div>);

    return (props: Record<string, unknown>) => (
      <React.Suspense fallback={<LoadingComponent />}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  },
}));

/**
 * Test suite for the `SummaryChartWidget` component.
 */
describe("SummaryChartWidget", () => {
  const defaultProps = {
    selectedChart: "Bar Chart" as const,
    onChartSelect: vi.fn(),
    onInfoClick: vi.fn(),
    selectedDataSource: "all",
    onDataSourceSelect: vi.fn(),
    uploads: [],
    isDataSourceDisabled: false,
    chartData: [{ name: "Category A", quantity: 10 }],
  };

  let SummaryChartWidget: typeof SummaryChartWidgetType;

  // Reset modules and clear mocks before each test to ensure component state isolation.
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const mod = await import("@/features/results/components/summary-chart-widget");
    SummaryChartWidget = mod.SummaryChartWidget;
  });

  /**
   * Test case to verify the primary widget container and header section are present.
   */
  it("renders the container and header correctly", async () => {
    // Arrange: Render the widget with default configuration.
    render(<SummaryChartWidget {...defaultProps} />);

    // Assert: Verify the section heading and the selection state within the toolbar.
    expect(screen.getByText("Case Summary")).toBeInTheDocument();
    expect(screen.getByTestId("summary-chart-toolbar")).toHaveTextContent(
      "Toolbar - Selected: Bar Chart"
    );
  });

  /**
   * Test case to verify the dynamic rendering of the Bar Chart.
   */
  it("renders the Bar Chart when selected", async () => {
    // Arrange: Set the `selectedChart` prop to "Bar Chart".
    render(<SummaryChartWidget {...defaultProps} selectedChart="Bar Chart" />);

    // Assert: Wait for lazy-loading and verify the bar chart mock appears.
    await waitFor(() => {
      expect(screen.getByTestId("results-bar-chart")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify the dynamic rendering of the Line Chart.
   */
  it("renders the Line Chart when selected", async () => {
    // Arrange: Set the `selectedChart` prop to "Line Chart".
    render(<SummaryChartWidget {...defaultProps} selectedChart="Line Chart" />);

    // Assert: Wait for lazy-loading and verify the line chart mock appears.
    await waitFor(() => {
      expect(screen.getByTestId("results-line-chart")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify the dynamic rendering of the Composed Chart.
   */
  it("renders the Composed Chart when selected", async () => {
    // Arrange: Set the `selectedChart` prop to "Composed Chart".
    render(<SummaryChartWidget {...defaultProps} selectedChart="Composed Chart" />);

    // Assert: Wait for lazy-loading and verify the composed chart mock appears.
    await waitFor(() => {
      expect(screen.getByTestId("results-composed-chart")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify the dynamic rendering of the Pie Chart.
   */
  it("renders the Pie Chart when selected", async () => {
    // Arrange: Set the `selectedChart` prop to "Pie Chart".
    render(<SummaryChartWidget {...defaultProps} selectedChart="Pie Chart" />);

    // Assert: Wait for lazy-loading and verify the pie chart mock appears.
    await waitFor(() => {
      expect(screen.getByTestId("results-pie-chart")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify the dynamic rendering of the Radar Chart.
   */
  it("renders the Radar Chart when selected", async () => {
    // Arrange: Set the `selectedChart` prop to "Radar Chart".
    render(<SummaryChartWidget {...defaultProps} selectedChart="Radar Chart" />);

    // Assert: Wait for lazy-loading and verify the radar chart mock appears.
    await waitFor(() => {
      expect(screen.getByTestId("results-radar-chart")).toBeInTheDocument();
    });
  });

  const chartTypes = [
    "Bar Chart",
    "Line Chart",
    "Composed Chart",
    "Pie Chart",
    "Radar Chart",
  ] as const;

  /**
   * Data-driven test case to verify that the loader is displayed for every chart type during its loading phase.
   */
  it.each(chartTypes)("displays the loader for %s", async (chartType) => {
    // Arrange: Render the widget with a specific chart type selection.
    render(<SummaryChartWidget {...defaultProps} selectedChart={chartType} />);

    // Assert: Verify the `BeatLoader` is visible immediately.
    expect(screen.getByTestId("beat-loader")).toBeInTheDocument();

    // Assert: Verify the loader is replaced by the actual chart component after the loading delay.
    await waitFor(() => {
      const suffix = chartType.toLowerCase().replace(" ", "-");
      expect(screen.getByTestId(`results-${suffix}`)).toBeInTheDocument();
    });
  });
});
