import { act, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DashboardDistributionChart } from "@/features/dashboard/components/dashboard-distribution-chart";

// Polyfill for `ResizeObserver` to support Recharts rendering logic in a JSDOM environment.
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

// Reset the window width to a standard desktop size after each test to ensure isolation.
afterEach(() => {
  setWindowWidth(1024);
});

// Mock the Recharts library to intercept chart configurations and internal state transitions.
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
    return (
      <foreignObject data-testid="tooltip-wrapper">
        <div data-testid="tooltip-mock">
          {React.isValidElement(content)
            ? React.cloneElement(content, {
                active: true,
                payload: [{ value: 42 }],
                label: "test_distribution",
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

// Mock utility functions used for data label normalization.
vi.mock("@/lib/utils", () => ({
  formatLabel: (str: string) => `Formatted-${str}`,
}));

/**
 * Test suite for the `DashboardDistributionChart` component.
 */
describe("DashboardDistributionChart", () => {
  const mockData = [
    { name: "range_1", count: 10 },
    { name: "range_2", count: 20 },
  ];

  /**
   * Test case to verify that all primary sub-components of the chart are rendered in the document.
   */
  it("renders the chart container and components", () => {
    // Arrange: Set standard desktop width and render.
    setWindowWidth(1024);
    render(<DashboardDistributionChart data={mockData} />);

    // Assert: Verify the presence of the container, svg, axes, and graphical layers.
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("composed-chart")).toBeInTheDocument();
    expect(screen.getByTestId("x-axis")).toBeInTheDocument();
    expect(screen.getByTestId("y-axis")).toBeInTheDocument();
    expect(screen.getByTestId("area")).toBeInTheDocument();
    expect(screen.getByTestId("line")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the `data` prop is correctly serialized and passed to the chart engine.
   */
  it("passes data correctly to ComposedChart", () => {
    // Arrange: Set window width.
    setWindowWidth(1024);

    // Act: Render the distribution chart.
    render(<DashboardDistributionChart data={mockData} />);

    // Assert: Retrieve and parse the data attribute from the mock svg.
    const chart = screen.getByTestId("composed-chart");
    const dataProp = JSON.parse(chart.getAttribute("data-chart-data") || "[]");
    expect(dataProp).toEqual(mockData);
  });

  /**
   * Test case to verify that the YAxis visibility and font sizes change dynamically based on viewport width.
   */
  it("adjusts YAxis visibility and font size on window resize (Responsive Logic)", () => {
    // Arrange: Initialize at desktop width.
    setWindowWidth(1024);
    render(<DashboardDistributionChart data={mockData} />);

    let yAxis = screen.getByTestId("y-axis");
    let yProps = JSON.parse(yAxis.getAttribute("data-props") || "{}");

    // Assert: Verify hidden state and default font size for large screens.
    expect(yProps.hide).toBe(true);
    expect(yProps.fontSize).toBe(12);

    // Act: Trigger a resize to a smaller viewport.
    setWindowWidth(500);

    // Assert: Verify that the YAxis is now visible with a smaller font size.
    yAxis = screen.getByTestId("y-axis");
    yProps = JSON.parse(yAxis.getAttribute("data-props") || "{}");

    expect(yProps.hide).toBe(false);
    expect(yProps.fontSize).toBe(10);
  });

  /**
   * Test case to verify that the custom tooltip renders the correct labels and numerical values.
   */
  it("renders the tooltip with correct values", () => {
    // Arrange: Set standard width.
    setWindowWidth(1024);

    // Act: Render the chart.
    render(<DashboardDistributionChart data={mockData} />);

    // Assert: Verify the tooltip label and the mock payload count are displayed.
    expect(screen.getByText("test_distribution")).toBeInTheDocument();
    expect(screen.getByText("Count: 42")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the XAxis correctly applies the `formatLabel` utility to its ticks.
   */
  it("executes tickFormatter logic", () => {
    // Arrange: Set standard width.
    setWindowWidth(1024);

    // Act: Render the chart.
    render(<DashboardDistributionChart data={mockData} />);

    // Assert: Verify that the tick formatter was invoked with the expected utility function.
    const xAxis = screen.getByTestId("x-axis");
    expect(xAxis).toHaveAttribute("data-formatted-tick", "Formatted-test_tick");
  });

  /**
   * Test case to verify the component lifecycle by unmounting it without errors.
   */
  it("unmounts without error (cleanup coverage)", () => {
    // Arrange: Render the component.
    setWindowWidth(1024);
    const { unmount } = render(<DashboardDistributionChart data={mockData} />);

    // Act & Assert: Execute unmount and ensure no exceptions are thrown.
    unmount();
  });
});
