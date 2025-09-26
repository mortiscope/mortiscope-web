import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { ResultsRecalculateButton } from "@/features/results/components/results-recalculate-button";

// Mock the UI Button component to provide a stable, testable DOM element with a specific test ID.
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    "aria-label": ariaLabel,
    className,
  }: React.ComponentProps<"button">) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={className}
      data-testid="recalculate-button"
    >
      {children}
    </button>
  ),
}));

// Mock the Tooltip components to verify that helpful information is displayed conditionally.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// Mock the calculator icon to confirm it is rendered within the button.
vi.mock("react-icons/pi", () => ({
  PiCalculator: (props: React.ComponentProps<"svg">) => (
    <svg data-testid="icon-calculator" {...props} />
  ),
}));

/**
 * Test suite for the `ResultsRecalculateButton` component.
 */
describe("ResultsRecalculateButton", () => {
  const defaultProps = {
    caseId: "case-123",
    isDisabled: false,
    onClick: vi.fn(),
  };

  /**
   * Test case to verify that the button renders with the correct visual elements and enabled status.
   */
  it("renders the button with icon and text", () => {
    // Arrange: Render the button with standard props.
    render(<ResultsRecalculateButton {...defaultProps} />);

    // Assert: Check for the presence of the button, the calculator icon, and the specific label text.
    const button = screen.getByTestId("recalculate-button");
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(screen.getByTestId("icon-calculator")).toBeInTheDocument();
    expect(screen.getByText("Recalculate")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the tooltip is visible when the button is in an active state.
   */
  it("renders the tooltip when enabled", () => {
    // Arrange: Render the component with `isDisabled` set to false.
    render(<ResultsRecalculateButton {...defaultProps} isDisabled={false} />);

    // Assert: Verify that the tooltip wrapper and content are present and contain the expected text.
    expect(screen.getByTestId("tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip-content")).toHaveTextContent("Recalculate PMI");
  });

  /**
   * Test case to verify that the tooltip is removed from the DOM when the button is disabled.
   */
  it("does not render the tooltip when disabled", () => {
    // Arrange: Render the component with `isDisabled` set to true.
    render(<ResultsRecalculateButton {...defaultProps} isDisabled={true} />);

    // Assert: Ensure that neither the tooltip container nor its content are rendered.
    expect(screen.queryByTestId("tooltip")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tooltip-content")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that disabling the button correctly updates its DOM attributes and styles.
   */
  it("applies disabled styles and attributes when isDisabled is true", () => {
    // Arrange: Render the button in a disabled state.
    render(<ResultsRecalculateButton {...defaultProps} isDisabled={true} />);

    // Assert: Check that the button element has the `disabled` attribute and the parent span shows the correct cursor.
    const button = screen.getByTestId("recalculate-button");
    expect(button).toBeDisabled();
    expect(button.closest("span")).toHaveClass("cursor-not-allowed");
  });

  /**
   * Test case to verify that user clicks trigger the `onClick` callback when the button is enabled.
   */
  it("calls onClick handler when clicked and enabled", () => {
    // Arrange: Define a mock function and render an active button.
    const onClick = vi.fn();
    render(<ResultsRecalculateButton {...defaultProps} onClick={onClick} isDisabled={false} />);

    // Act: Simulate a user clicking the button.
    const button = screen.getByTestId("recalculate-button");
    fireEvent.click(button);

    // Assert: Verify the `onClick` callback was executed exactly once.
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the `onClick` handler is not triggered when the button is disabled.
   */
  it("does not call onClick handler when clicked and disabled", () => {
    // Arrange: Define a mock function and render a disabled button.
    const onClick = vi.fn();
    render(<ResultsRecalculateButton {...defaultProps} onClick={onClick} isDisabled={true} />);

    // Act: Attempt to click the button.
    const button = screen.getByTestId("recalculate-button");
    expect(button).toBeDisabled();
    fireEvent.click(button);

    // Assert: Confirm that the `onClick` callback was never executed.
    expect(onClick).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify component stability if the `onClick` prop is not provided.
   */
  it("does not throw error when clicked without an onClick handler", () => {
    // Arrange: Render the button without passing the `onClick` prop.
    render(<ResultsRecalculateButton caseId="case-123" />);

    // Act: Define a wrapper function to execute the click event.
    const button = screen.getByTestId("recalculate-button");
    const safeClick = () => fireEvent.click(button);

    // Assert: Verify that the interaction does not cause a runtime crash.
    expect(safeClick).not.toThrow();
  });
});
