import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PmiWidget } from "@/features/results/components/pmi-widget";
import { type TimeUnit } from "@/features/results/components/pmi-widget-toolbar";

// Mock framer-motion to simplify the DOM hierarchy and bypass animation-related side effects.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
    p: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <p className={className}>{children}</p>
    ),
  },
}));

// Mock the `PmiWidgetToolbar` to verify that parent props are correctly delegated to the sub-component.
vi.mock("@/features/results/components/pmi-widget-toolbar", () => ({
  PmiWidgetToolbar: (props: { selectedUnit: TimeUnit; isRecalculationNeeded: boolean }) => (
    <div data-testid="pmi-widget-toolbar">
      <span>Unit: {props.selectedUnit}</span>
      <span>Recalc: {props.isRecalculationNeeded ? "Yes" : "No"}</span>
    </div>
  ),
}));

// Mock React Icons to replace SVG complexity with a simple testable element.
vi.mock("react-icons/fa", () => ({
  FaHourglassHalf: () => <span data-testid="icon-hourglass" />,
}));

/**
 * Test suite for the `PmiWidget` component.
 */
describe("PmiWidget", () => {
  // Define default props to simulate a successful Post-Mortem Interval estimation.
  const defaultProps = {
    pmiValue: 24.5,
    selectedUnit: "Hours" as const,
    onUnitSelect: vi.fn(),
    onInfoClick: vi.fn(),
    hasEstimation: true,
    isInfoButtonEnabled: true,
    isRecalculationNeeded: false,
  };

  /**
   * Test case to verify that the widget header and decorative icons are rendered.
   */
  it("renders the widget title and icon", () => {
    // Arrange: Render the widget with default properties.
    render(<PmiWidget {...defaultProps} />);

    // Assert: Check for the specific heading text and the presence of expected icons.
    expect(screen.getByText("PMI Estimation")).toBeInTheDocument();
    expect(screen.getAllByTestId("icon-hourglass")).toHaveLength(2);
  });

  /**
   * Test case to verify that the toolbar sub-component receives state updates for units and warnings.
   */
  it("renders the toolbar with correct props", () => {
    // Arrange: Set `isRecalculationNeeded` to true and render.
    render(<PmiWidget {...defaultProps} isRecalculationNeeded={true} />);

    // Assert: Verify the mock toolbar reflects the passed `selectedUnit` and recalculation status.
    const toolbar = screen.getByTestId("pmi-widget-toolbar");
    expect(toolbar).toBeInTheDocument();
    expect(screen.getByText("Unit: Hours")).toBeInTheDocument();
    expect(screen.getByText("Recalc: Yes")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the numeric PMI value is formatted to two decimal places.
   */
  it("displays the PMI value and unit when estimation is available", () => {
    // Arrange: Provide a raw numeric value with multiple decimal places.
    render(<PmiWidget {...defaultProps} pmiValue={12.3456} />);

    // Assert: Check that the value is rounded to `12.35` and the unit label is present.
    expect(screen.getByText("12.35")).toBeInTheDocument();
    expect(screen.getByText("Hours")).toBeInTheDocument();
    expect(screen.queryByText("No estimation.")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the widget displays a placeholder message when no estimation exists.
   */
  it("displays 'No estimation.' when hasEstimation is false", () => {
    // Arrange: Set `hasEstimation` to false and provide a null value.
    render(<PmiWidget {...defaultProps} hasEstimation={false} pmiValue={null} />);

    // Assert: Verify the placeholder text is visible and the previous numeric value is hidden.
    expect(screen.getByText("No estimation.")).toBeInTheDocument();
    expect(screen.queryByText("24.50")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that invalid numeric values trigger the fallback state even if the estimation flag is true.
   */
  it("displays 'No estimation.' when pmiValue is not a number, even if hasEstimation is true", () => {
    // Arrange: Provide an undefined `pmiValue`.
    render(<PmiWidget {...defaultProps} hasEstimation={true} pmiValue={undefined} />);

    // Assert: Confirm the fallback text is displayed.
    expect(screen.getByText("No estimation.")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the UI updates dynamically when the underlying PMI value changes.
   */
  it("updates the displayed value when pmiValue changes", () => {
    // Arrange: Render with an initial value.
    const { rerender } = render(<PmiWidget {...defaultProps} pmiValue={10} />);
    expect(screen.getByText("10.00")).toBeInTheDocument();

    // Act: Update the value to a new number.
    rerender(<PmiWidget {...defaultProps} pmiValue={50.5} />);

    // Assert: Confirm the UI reflects the new formatted value.
    expect(screen.getByText("50.50")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the unit label updates dynamically when the unit selection changes.
   */
  it("updates the displayed unit text when selectedUnit changes", () => {
    // Arrange: Render with the unit set to 'Days'.
    const { rerender } = render(<PmiWidget {...defaultProps} selectedUnit="Days" />);
    expect(screen.getByText("Days")).toBeInTheDocument();

    // Act: Update the unit to 'Minutes'.
    rerender(<PmiWidget {...defaultProps} selectedUnit="Minutes" />);

    // Assert: Confirm the text label matches the new unit.
    expect(screen.getByText("Minutes")).toBeInTheDocument();
  });
});
