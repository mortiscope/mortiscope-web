import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CustomTooltip, ResultsLineChart } from "@/features/results/components/results-line-chart";

// Mock the recharts library to provide predictable DOM elements for testing SVG-based charts.
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ComposedChart: ({ children }: { children: React.ReactNode }) => (
    <svg data-testid="composed-chart">{children}</svg>
  ),
  CartesianGrid: () => <g data-testid="cartesian-grid" />,
  XAxis: ({ tickFormatter }: { tickFormatter?: (value: string) => string }) => (
    <g data-testid="x-axis">
      {tickFormatter && <text data-testid="x-axis-tick">{tickFormatter("instar_1")}</text>}
    </g>
  ),
  YAxis: ({ label }: { label?: { value: string } }) => (
    <g data-testid="y-axis">
      <text>{label?.value}</text>
    </g>
  ),
  Tooltip: () => <g data-testid="tooltip" />,
  Area: () => <g data-testid="area" />,
  Line: ({ stroke }: { stroke: string }) => <g data-testid="line" data-stroke={stroke} />,
}));

// Mock utility functions to verify that data labels are formatted before being displayed.
vi.mock("@/lib/utils", () => ({
  formatLabel: (label: string) => `Formatted ${label}`,
}));

/**
 * Test suite for the `ResultsLineChart` component.
 */
describe("ResultsLineChart", () => {
  const mockData = [
    { name: "adult", quantity: 5 },
    { name: "pupa", quantity: 10 },
    { name: "instar_1", quantity: 3 },
  ];

  /**
   * Test case to verify the component renders without throwing an error.
   */
  it("renders without crashing", () => {
    // Arrange: Render the chart with standard test data.
    const { container } = render(<ResultsLineChart data={mockData} />);

    // Assert: Check if the component is present in the DOM.
    expect(container).toBeInTheDocument();
  });

  /**
   * Test case to verify the high-level chart structure.
   */
  it("renders the chart container structure", () => {
    // Arrange: Render the chart.
    render(<ResultsLineChart data={mockData} />);

    // Assert: Verify the presence of the responsive wrapper and the SVG chart.
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("composed-chart")).toBeInTheDocument();
  });

  /**
   * Test case to verify all functional chart sub-layers are rendered.
   */
  it("renders all chart components (Grid, Axes, Tooltip, Area, Line)", () => {
    // Arrange: Render the chart.
    render(<ResultsLineChart data={mockData} />);

    // Assert: Check that every expected recharts component is visible in the tree.
    expect(screen.getByTestId("cartesian-grid")).toBeInTheDocument();
    expect(screen.getByTestId("x-axis")).toBeInTheDocument();
    expect(screen.getByTestId("y-axis")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("area")).toBeInTheDocument();
    expect(screen.getByTestId("line")).toBeInTheDocument();
  });

  /**
   * Test case to verify that X-axis ticks use the provided formatter utility.
   */
  it("formats X-axis labels correctly", () => {
    // Arrange: Render the chart.
    render(<ResultsLineChart data={mockData} />);

    // Assert: Verify that the tick text follows the mocked format.
    expect(screen.getByTestId("x-axis-tick")).toHaveTextContent("Formatted instar_1");
  });

  /**
   * Test case to verify the rendering of the Y-axis title.
   */
  it("renders Y-axis label", () => {
    // Arrange: Render the chart.
    render(<ResultsLineChart data={mockData} />);

    // Assert: Ensure the `Quantity` label is rendered on the Y-axis.
    expect(screen.getByTestId("y-axis")).toHaveTextContent("Quantity");
  });

  /**
   * Test case to verify that required SVG definitions for styling are generated.
   */
  it("renders SVG definitions for gradients and filters", () => {
    // Arrange: Render the chart.
    const { container } = render(<ResultsLineChart data={mockData} />);

    // Act: Query the DOM for specific SVG IDs used for gradients and shadows.
    const gradient = container.querySelector("linearGradient#lineGradient");
    const filter = container.querySelector("filter#lineShadow");
    const clipPath = container.querySelector("clipPath#chartClip");

    // Assert: Verify that the gradient, filter, and clipPath are defined.
    expect(gradient).toBeInTheDocument();
    expect(filter).toBeInTheDocument();
    expect(clipPath).toBeInTheDocument();
  });

  /**
   * Test case to verify the application of the default line color.
   */
  it("applies the default stroke color", () => {
    // Arrange: Render the chart with default props.
    render(<ResultsLineChart data={mockData} />);

    // Act: Locate the line element.
    const line = screen.getByTestId("line");

    // Assert: Check for the default hex color code.
    expect(line).toHaveAttribute("data-stroke", "#10b981");
  });

  /**
   * Test case to verify that a custom stroke color prop is applied correctly.
   */
  it("applies a custom stroke color", () => {
    // Arrange: Define a custom color and render.
    const customColor = "#ef4444";
    render(<ResultsLineChart data={mockData} strokeColor={customColor} />);

    // Act: Locate the line element.
    const line = screen.getByTestId("line");

    // Assert: Verify the custom stroke color is applied.
    expect(line).toHaveAttribute("data-stroke", customColor);
  });

  /**
   * Test case to verify component stability when empty data is provided.
   */
  it("handles empty data gracefully", () => {
    // Arrange: Render the chart with an empty array.
    render(<ResultsLineChart data={[]} />);

    // Assert: Verify the chart and its primary layers still render without error.
    expect(screen.getByTestId("composed-chart")).toBeInTheDocument();
    expect(screen.getByTestId("area")).toBeInTheDocument();
    expect(screen.getByTestId("line")).toBeInTheDocument();
  });
});

/**
 * Test suite for the CustomTooltip component used within the line chart.
 * This suite verifies the conditional visibility and data formatting of the tooltip.
 */
describe("CustomTooltip", () => {
  /**
   * Test case to verify that the tooltip renders when active data is available.
   */
  it("renders content when active and payload exists", () => {
    // Arrange: Render the tooltip with active status and data.
    render(
      <CustomTooltip
        active={true}
        payload={[{ value: 10, name: "test", unit: "unit", color: "red" }]}
        label="test-label"
      />
    );

    // Assert: Verify the presence of formatted labels and quantity values.
    expect(screen.getByText("Formatted test-label")).toBeInTheDocument();
    expect(screen.getByText("Quantity: 10")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the tooltip renders nothing when hidden.
   */
  it("renders nothing when inactive", () => {
    // Arrange: Render the tooltip with the `active` prop set to false.
    const { container } = render(
      <CustomTooltip
        active={false}
        payload={[{ value: 10, name: "test", unit: "unit", color: "red" }]}
        label="test-label"
      />
    );

    // Assert: Verify the container is empty.
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Test case to verify that the tooltip renders nothing if the data payload is missing.
   */
  it("renders nothing when payload is empty", () => {
    // Arrange: Render the tooltip with an empty payload array.
    const { container } = render(<CustomTooltip active={true} payload={[]} label="test-label" />);

    // Assert: Verify the container is empty.
    expect(container).toBeEmptyDOMElement();
  });
});
