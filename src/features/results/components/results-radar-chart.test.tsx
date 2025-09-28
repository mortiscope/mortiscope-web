import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ResultsRadarChart } from "@/features/results/components/results-radar-chart";

// Mock the recharts library to replace complex SVG polar coordinate math with testable HTML elements.
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  RadarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="radar-chart" data-length={data?.length}>
      {children}
    </div>
  ),
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: ({ tickFormatter }: { tickFormatter?: (value: string) => string }) => (
    <div data-testid="polar-angle-axis">
      {tickFormatter && <span data-testid="axis-tick">{tickFormatter("instar_1")}</span>}
    </div>
  ),
  PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Radar: () => <div data-testid="radar" />,
}));

// Mock the utility library to verify that data labels are correctly transformed by the application logic.
vi.mock("@/lib/utils", () => ({
  formatLabel: (label: string) => `Formatted ${label}`,
}));

/**
 * Test suite for the `ResultsRadarChart` component.
 */
describe("ResultsRadarChart", () => {
  const mockData = [
    { name: "adult", quantity: 5 },
    { name: "pupa", quantity: 10 },
    { name: "instar_1", quantity: 3 },
  ];

  /**
   * Test case to verify the component renders without crashing.
   */
  it("renders without crashing", () => {
    // Arrange: Render the radar chart with standard mock data.
    const { container } = render(<ResultsRadarChart data={mockData} />);

    // Assert: Verify the container exists in the document.
    expect(container).toBeInTheDocument();
  });

  /**
   * Test case to verify the presence of high-level chart layout containers.
   */
  it("renders the chart container structure", () => {
    // Arrange: Render the component.
    render(<ResultsRadarChart data={mockData} />);

    // Assert: Check for the responsive wrapper and the primary radar chart element.
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("radar-chart")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the data array is passed through to the underlying chart implementation.
   */
  it("passes data correctly to the chart", () => {
    // Arrange: Render the component.
    render(<ResultsRadarChart data={mockData} />);

    // Act: Access the chart mock to check received props.
    const chart = screen.getByTestId("radar-chart");

    // Assert: Verify the `data-length` attribute matches the input array size.
    expect(chart).toHaveAttribute("data-length", "3");
  });

  /**
   * Test case to verify all specialized polar components are present in the DOM.
   */
  it("renders all necessary polar components", () => {
    // Arrange: Render the component.
    render(<ResultsRadarChart data={mockData} />);

    // Assert: Verify the grid, axes, radar shape, and tooltip are rendered.
    expect(screen.getByTestId("polar-grid")).toBeInTheDocument();
    expect(screen.getByTestId("polar-angle-axis")).toBeInTheDocument();
    expect(screen.getByTestId("polar-radius-axis")).toBeInTheDocument();
    expect(screen.getByTestId("radar")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the axis labels are processed by the `formatLabel` utility.
   */
  it("formats axis labels correctly", () => {
    // Arrange: Render the component.
    render(<ResultsRadarChart data={mockData} />);

    // Assert: Check if the axis tick displays the formatted version of the input name.
    expect(screen.getByTestId("axis-tick")).toHaveTextContent("Formatted instar_1");
  });

  /**
   * Test case to verify component stability when provided with an empty dataset.
   */
  it("handles empty data gracefully", () => {
    // Arrange: Render the chart with an empty array.
    render(<ResultsRadarChart data={[]} />);

    // Act: Access the chart mock.
    const chart = screen.getByTestId("radar-chart");

    // Assert: Verify the data length is zero but the radar component still mounts.
    expect(chart).toHaveAttribute("data-length", "0");
    expect(screen.getByTestId("radar")).toBeInTheDocument();
  });
});

import { CustomTooltip } from "@/features/results/components/results-radar-chart";

/**
 * Test suite for the `CustomTooltip` used in the radar chart.
 */
describe("CustomTooltip", () => {
  /**
   * Test case to verify tooltip content is visible when the component is active.
   */
  it("renders content when active and payload exists", () => {
    // Arrange: Render the tooltip with active status and a valid data payload.
    render(
      <CustomTooltip
        active={true}
        payload={[{ value: 10, name: "test", unit: "unit", color: "red" }]}
        label="test-label"
      />
    );

    // Assert: Verify that the formatted label and quantity value are rendered.
    expect(screen.getByText("Formatted test-label")).toBeInTheDocument();
    expect(screen.getByText("Quantity: 10")).toBeInTheDocument();
  });

  /**
   * Test case to verify the tooltip returns null when not in an active state.
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

    // Assert: Verify the output is an empty DOM element.
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Test case to verify the tooltip returns null when the payload is an empty array.
   */
  it("renders nothing when payload is empty", () => {
    // Arrange: Render the tooltip with an empty payload.
    const { container } = render(<CustomTooltip active={true} payload={[]} label="test-label" />);

    // Assert: Verify the output is empty.
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Test case to verify the tooltip returns null when the payload is undefined.
   */
  it("renders nothing when payload is undefined", () => {
    // Arrange: Render the tooltip with `undefined` for the payload prop.
    const { container } = render(
      <CustomTooltip active={true} payload={undefined} label="test-label" />
    );

    // Assert: Verify the output is empty.
    expect(container).toBeEmptyDOMElement();
  });
});
