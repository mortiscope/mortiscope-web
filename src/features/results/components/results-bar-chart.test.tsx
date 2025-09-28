import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { ResultsBarChart } from "@/features/results/components/results-bar-chart";

// Mock the recharts library to provide stable, testable DOM elements instead of complex SVG internals.
vi.mock("recharts", async () => {
  const React = await import("react");
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    BarChart: ({
      children,
      ...props
    }: { children: React.ReactNode } & React.SVGProps<SVGSVGElement>) => (
      <svg data-testid="bar-chart" {...props}>
        {children}
      </svg>
    ),
    CartesianGrid: () => <g data-testid="cartesian-grid" />,
    XAxis: ({ tickFormatter }: { tickFormatter?: (value: string) => string }) => (
      <g data-testid="x-axis">
        {tickFormatter && <text data-testid="x-axis-tick">{tickFormatter("adult")}</text>}
      </g>
    ),
    YAxis: ({ label }: { label?: { value: string } }) => (
      <g data-testid="y-axis">
        <text>{label?.value}</text>
      </g>
    ),
    Tooltip: ({ content }: { content: React.ReactElement }) => {
      if (React.isValidElement(content)) {
        return (
          <div data-testid="tooltip-wrapper">
            <div data-testid="tooltip">
              {React.cloneElement(
                content as React.ReactElement<{
                  active: boolean;
                  payload?: unknown[];
                  label?: string;
                }>,
                {
                  active: true,
                  payload: [{ value: 5 }],
                  label: "adult",
                }
              )}
            </div>
            <div data-testid="tooltip-inactive">
              {React.cloneElement(
                content as React.ReactElement<{
                  active: boolean;
                  payload?: unknown[];
                  label?: string;
                }>,
                {
                  active: false,
                }
              )}
            </div>
          </div>
        );
      }
      return <div data-testid="tooltip" />;
    },
    Bar: ({
      children,
      onMouseEnter,
    }: {
      children: React.ReactNode;
      onMouseEnter?: (data: unknown, index: number) => void;
    }) => (
      <g data-testid="bar">
        <text data-testid="trigger-hover-0" onClick={() => onMouseEnter && onMouseEnter(null, 0)}>
          Hover 0
        </text>
        {children}
      </g>
    ),
    Cell: ({ fill, opacity }: { fill: string; opacity?: number }) => (
      <rect data-testid="cell" data-fill={fill} data-opacity={opacity} />
    ),
  };
});

// Mock the utility function to verify that labels are processed through the expected formatting logic.
vi.mock("@/lib/utils", () => ({
  formatLabel: (label: string) => `Formatted ${label}`,
}));

/**
 * Test suite for the `ResultsBarChart` component.
 */
describe("ResultsBarChart", () => {
  const mockData = [
    { name: "adult", quantity: 5 },
    { name: "pupa", quantity: 10 },
    { name: "instar_1", quantity: 3 },
  ];

  /**
   * Test case to verify that the component mounts without errors.
   */
  it("renders without crashing", () => {
    // Arrange: Render the chart with standard mock data.
    const { container } = render(<ResultsBarChart data={mockData} />);

    // Assert: Verify the container is present in the DOM.
    expect(container).toBeInTheDocument();
  });

  /**
   * Test case to verify the presence of core chart layout elements.
   */
  it("renders a chart container", () => {
    // Arrange: Render the chart component.
    render(<ResultsBarChart data={mockData} />);

    // Assert: Ensure the responsive wrapper and the SVG chart are rendered.
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the number of bars matches the input data length.
   */
  it("renders the correct number of cells based on data", () => {
    // Arrange: Render the chart component.
    render(<ResultsBarChart data={mockData} />);

    // Act: Retrieve all cell elements that represent data points.
    const cells = screen.getAllByTestId("cell");

    // Assert: Check that the cell count equals the `mockData` length.
    expect(cells).toHaveLength(mockData.length);
  });

  /**
   * Test case to verify that X-axis labels are correctly transformed by the formatter.
   */
  it("renders X-axis labels using the formatter", () => {
    // Arrange: Render the chart component.
    render(<ResultsBarChart data={mockData} />);

    // Assert: Check if the X-axis tick displays the value returned by the `formatLabel` mock.
    expect(screen.getByTestId("x-axis-tick")).toHaveTextContent("Formatted adult");
  });

  /**
   * Test case to verify that the Y-axis title is displayed.
   */
  it("renders Y-axis label", () => {
    // Arrange: Render the chart component.
    render(<ResultsBarChart data={mockData} />);

    // Assert: Check that the Y-axis contains the text label for `Quantity`.
    expect(screen.getByTestId("y-axis")).toHaveTextContent("Quantity");
  });

  /**
   * Test case to verify that the custom tooltip renders with formatted data.
   */
  it("renders custom tooltip content", () => {
    // Arrange: Render the chart component.
    render(<ResultsBarChart data={mockData} />);

    // Act: Locate the tooltip within the DOM.
    const tooltip = screen.getByTestId("tooltip");

    // Assert: Verify the tooltip exists and contains both the formatted label and the quantity value.
    expect(tooltip).toBeInTheDocument();
    expect(within(tooltip).getByText("Formatted adult")).toBeInTheDocument();
    expect(within(tooltip).getByText("Quantity: 5")).toBeInTheDocument();
  });

  /**
   * Test case to verify that unique color gradients are generated for chart bars.
   */
  it("generates gradients in defs based on unique colors", () => {
    // Arrange: Render the component and capture the container.
    const { container } = render(<ResultsBarChart data={mockData} />);

    // Act: Find the SVG gradient definitions.
    const gradients = container.querySelectorAll("linearGradient");

    // Assert: Ensure gradients exist and that cells reference them via the `data-fill` attribute.
    expect(gradients.length).toBeGreaterThan(0);
    const cells = screen.getAllByTestId("cell");
    cells.forEach((cell) => {
      expect(cell).toHaveAttribute("data-fill", expect.stringMatching(/url\(#colorGradient-\d+\)/));
    });
  });

  /**
   * Test case to verify that hovering over a bar updates the opacity of other bars.
   */
  it("handles hover interactions", async () => {
    // Arrange: Setup user event and render the chart.
    const user = userEvent.setup();
    render(<ResultsBarChart data={mockData} />);
    const cells = screen.getAllByTestId("cell");

    // Assert: Verify all bars are fully opaque by default.
    cells.forEach((cell) => {
      expect(cell).toHaveAttribute("data-opacity", "1");
    });

    // Act: Simulate a hover interaction on the first bar.
    await user.click(screen.getByTestId("trigger-hover-0"));

    // Assert: Check that the hovered bar remains opaque while others become translucent.
    expect(cells[0]).toHaveAttribute("data-opacity", "1");
    expect(cells[1]).toHaveAttribute("data-opacity", "0.4");

    // Act: Simulate moving the mouse away from the chart.
    await fireEvent.mouseLeave(screen.getByTestId("bar-chart"));

    // Assert: Verify that all bars return to full opacity after mouse leave.
    cells.forEach((cell) => {
      expect(cell).toHaveAttribute("data-opacity", "1");
    });
  });

  /**
   * Test case to verify that the component does not break when provided with an empty data array.
   */
  it("handles empty data gracefully", () => {
    // Arrange: Render the chart with an empty `data` prop.
    render(<ResultsBarChart data={[]} />);

    // Assert: Verify that no data cells are rendered but the chart structure remains.
    expect(screen.queryByTestId("cell")).not.toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });
});
