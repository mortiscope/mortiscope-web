import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CustomTooltip, ResultsPieChart } from "@/features/results/components/results-pie-chart";
import { useIsMobile } from "@/hooks/use-mobile";

// Mock framer-motion to bypass animation cycles and provide stable group elements for SVG assertions.
vi.mock("framer-motion", () => ({
  motion: {
    g: ({ children }: { children: React.ReactNode }) => <g data-testid="motion-g">{children}</g>,
  },
}));

// Mock recharts components to render simplified DOM structures while exposing internal calculation props like labels and active shapes.
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <svg data-testid="pie-chart">{children}</svg>
  ),
  Pie: ({
    children,
    label,
    data,
    onMouseEnter,
    onMouseLeave,
    activeIndex,
    activeShape,
  }: {
    children?: React.ReactNode;
    label?: (props: unknown) => React.ReactNode;
    data?: unknown[];
    onMouseEnter?: (data: unknown, index: number) => void;
    onMouseLeave?: () => void;
    activeIndex?: number;
    activeShape?: (props: unknown) => React.ReactNode;
  }) => {
    return (
      <g data-testid="pie" data-count={data?.length} onMouseLeave={onMouseLeave}>
        {data?.map((_d: unknown, i: number) => {
          const percent = 1 / (data.length || 1);
          const LabelComp =
            typeof label === "function"
              ? label({
                  cx: 100,
                  cy: 100,
                  midAngle: 0,
                  innerRadius: 50,
                  outerRadius: 80,
                  percent,
                  index: i,
                })
              : null;

          const isActive = i === activeIndex;
          const ActiveShapeComp =
            isActive && typeof activeShape === "function"
              ? activeShape({
                  cx: 100,
                  cy: 100,
                  innerRadius: 50,
                  outerRadius: 80,
                  startAngle: 0,
                  endAngle: 360,
                  fill: "red",
                  payload: _d,
                })
              : null;

          return (
            <g key={i}>
              <text>{`Label: ${i}`}</text>
              {React.isValidElement(LabelComp) ? LabelComp : null}
              {React.isValidElement(ActiveShapeComp) ? ActiveShapeComp : null}
              <circle
                data-testid={`pie-sector-${i}`}
                r="10"
                onClick={() => onMouseEnter?.(null, i)}
              />
            </g>
          );
        })}
        {children}
      </g>
    );
  },
  Cell: ({ fill }: { fill: string }) => <g data-testid="cell" data-fill={fill} />,
  Tooltip: () => <g data-testid="tooltip" />,
  Sector: () => <g data-testid="sector" />,
}));

// Mock the mobile detection hook to simulate responsive layout behavior.
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(),
}));

// Mock utility functions to verify proper class merging and label formatting.
vi.mock("@/lib/utils", () => ({
  cn: (...inputs: string[]) => inputs.join(" "),
  formatLabel: (label: string) => `Formatted ${label}`,
}));

/**
 * Test suite for the `ResultsPieChart` component.
 */
describe("ResultsPieChart", () => {
  const mockData = [
    { name: "adult", quantity: 5 },
    { name: "pupa", quantity: 10 },
    { name: "instar_1", quantity: 3 },
  ];

  // Initialize common mock state before each test case.
  beforeEach(() => {
    vi.mocked(useIsMobile).mockReturnValue(false);
  });

  /**
   * Test case to verify the component renders without crashing.
   */
  it("renders without crashing", () => {
    // Arrange: Render the chart with standard data.
    const { container } = render(<ResultsPieChart data={mockData} />);

    // Assert: Check that the root container exists.
    expect(container).toBeInTheDocument();
  });

  /**
   * Test case to verify the presence of high-level chart containers.
   */
  it("renders the chart container structure", () => {
    // Arrange: Render the component.
    render(<ResultsPieChart data={mockData} />);

    // Assert: Verify the responsive wrapper and SVG element are present.
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  /**
   * Test case to verify that data points with zero quantity are filtered out of the chart.
   */
  it("renders the correct number of cells based on filtered data (quantity > 0)", () => {
    // Arrange: Append a zero-quantity item to the mock data.
    const dataWithZero = [...mockData, { name: "none", quantity: 0 }];
    render(<ResultsPieChart data={dataWithZero} />);

    // Act: Count the rendered cell elements.
    const cells = screen.getAllByTestId("cell");

    // Assert: Verify that only items with `quantity > 0` are rendered.
    expect(cells).toHaveLength(3);
  });

  /**
   * Test case to verify the calculation and rendering of the central total summary.
   */
  it("renders the center total display by default", () => {
    // Arrange: Render the component.
    render(<ResultsPieChart data={mockData} />);

    // Assert: Check that the sum of quantities and the "Total" label are visible.
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  /**
   * Test case to verify that radial gradients are generated for stylistic depth in segments.
   */
  it("generates radial gradients in defs", () => {
    // Arrange: Render the component.
    const { container } = render(<ResultsPieChart data={mockData} />);

    // Act: Query for SVG gradient definitions.
    const gradients = container.querySelectorAll("radialGradient");

    // Assert: Ensure gradients exist and cells reference them in their `fill` attribute.
    expect(gradients.length).toBeGreaterThan(0);
    const cells = screen.getAllByTestId("cell");
    cells.forEach((cell) => {
      expect(cell).toHaveAttribute(
        "data-fill",
        expect.stringMatching(/url\(#radialGradient-\d+\)/)
      );
    });
  });

  /**
   * Test case to verify the rendering of the custom chart legend with formatted labels.
   */
  it("renders the custom legend", () => {
    // Arrange: Render the component.
    render(<ResultsPieChart data={mockData} />);

    // Assert: Verify each label is processed through the `formatLabel` utility.
    expect(screen.getByText("Formatted adult")).toBeInTheDocument();
    expect(screen.getByText("Formatted pupa")).toBeInTheDocument();
    expect(screen.getByText("Formatted instar_1")).toBeInTheDocument();
  });

  /**
   * Test case to verify percentage labels are rendered within the segments.
   */
  it("renders labels inside the Pie mock", () => {
    // Arrange: Render the component.
    render(<ResultsPieChart data={mockData} />);

    // Assert: Check for the presence of percentage text calculated by the mock.
    const percentLabels = screen.getAllByText(/33%/);
    expect(percentLabels.length).toBeGreaterThan(0);
  });

  /**
   * Test case to verify component stability when empty or purely zero data is provided.
   */
  it("handles empty/zero data gracefully", () => {
    // Arrange: Render with data that results in zero total.
    render(<ResultsPieChart data={[{ name: "nothing", quantity: 0 }]} />);

    // Assert: Verify no cells render but the total summary displays zero.
    expect(screen.queryByTestId("cell")).not.toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  /**
   * Test case to verify that hovering over a segment swaps the central total for the specific segment value.
   */
  it("handles hover interactions correctly", async () => {
    // Arrange: Setup user interaction and render.
    const user = userEvent.setup();
    render(<ResultsPieChart data={mockData} />);

    // Act: Check initial state where "Total" is visible.
    const totalElement = screen.getByText("Total").closest("div");
    expect(totalElement).toHaveClass("opacity-100");

    // Act: Simulate a hover interaction on the first sector.
    const sectorTrigger = screen.getByTestId("pie-sector-0");
    await user.click(sectorTrigger);

    // Assert: Verify "Total" is hidden and the specific value for that sector is shown.
    expect(totalElement).toHaveClass("opacity-0");
    const specificValue = screen.getByText("5");
    const specificContainer = specificValue.closest("div");
    expect(specificContainer).toHaveClass("opacity-100");

    // Act: Simulate leaving the pie area.
    const pieGroup = screen.getByTestId("pie");
    await user.unhover(pieGroup);

    // Assert: Verify the view reverts to the general "Total" summary.
    expect(totalElement).toHaveClass("opacity-100");
    expect(specificContainer).toHaveClass("opacity-0");
  });

  /**
   * Test case to verify that data labels with unknown classification names use fallback color logic.
   */
  it("uses default color logic for unknown names", () => {
    // Arrange: Provide a name not present in the standard color palette.
    const dataWithUnknown = [{ name: "unknown_entity", quantity: 10 }];
    render(<ResultsPieChart data={dataWithUnknown} />);

    // Assert: Verify the cell is rendered with a fallback radial gradient.
    const cell = screen.getByTestId("cell");
    expect(cell).toBeInTheDocument();
    expect(cell).toHaveAttribute("data-fill", expect.stringMatching(/url\(#radialGradient-\d+\)/));
  });

  /**
   * Test case to verify that specific CSS classes are applied when the component is in mobile view.
   */
  it("adjusts layout for mobile view", () => {
    // Arrange: Simulate a mobile viewport.
    vi.mocked(useIsMobile).mockReturnValue(true);
    render(<ResultsPieChart data={mockData} />);

    // Assert: Verify that legend text items use smaller font sizes for constrained screens.
    const legendText = screen.getByText("Formatted adult");
    const legendItemContainer = legendText.closest("span");
    expect(legendItemContainer).toHaveClass("text-xs");
  });

  /**
   * Test case to verify that small percentage labels are hidden to avoid visual clutter.
   */
  it("does not render labels for very small segments (< 5%)", () => {
    // Arrange: Create a data set with many small segments.
    vi.mocked(useIsMobile).mockReturnValue(false);
    const largeData = Array.from({ length: 25 }, (_, i) => ({
      name: `item-${i}`,
      quantity: 1,
    }));

    // Act: Render the chart.
    render(<ResultsPieChart data={largeData} />);

    // Assert: Verify that percentage labels are suppressed for the small slices.
    const percentLabels = screen.queryAllByText(/%/);
    expect(percentLabels.length).toBe(0);
  });
});

/**
 * Test suite for the CustomTooltip component used by the pie chart.
 */
describe("CustomTooltip", () => {
  /**
   * Test case to verify the tooltip displays formatted data when active.
   */
  it("renders content when active and payload exists", () => {
    // Arrange: Provide active state and payload.
    render(
      <CustomTooltip
        active={true}
        payload={[{ value: 10, name: "test-label", unit: "unit", color: "red" }]}
        label="test-label"
      />
    );

    // Assert: Verify formatted label and value presence.
    expect(screen.getByText("Formatted test-label")).toBeInTheDocument();
    expect(screen.getByText("Quantity: 10")).toBeInTheDocument();
  });

  /**
   * Test case to verify the tooltip renders nothing when not active.
   */
  it("renders nothing when inactive", () => {
    // Arrange: Provide inactive state.
    const { container } = render(
      <CustomTooltip
        active={false}
        payload={[{ value: 10, name: "test", unit: "unit", color: "red" }]}
        label="test-label"
      />
    );

    // Assert: Verify empty DOM.
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Test case to verify the tooltip renders nothing if the payload is missing.
   */
  it("renders nothing when payload is empty", () => {
    // Arrange: Provide empty payload.
    const { container } = render(<CustomTooltip active={true} payload={[]} label="test-label" />);

    // Assert: Verify empty DOM.
    expect(container).toBeEmptyDOMElement();
  });
});
