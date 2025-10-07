import { act, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DashboardPieChart } from "@/features/dashboard/components/dashboard-pie-chart";

// Define a hoisted object to allow mutation of mock return values within tests.
const mocks = vi.hoisted(() => ({
  isMobile: false,
  tooltipPayload: [{ name: "verified", value: 50 }],
}));

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

// Reset mocks and window state after each test to maintain test isolation.
afterEach(() => {
  setWindowWidth(1024);
  mocks.isMobile = false;
  mocks.tooltipPayload = [{ name: "verified", value: 50 }];
});

// Mock the status configuration constants used for legend labels and colors.
vi.mock("@/lib/constants", () => ({
  STATUS_CONFIG: {
    verified: { label: "Verified Label", hex: "#10b981" },
    unverified: { label: "Unverified Label", hex: "#f59e0b" },
  },
}));

// Mock the mobile detection hook to simulate different device viewports.
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mocks.isMobile,
}));

// Mock framer-motion components to avoid animation overhead and complex element nesting.
vi.mock("framer-motion", () => ({
  motion: {
    g: ({ children }: { children: React.ReactNode }) => <g>{children}</g>,
  },
}));

// Mock the Recharts library to intercept chart configurations and verify data propagation.
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <svg data-testid="pie-chart">{children}</svg>
  ),
  Pie: (props: Record<string, unknown>) => {
    const { data, activeShape, activeIndex, onMouseEnter, onMouseLeave, innerRadius, outerRadius } =
      props;
    const safeProps = { innerRadius, outerRadius };
    return (
      <g data-testid="pie" data-props={JSON.stringify(safeProps)}>
        {activeIndex !== undefined && activeIndex !== null && (
          <g data-testid="active-shape">
            {typeof activeShape === "function"
              ? activeShape({
                  cx: 0,
                  cy: 0,
                  innerRadius: 0,
                  outerRadius: 0,
                  startAngle: 0,
                  endAngle: 0,
                  fill: "red",
                })
              : null}
          </g>
        )}

        {(data as Array<{ name: string; quantity: number }>).map(
          (item: { name: string; quantity: number }, index: number) => (
            <g
              key={item.name}
              data-testid="pie-segment"
              onMouseEnter={() => typeof onMouseEnter === "function" && onMouseEnter(null, index)}
              onMouseLeave={() => typeof onMouseLeave === "function" && onMouseLeave()}
            >
              <text>{item.name}</text>
            </g>
          )
        )}
      </g>
    );
  },
  Cell: () => <g data-testid="cell" />,
  Sector: () => <g data-testid="sector" />,
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
                payload: mocks.tooltipPayload,
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
}));

/**
 * Test suite for the `DashboardPieChart` component.
 */
describe("DashboardPieChart", () => {
  const mockData = [
    { name: "verified", quantity: 60 },
    { name: "unverified", quantity: 40 },
    { name: "empty_category", quantity: 0 },
    { name: "unknown_status", quantity: 20 },
  ];

  /**
   * Test case to verify that the chart and its responsive container are rendered in the document.
   */
  it("renders the chart container", () => {
    // Act: Render the pie chart component.
    render(<DashboardPieChart data={mockData} />);

    // Assert: Verify the presence of the chart and the responsive container.
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the central label correctly displays the sum of all quantities.
   */
  it("calculates and displays the correct total quantity in the center by default", () => {
    // Act: Render the component.
    render(<DashboardPieChart data={mockData} />);

    // Assert: Check for the expected total (60 + 40 + 0 + 20 = 120).
    expect(screen.getByText("120")).toBeInTheDocument();
  });

  /**
   * Test case to verify that data points with zero quantity are excluded from the rendered segments.
   */
  it("filters out data points with 0 quantity", () => {
    // Act: Render the component.
    render(<DashboardPieChart data={mockData} />);

    // Assert: Verify that only three segments (verified, unverified, unknown_status) are rendered.
    const segments = screen.getAllByTestId("pie-segment");
    expect(segments).toHaveLength(3);
  });

  /**
   * Test case to verify that the central text updates to reflect the value of the hovered segment.
   */
  it("updates central text when hovering over a segment", () => {
    // Arrange: Render the chart.
    render(<DashboardPieChart data={mockData} />);

    const segments = screen.getAllByTestId("pie-segment");
    const verifiedSegment = segments[0];

    // Assert: Check initial total state.
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.queryByText("60")).not.toBeInTheDocument();

    // Act: Simulate mouse hover over the "verified" segment.
    fireEvent.mouseEnter(verifiedSegment);

    // Assert: Verify central text changed to the hovered segment's value.
    expect(screen.getByText("60")).toBeInTheDocument();

    // Act: Simulate mouse leave.
    fireEvent.mouseLeave(verifiedSegment);

    // Assert: Verify central text reverted to the total sum.
    expect(screen.queryByText("60")).not.toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the legend displays custom labels from the global status configuration.
   */
  it("renders the custom legend with correct labels from config", () => {
    // Act: Render the component.
    render(<DashboardPieChart data={mockData} />);

    // Assert: Verify that labels from the configuration are rendered.
    const elements = screen.getAllByText("Verified Label");
    expect(elements[0]).toBeInTheDocument();
    const unverified = screen.getAllByText("Unverified Label");
    expect(unverified[0]).toBeInTheDocument();

    // Assert: Verify the legend label is rendered as a specific text element.
    const legendLabel = elements.find(
      (el) => el.tagName.toLowerCase() === "span" && el.className.includes("text-sm")
    );
    expect(legendLabel).toBeInTheDocument();
  });

  /**
   * Test case to verify that the active shape layer (highlight) is rendered during hover states.
   */
  it("renders the active shape (Sector/Motion) on hover", () => {
    // Arrange: Render the chart.
    render(<DashboardPieChart data={mockData} />);
    const segments = screen.getAllByTestId("pie-segment");

    // Act: Hover over the first segment.
    fireEvent.mouseEnter(segments[0]);

    // Assert: Check for the presence of the active shape and sector elements.
    expect(screen.getByTestId("active-shape")).toBeInTheDocument();
    const sectors = screen.getAllByTestId("sector");
    expect(sectors.length).toBeGreaterThan(0);
  });

  /**
   * Test case to verify that the tooltip displays the correct label, count, and calculated percentage.
   */
  it("renders the CustomTooltip with calculated percentage", () => {
    // Act: Render the component.
    render(<DashboardPieChart data={mockData} />);

    // Assert: Verify tooltip content for the mocked payload.
    const tooltipWrapper = screen.getByTestId("tooltip-wrapper");
    const { getByText } = within(tooltipWrapper);
    expect(getByText("Verified Label")).toBeInTheDocument();
    expect(getByText("Count: 50")).toBeInTheDocument();
    expect(getByText("Percentage: 42%")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the chart dimensions and font sizes adapt for mobile devices.
   */
  it("adapts to mobile view (coverage for mobile props and classes)", () => {
    // Arrange: Set the mock state to mobile mode.
    mocks.isMobile = true;
    render(<DashboardPieChart data={mockData} />);

    // Assert: Verify the inner and outer radii are adjusted for mobile layout.
    const pie = screen.getByTestId("pie");
    const pieProps = JSON.parse(pie.getAttribute("data-props") || "{}");
    expect(pieProps.innerRadius).toBe("55%");
    expect(pieProps.outerRadius).toBe("85%");

    // Assert: Verify that mobile-specific typography classes are applied to the legend.
    const legendLabel = screen
      .getAllByText("Verified Label")
      .find((el) => el.tagName.toLowerCase() === "span" && el.className.includes("text-xs"));
    expect(legendLabel).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component uses raw status names if they are missing from the configuration.
   */
  it("handles unknown status label fallback", () => {
    // Arrange: Mock a tooltip payload with an unrecognized status key.
    mocks.tooltipPayload = [{ name: "unknown_status", value: 10 }];
    render(<DashboardPieChart data={mockData} />);

    // Assert: Verify that the tooltip falls back to the raw name string.
    const tooltipWrapper = screen.getByTestId("tooltip-wrapper");
    const { getByText } = within(tooltipWrapper);

    expect(getByText("unknown_status")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the percentage calculation handles empty datasets without division-by-zero errors.
   */
  it("handles zero total quantity for percentage calculation", () => {
    // Act: Render with an empty dataset.
    render(<DashboardPieChart data={[]} />);

    // Arrange: Mock an empty tooltip state.
    mocks.tooltipPayload = [{ name: "verified", value: 0 }];

    // Assert: Verify the percentage calculation falls back to 0%.
    const tooltipWrapper = screen.getByTestId("tooltip-wrapper");
    const { getByText } = within(tooltipWrapper);

    expect(getByText("Percentage: 0%")).toBeInTheDocument();
  });
});
