import { act, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DashboardLineChart } from "@/features/dashboard/components/dashboard-line-chart";

// Polyfill for ResizeObserver to support Recharts responsive logic in a JSDOM environment.
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Helper function to simulate window resize events and update global width properties.
const setWindowWidth = (width: number) => {
  act(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: width,
    });
    window.dispatchEvent(new Event("resize"));
  });
};

// Reset the window width to a standard desktop size after each test to ensure test isolation.
afterEach(() => {
  setWindowWidth(1024);
});

// Mock the Recharts library to intercept chart configurations and verify data propagation.
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ComposedChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <svg data-testid="composed-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </svg>
  ),
  XAxis: (props: Record<string, unknown>) => {
    const formattedTick =
      typeof props.tickFormatter === "function"
        ? (props.tickFormatter as (val: string) => string)("test_tick")
        : "";
    return (
      <g
        data-testid="x-axis"
        data-props={JSON.stringify(props)}
        data-formatted-tick={formattedTick}
      />
    );
  },
  YAxis: (props: Record<string, unknown>) => (
    <g data-testid="y-axis" data-props={JSON.stringify(props)} />
  ),
  CartesianGrid: () => <g data-testid="cartesian-grid" />,
  Tooltip: ({
    content,
  }: {
    content: React.ReactElement | ((props: Record<string, unknown>) => React.ReactNode);
  }) => {
    if (React.isValidElement(content)) {
      const inactiveClone = React.cloneElement(content, {
        active: false,
        payload: [],
      } as unknown as React.Attributes);
      void inactiveClone;
    }

    return (
      <foreignObject data-testid="tooltip-wrapper">
        <div data-testid="tooltip-mock">
          {React.isValidElement(content)
            ? React.cloneElement(content, {
                active: true,
                payload: [{ value: 85 }],
                label: "sample_point",
              } as unknown as React.Attributes)
            : null}
          <div hidden>
            {React.isValidElement(content)
              ? React.cloneElement(content, {
                  active: false,
                  payload: [],
                } as unknown as React.Attributes)
              : null}
          </div>
        </div>
      </foreignObject>
    );
  },
  Area: () => <g data-testid="area" />,
  Line: () => <g data-testid="line" />,
}));

// Mock utility functions used for label normalization and formatting.
vi.mock("@/lib/utils", () => ({
  formatLabel: (str: string) => `Formatted-${str}`,
}));

/**
 * Test suite for the DashboardLineChart component.
 * This suite verifies the correct rendering of trend lines and areas for performance metrics.
 */
describe("DashboardLineChart", () => {
  const mockData = [
    { name: "point_1", confidence: 50 },
    { name: "point_2", confidence: 90 },
  ];

  /**
   * Test case to verify that the chart container and main svg components are rendered.
   */
  it("renders the chart container", () => {
    // Arrange: Set desktop window width.
    setWindowWidth(1024);

    // Act: Render the line chart component.
    render(<DashboardLineChart data={mockData} />);

    // Assert: Verify the presence of the responsive wrapper and the chart engine.
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("composed-chart")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the `data` prop is correctly forwarded to the ComposedChart engine.
   */
  it("passes data correctly to ComposedChart", () => {
    // Arrange: Set desktop window width.
    setWindowWidth(1024);

    // Act: Render the line chart component.
    render(<DashboardLineChart data={mockData} />);

    // Assert: Retrieve the data prop from the mock svg and verify its content.
    const chart = screen.getByTestId("composed-chart");
    const dataProp = JSON.parse(chart.getAttribute("data-chart-data") || "[]");
    expect(dataProp).toEqual(mockData);
  });

  /**
   * Test case to verify that YAxis visibility and font size adjust dynamically based on window width.
   */
  it("adjusts YAxis visibility and font size on window resize", () => {
    // Arrange: Start with desktop viewport width.
    setWindowWidth(1024);
    render(<DashboardLineChart data={mockData} />);

    let yAxis = screen.getByTestId("y-axis");
    let yProps = JSON.parse(yAxis.getAttribute("data-props") || "{}");

    // Assert: Verify that YAxis is hidden by default on large screens.
    expect(yProps.hide).toBe(true);
    expect(yProps.fontSize).toBe(12);

    // Act: Simulate a resize to a mobile-width viewport.
    setWindowWidth(500);

    // Assert: Verify that YAxis is now visible with a smaller font size.
    yAxis = screen.getByTestId("y-axis");
    yProps = JSON.parse(yAxis.getAttribute("data-props") || "{}");

    expect(yProps.hide).toBe(false);
    expect(yProps.fontSize).toBe(10);
  });

  /**
   * Test case to verify that the custom tooltip displays correctly formatted labels and scores.
   */
  it("renders the tooltip with correct content", () => {
    // Arrange: Set standard desktop width.
    setWindowWidth(1024);

    // Act: Render the chart.
    render(<DashboardLineChart data={mockData} />);

    // Assert: Verify the tooltip renders the formatted point label and percentage score.
    expect(screen.getByText("Formatted-sample_point")).toBeInTheDocument();
    expect(screen.getByText("Confidence Score: 85.0%")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the chart includes both Line and Area layers for data visualization.
   */
  it("renders Line and Area components", () => {
    // Arrange: Set desktop window width.
    setWindowWidth(1024);

    // Act: Render the line chart component.
    render(<DashboardLineChart data={mockData} />);

    // Assert: Verify the presence of both the area fill and the trend line.
    expect(screen.getByTestId("area")).toBeInTheDocument();
    expect(screen.getByTestId("line")).toBeInTheDocument();
  });
});
