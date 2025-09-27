import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PmiWidgetToolbar } from "@/features/results/components/pmi-widget-toolbar";

// Mock framer-motion to simplify the DOM tree and bypass animation lifecycle delays.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock icon libraries to replace complex SVG assets with simple testable spans.
vi.mock("react-icons/fa6", () => ({
  FaRegHourglass: () => <span data-testid="icon-hourglass" />,
}));
vi.mock("react-icons/io5", () => ({
  IoInformation: () => <span data-testid="icon-info" />,
}));
vi.mock("react-icons/lu", () => ({
  LuCalendarRange: () => <span data-testid="icon-calendar" />,
  LuClock: () => <span data-testid="icon-clock" />,
}));
vi.mock("react-icons/pi", () => ({
  PiWarning: () => <span data-testid="icon-warning" />,
  PiSealPercent: () => <span />,
  PiSealWarning: () => <span />,
}));

// Provide a mock for `ResizeObserver` as it is required by some Radix UI components but missing in JSDOM.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

/**
 * Test suite for the `PmiWidgetToolbar` component.
 */
describe("PmiWidgetToolbar", () => {
  // Define standard props to represent a normal state with an active estimation.
  const defaultProps = {
    selectedUnit: "Hours" as const,
    onUnitSelect: vi.fn(),
    onInfoClick: vi.fn(),
    hasEstimation: true,
    isInfoButtonEnabled: true,
    isRecalculationNeeded: false,
  };

  /**
   * Test case to verify that the toolbar renders its primary interactive elements by default.
   */
  it("renders the toolbar with default state", () => {
    // Arrange: Render the toolbar with baseline properties.
    render(<PmiWidgetToolbar {...defaultProps} />);

    // Assert: Check for the existence of the information and time adjustment controls.
    expect(screen.getByLabelText("Information")).toBeInTheDocument();
    expect(screen.getByLabelText("Adjust time unit")).toBeInTheDocument();
    expect(screen.queryByLabelText("PMI estimation outdated")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that a warning is displayed when the PMI data is no longer current.
   */
  it("renders the warning icon when recalculation is needed", () => {
    // Arrange: Set the `isRecalculationNeeded` prop to true.
    render(<PmiWidgetToolbar {...defaultProps} isRecalculationNeeded={true} />);

    // Assert: Verify that the warning accessibility label and icon are visible.
    expect(screen.getByLabelText("PMI estimation outdated")).toBeInTheDocument();
    expect(screen.getByTestId("icon-warning")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the information button triggers the associated callback.
   */
  it("calls onInfoClick when the info button is clicked", async () => {
    // Arrange: Initialize user events and the callback mock.
    const user = userEvent.setup();
    const onInfoClick = vi.fn();
    render(<PmiWidgetToolbar {...defaultProps} onInfoClick={onInfoClick} />);

    // Act: Click the information button.
    await user.click(screen.getByLabelText("Information"));

    // Assert: Confirm the handler was executed once.
    expect(onInfoClick).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the information button can be programmatically disabled.
   */
  it("disables the info button when isInfoButtonEnabled is false", () => {
    // Arrange: Set `isInfoButtonEnabled` to false.
    render(<PmiWidgetToolbar {...defaultProps} isInfoButtonEnabled={false} />);

    // Assert: Confirm the button reflects the disabled state.
    const button = screen.getByLabelText("Information");
    expect(button).toBeDisabled();
  });

  /**
   * Test case to verify that the unit selection trigger displays an icon matching the active unit.
   */
  it("renders the correct icon based on selectedUnit", () => {
    // Arrange & Act: Render and rerender with different time units.
    const { rerender } = render(<PmiWidgetToolbar {...defaultProps} selectedUnit="Minutes" />);
    // Assert: Check for the clock icon.
    expect(screen.getByTestId("icon-clock")).toBeInTheDocument();

    rerender(<PmiWidgetToolbar {...defaultProps} selectedUnit="Hours" />);
    // Assert: Check for the hourglass icon.
    expect(screen.getByTestId("icon-hourglass")).toBeInTheDocument();

    rerender(<PmiWidgetToolbar {...defaultProps} selectedUnit="Days" />);
    // Assert: Check for the calendar icon.
    expect(screen.getByTestId("icon-calendar")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the unit dropdown allows users to change the active time unit.
   */
  it("opens the dropdown and calls onUnitSelect when an option is clicked", async () => {
    // Arrange: Initialize user events and render.
    const user = userEvent.setup();
    const onUnitSelect = vi.fn();
    render(<PmiWidgetToolbar {...defaultProps} onUnitSelect={onUnitSelect} />);

    // Act: Click the trigger to open the menu and select a different unit.
    const trigger = screen.getByLabelText("Adjust time unit");
    await user.click(trigger);

    // Assert: Verify all unit options are rendered.
    expect(screen.getByText("Minutes")).toBeInTheDocument();
    expect(screen.getByText("Hours")).toBeInTheDocument();
    expect(screen.getByText("Days")).toBeInTheDocument();

    // Act: Click the 'Days' option.
    await user.click(screen.getByText("Days"));

    // Assert: Confirm the selection callback was invoked with the correct argument.
    expect(onUnitSelect).toHaveBeenCalledTimes(1);
    expect(onUnitSelect).toHaveBeenCalledWith("Days");
  });

  /**
   * Test case to verify that time unit adjustment is locked if no estimation has been calculated.
   */
  it("disables the time unit dropdown when hasEstimation is false", () => {
    // Arrange: Set `hasEstimation` to false.
    render(<PmiWidgetToolbar {...defaultProps} hasEstimation={false} />);

    // Assert: Confirm that the dropdown trigger button is disabled.
    const trigger = screen.getByLabelText("Adjust time unit");
    expect(trigger).toBeDisabled();
  });
});
