import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  CustomTooltip,
  ResultsComposedChart,
} from "@/features/results/components/results-composed-chart";

// Mock the recharts library to replace complex SVG rendering with testable DOM elements.
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ComposedChart: ({
    children,
    onMouseLeave,
  }: {
    children: React.ReactNode;
    onMouseLeave?: () => void;
  }) => (
    <svg data-testid="composed-chart" onMouseLeave={onMouseLeave}>
      {children}
    </svg>
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
  Bar: ({
    children,
    onMouseEnter,
  }: {
    children: React.ReactNode;
    onMouseEnter?: (data: unknown, index: number) => void;
  }) => (
    <g data-testid="bar">
      <rect data-testid="bar-interaction" onClick={() => onMouseEnter?.(null, 1)} />
      {children}
    </g>
  ),
  Line: ({ stroke }: { stroke: string }) => <g data-testid="line" data-stroke={stroke} />,
  Cell: ({ fill, opacity }: { fill: string; opacity?: number }) => (
    <g data-testid="cell" data-fill={fill} data-opacity={opacity} />
  ),
}));

// Mock the utility library to verify that labels are processed by the expected formatting function.
vi.mock("@/lib/utils", () => ({
  formatLabel: (label: string) => `Formatted ${label}`,
}));

/**
 * Test suite for the `ResultsComposedChart` component.
 */
describe("ResultsComposedChart", () => {
  const mockData = [
    { name: "adult", quantity: 5 },
    { name: "pupa", quantity: 10 },
    { name: "instar_1", quantity: 3 },
  ];

  /**
   * Test case to verify the component renders without throwing an error.
   */
  it("renders without crashing", () => {
    // Arrange: Render the chart with standard mock data.
    const { container } = render(<ResultsComposedChart data={mockData} />);

    // Assert: Verify the container is present.
    expect(container).toBeInTheDocument();
  });

  /**
   * Test case to verify the existence of the high-level chart containers.
   */
  it("renders the chart container structure", () => {
    // Arrange: Render the chart.
    render(<ResultsComposedChart data={mockData} />);

    // Assert: Check for the responsive wrapper and the main composed chart element.
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("composed-chart")).toBeInTheDocument();
  });

  /**
   * Test case to verify that all functional layers of the chart are present in the DOM.
   */
  it("renders all chart components (Grid, Axes, Tooltip, Area, Bar, Line)", () => {
    // Arrange: Render the chart.
    render(<ResultsComposedChart data={mockData} />);

    // Assert: Verify that every sub-component layer is rendered.
    expect(screen.getByTestId("cartesian-grid")).toBeInTheDocument();
    expect(screen.getByTestId("x-axis")).toBeInTheDocument();
    expect(screen.getByTestId("y-axis")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("area")).toBeInTheDocument();
    expect(screen.getByTestId("bar")).toBeInTheDocument();
    expect(screen.getByTestId("line")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the number of cell elements matches the input data length.
   */
  it("renders the correct number of cells (bars) based on data", () => {
    // Arrange: Render the chart.
    render(<ResultsComposedChart data={mockData} />);

    // Act: Query for all rendered data cells.
    const cells = screen.getAllByTestId("cell");

    // Assert: Check that the length matches the length of the `mockData` array.
    expect(cells).toHaveLength(mockData.length);
  });

  /**
   * Test case to verify that the X-axis tick formatter is applied to the labels.
   */
  it("formats X-axis labels correctly", () => {
    // Arrange: Render the chart.
    render(<ResultsComposedChart data={mockData} />);

    // Assert: Verify that the tick text matches the pattern defined in the `formatLabel` mock.
    expect(screen.getByTestId("x-axis-tick")).toHaveTextContent("Formatted instar_1");
  });

  /**
   * Test case to verify the rendering of the Y-axis label text.
   */
  it("renders Y-axis label", () => {
    // Arrange: Render the chart.
    render(<ResultsComposedChart data={mockData} />);

    // Assert: Check that the Y-axis displays the correct unit label.
    expect(screen.getByTestId("y-axis")).toHaveTextContent("Quantity");
  });

  /**
   * Test case to verify the generation of SVG gradients for bar and line styling.
   */
  it("generates gradients in defs based on unique colors", () => {
    // Arrange: Render the chart and access the container.
    const { container } = render(<ResultsComposedChart data={mockData} />);

    // Act: Count the number of linear gradient definitions.
    const gradients = container.querySelectorAll("linearGradient");

    // Assert: Ensure at least three gradients exist and bars reference the correct gradient ID pattern.
    expect(gradients.length).toBeGreaterThan(2);
    expect(container.querySelector("linearGradient#lineGradient")).toBeInTheDocument();
    const cells = screen.getAllByTestId("cell");
    cells.forEach((cell) => {
      expect(cell).toHaveAttribute("data-fill", expect.stringMatching(/url\(#barGradient-\d+\)/));
    });
  });

  /**
   * Test case to verify the fallback color for the line element.
   */
  it("applies the default line color", () => {
    // Arrange: Render the chart without a custom color prop.
    render(<ResultsComposedChart data={mockData} />);

    // Act: Locate the line element.
    const line = screen.getByTestId("line");

    // Assert: Verify the default hex color code is applied to the stroke.
    expect(line).toHaveAttribute("data-stroke", "#10b981");
  });

  /**
   * Test case to verify that a custom color prop overrides the default line color.
   */
  it("applies a custom line color", () => {
    // Arrange: Define a custom color and render the chart.
    const customColor = "#ef4444";
    render(<ResultsComposedChart data={mockData} lineColor={customColor} />);

    // Act: Locate the line element.
    const line = screen.getByTestId("line");

    // Assert: Verify the custom color code is applied to the stroke.
    expect(line).toHaveAttribute("data-stroke", customColor);
  });

  /**
   * Test case to verify component stability when empty data is provided.
   */
  it("handles empty data gracefully", () => {
    // Arrange: Render the chart with an empty array.
    render(<ResultsComposedChart data={[]} />);

    // Assert: Verify no cells are rendered but the chart structure remains intact.
    expect(screen.queryByTestId("cell")).not.toBeInTheDocument();
    expect(screen.getByTestId("composed-chart")).toBeInTheDocument();
  });

  /**
   * Test case to verify that hover interactions correctly update individual bar opacities.
   */
  it("handles hover interactions correctly", async () => {
    // Arrange: Render the chart using a helper with user event capabilities.
    const { user } = renderWithUser(<ResultsComposedChart data={mockData} />);
    const cells = screen.getAllByTestId("cell");

    // Assert: Ensure all bars are initially opaque.
    expect(cells[0]).toHaveAttribute("data-opacity", "1");
    expect(cells[1]).toHaveAttribute("data-opacity", "1");

    // Act: Simulate a mouse interaction on the second bar.
    const trigger = screen.getByTestId("bar-interaction");
    await user.click(trigger);

    // Assert: Check that the targeted bar is opaque while others are dimmed.
    expect(cells[1]).toHaveAttribute("data-opacity", "1");
    expect(cells[0]).toHaveAttribute("data-opacity", "0.4");

    // Act: Simulate leaving the chart area.
    const chart = screen.getByTestId("composed-chart");
    await user.hover(chart);
    await user.unhover(chart);

    // Assert: Verify all bars return to full opacity.
    expect(cells[0]).toHaveAttribute("data-opacity", "1");
    expect(cells[1]).toHaveAttribute("data-opacity", "1");
  });

  /**
   * Test case to verify that unknown data names still receive valid visual styling.
   */
  it("uses default color logic for unknown classification names", () => {
    // Arrange: Create data with a name not found in the standard color map.
    const dataWithUnknown = [{ name: "unknown_entity", quantity: 10 }];
    const { container } = render(<ResultsComposedChart data={dataWithUnknown} />);

    // Assert: Verify that a cell is still rendered with a valid color gradient reference.
    expect(container).toBeInTheDocument();
    const cell = screen.getByTestId("cell");
    expect(cell).toBeInTheDocument();
    expect(cell).toHaveAttribute("data-fill", expect.stringMatching(/url\(#barGradient-\d+\)/));
  });
});

import userEvent from "@testing-library/user-event";
/**
 * Helper function to render a component with a pre-configured userEvent instance.
 */
function renderWithUser(ui: React.ReactElement) {
  return {
    user: userEvent.setup(),
    ...render(ui),
  };
}

/**
 * Test suite for the CustomTooltip component.
 * This suite verifies the conditional display logic for chart tooltips.
 */
describe("CustomTooltip", () => {
  /**
   * Test case to verify that tooltip content is visible when the component is active.
   */
  it("renders content when active and payload exists", () => {
    // Arrange: Render the tooltip with active status and mock data payload.
    render(
      <CustomTooltip
        active={true}
        payload={[{ value: 10, name: "test", unit: "unit", color: "red" }]}
        label="test-label"
      />
    );

    // Assert: Verify that the formatted label and the quantity are present in the document.
    expect(screen.getByText("Formatted test-label")).toBeInTheDocument();
    expect(screen.getByText("Quantity: 10")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the tooltip returns null when not active.
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

    // Assert: Verify that the output is empty.
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Test case to verify that the tooltip returns null when there is no data to display.
   */
  it("renders nothing when payload is empty", () => {
    // Arrange: Render the tooltip with an empty data payload.
    const { container } = render(<CustomTooltip active={true} payload={[]} label="test-label" />);

    // Assert: Verify that the output is empty despite being active.
    expect(container).toBeEmptyDOMElement();
  });
});
