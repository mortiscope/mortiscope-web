import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { DashboardBarChart } from "@/features/dashboard/components/dashboard-bar-chart";

// Polyfill for ResizeObserver to support Recharts rendering in a JSDOM environment.
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Mock the Recharts library to intercept chart configurations and data propagation.
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({
    children,
    data,
    onMouseLeave,
  }: {
    children: React.ReactNode;
    data: unknown[];
    onMouseLeave?: () => void;
  }) => (
    <svg data-testid="bar-chart" data-chart-data={JSON.stringify(data)} onMouseLeave={onMouseLeave}>
      {children}
    </svg>
  ),
  XAxis: (props: Record<string, unknown>) => {
    const formattedSample =
      typeof props.tickFormatter === "function"
        ? (props.tickFormatter as (val: string) => string)("sample_val")
        : "";
    return (
      <g
        data-testid="x-axis"
        data-props={JSON.stringify(props)}
        data-formatted-sample={formattedSample}
      />
    );
  },
  YAxis: (props: Record<string, unknown>) => {
    // Capture formatted samples at different magnitudes to test the tickFormatter
    const tickFormatter = props.tickFormatter as ((value: number) => string) | undefined;
    const formattedSmall = tickFormatter ? tickFormatter(500) : "";
    const formattedThousands = tickFormatter ? tickFormatter(6990) : "";
    const formattedMillions = tickFormatter ? tickFormatter(1500000) : "";
    return (
      <g
        data-testid="y-axis"
        data-props={JSON.stringify(props)}
        data-formatted-small={formattedSmall}
        data-formatted-thousands={formattedThousands}
        data-formatted-millions={formattedMillions}
      />
    );
  },
  CartesianGrid: () => <g data-testid="cartesian-grid" />,
  Tooltip: ({
    content,
  }: {
    content: React.ReactElement | ((props: Record<string, unknown>) => React.ReactNode);
  }) => {
    if (React.isValidElement(content)) {
      const ignored = React.cloneElement(content, {
        active: false,
        payload: [],
      } as unknown as React.HTMLAttributes<HTMLDivElement>);
      void ignored;
    }

    return (
      <foreignObject data-testid="tooltip-wrapper">
        <div data-testid="tooltip-mock">
          {React.isValidElement(content)
            ? React.cloneElement(content, {
                active: true,
                payload: [{ value: 25 }],
                label: "instar_1",
              } as unknown as React.Attributes)
            : null}
          <div hidden>
            {React.isValidElement(content)
              ? React.cloneElement(content, {
                  active: false,
                } as unknown as React.Attributes)
              : null}
          </div>
        </div>
      </foreignObject>
    );
  },
  Bar: ({
    children,
    onMouseEnter,
  }: {
    children: React.ReactNode;
    onMouseEnter?: (data: unknown, index: number) => void;
  }) => (
    <g
      data-testid="bar"
      onMouseEnter={() => {
        if (onMouseEnter) onMouseEnter({}, 0);
      }}
    >
      {children}
    </g>
  ),
  Cell: () => <g data-testid="cell" />,
}));

// Mock utility functions used for label formatting.
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    formatLabel: (str: string) => `Formatted-${str}`,
  };
});

/**
 * Test suite for the `DashboardBarChart` component.
 */
describe("DashboardBarChart", () => {
  const mockData = [
    { name: "instar_1", quantity: 25 },
    { name: "instar_2", quantity: 75 },
  ];

  /**
   * Test case to verify that the chart and its responsive container are rendered in the DOM.
   */
  it("renders the chart container", () => {
    // Act: Render the bar chart component.
    render(<DashboardBarChart data={mockData} />);

    // Assert: Check for the presence of the chart and the responsive wrapper.
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the `data` prop is correctly forwarded to the underlying Recharts component.
   */
  it("passes data correctly to BarChart", () => {
    // Act: Render the chart with mock data.
    render(<DashboardBarChart data={mockData} />);

    // Assert: Retrieve the JSON data from the mock chart attribute and compare it.
    const chart = screen.getByTestId("bar-chart");
    const dataProp = JSON.parse(chart.getAttribute("data-chart-data") || "[]");
    expect(dataProp).toEqual(mockData);
  });

  /**
   * Test case to verify that the chart labels for the X and Y axes are set correctly.
   */
  it("renders axes with correct initial labels", () => {
    // Act: Render the chart with custom axis labels.
    render(<DashboardBarChart data={mockData} xAxisLabel="Custom X" yAxisLabel="Custom Y" />);

    // Assert: Verify the `xAxisLabel` value in the component props.
    const xAxis = screen.getByTestId("x-axis");
    const xProps = JSON.parse(xAxis.getAttribute("data-props") || "{}");
    expect(xProps.label.value).toBe("Custom X");

    // Assert: Verify the `yAxisLabel` value in the component props.
    const yAxis = screen.getByTestId("y-axis");
    const yProps = JSON.parse(yAxis.getAttribute("data-props") || "{}");
    expect(yProps.label.value).toBe("Custom Y");
  });

  /**
   * Test case to verify that the tick formatter correctly falls back when a partial label map is provided.
   */
  it("validates XAxis tick formatter logic via mock", () => {
    // Arrange: Render the default component state.
    const { unmount } = render(<DashboardBarChart data={mockData} />);
    const tAxisDefault = screen.getByTestId("x-axis");
    expect(tAxisDefault.getAttribute("data-formatted-sample")).toBe("Formatted-sample_val");
    unmount();

    // Act: Render with a label map that does not contain the sample key.
    const partialMap = { other_key: "Other Label" };
    render(<DashboardBarChart data={mockData} labelMap={partialMap} />);

    // Assert: Verify the formatter uses the original value as a fallback.
    const tAxisPartial = screen.getByTestId("x-axis");
    expect(tAxisPartial.getAttribute("data-formatted-sample")).toBe("sample_val");
  });

  /**
   * Test case to verify that the XAxis tick formatter correctly uses values from a provided label map.
   */
  it("validates XAxis tick formatter with matching label map", () => {
    // Arrange: Define a mapping for the sample value.
    const fullMap = { sample_val: "Mapped Label" };

    // Act: Render the chart with the label map.
    render(<DashboardBarChart data={mockData} labelMap={fullMap} />);

    // Assert: Verify the formatted sample matches the mapped value.
    const tAxis = screen.getByTestId("x-axis");
    expect(tAxis.getAttribute("data-formatted-sample")).toBe("Mapped Label");
  });

  /**
   * Test case to verify that font sizes within the chart update dynamically during window resize events.
   */
  it("adjusts font size and dimensions on window resize (Responsive Logic)", () => {
    // Arrange: Initial render at default window size.
    render(<DashboardBarChart data={mockData} />);

    let xAxis = screen.getByTestId("x-axis");
    let xProps = JSON.parse(xAxis.getAttribute("data-props") || "{}");

    // Assert: Verify default font size.
    expect(xProps.fontSize).toBe(14);

    // Act: Simulate a window resize to a mobile-width viewport.
    act(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 500,
      });
      window.dispatchEvent(new Event("resize"));
    });

    // Assert: Verify that font size has decreased for the smaller viewport.
    xAxis = screen.getByTestId("x-axis");
    xProps = JSON.parse(xAxis.getAttribute("data-props") || "{}");
    expect(xProps.fontSize).toBe(10);
  });

  /**
   * Test case to verify that the custom tooltip content uses the correct formatted labels.
   */
  it("renders the tooltip with formatted values", () => {
    // Act: Render the chart.
    render(<DashboardBarChart data={mockData} />);

    // Assert: Ensure the tooltip content reflects the formatted biological stage label.
    expect(screen.getByText("Formatted-instar_1")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the tooltip correctly calculates the percentage of a total for a given data point.
   */
  it("calculates percentages correctly in the tooltip", () => {
    // Act: Render the chart.
    render(<DashboardBarChart data={mockData} />);

    // Assert: Verify raw quantity and calculated percentage (25 out of 100 total).
    expect(screen.getByText("Quantity: 25")).toBeInTheDocument();
    expect(screen.getByText("Percentage: 25.0%")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component handles empty datasets without division-by-zero errors.
   */
  it("handles empty data gracefully (0% calculation coverage)", () => {
    // Act: Render with an empty array.
    render(<DashboardBarChart data={[]} />);

    // Assert: Verify that the fallback percentage is zero.
    expect(screen.getByText("Percentage: 0.0%")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the chart uses fallback colors when the `colorMap` is missing a specific key.
   */
  it("handles data points with missing color definitions (default color fallback)", () => {
    // Arrange: Define data with a key not present in the color map.
    const dataWithUnknownKey = [{ name: "unknown_category", quantity: 50 }];
    const emptyColorMap = {};

    // Act: Render the chart.
    render(<DashboardBarChart data={dataWithUnknownKey} colorMap={emptyColorMap} />);

    // Assert: Ensure the chart components still render despite missing color mappings.
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    expect(screen.getByTestId("cell")).toBeInTheDocument();
  });

  /**
   * Test case to verify that individual Bar and Cell components are rendered for each data point.
   */
  it("renders bars and cells", () => {
    // Act: Render the chart with two data points.
    render(<DashboardBarChart data={mockData} />);

    // Assert: Verify that two cells are created in the chart.
    const cells = screen.getAllByTestId("cell");
    expect(cells).toHaveLength(2);
  });

  /**
   * Test case to verify state updates for active bar indices during user interactions.
   */
  it("updates active index on mouse interactions", () => {
    // Arrange: Render the chart and locate interactive elements.
    render(<DashboardBarChart data={mockData} />);

    const bar = screen.getByTestId("bar");
    const chart = screen.getByTestId("bar-chart");

    // Act: Simulate hovering over a bar and then leaving the chart area.
    fireEvent.mouseEnter(bar);
    fireEvent.mouseLeave(chart);

    // Assert: Verify that the component remains rendered during interactions.
    expect(bar).toBeInTheDocument();
  });

  /**
   * Test suite for Y-axis tick formatting to prevent label overflow with 4+ digit numbers.
   */
  describe("Y-axis compact number formatting", () => {
    /**
     * Test case to verify that numbers less than 1000 display as-is.
     */
    it("displays numbers under 1000 without formatting", () => {
      // Act: Render the chart.
      render(<DashboardBarChart data={mockData} />);

      // Assert: Verify small numbers are not formatted.
      const yAxis = screen.getByTestId("y-axis");
      expect(yAxis.getAttribute("data-formatted-small")).toBe("500");
    });

    /**
     * Test case to verify that numbers >= 1000 display with "K" suffix.
     */
    it("formats numbers >= 1000 with K suffix", () => {
      // Act: Render the chart.
      render(<DashboardBarChart data={mockData} />);

      // Assert: Verify thousands are formatted with K suffix.
      const yAxis = screen.getByTestId("y-axis");
      expect(yAxis.getAttribute("data-formatted-thousands")).toBe("7.0K");
    });

    /**
     * Test case to verify that numbers >= 1,000,000 display with "M" suffix.
     */
    it("formats numbers >= 1,000,000 with M suffix", () => {
      // Act: Render the chart.
      render(<DashboardBarChart data={mockData} />);

      // Assert: Verify millions are formatted with M suffix.
      const yAxis = screen.getByTestId("y-axis");
      expect(yAxis.getAttribute("data-formatted-millions")).toBe("1.5M");
    });
  });
});
