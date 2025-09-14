import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UploadFormActions } from "@/features/upload/components/upload-form-actions";

// Mock the 'framer-motion' library components to simplify rendering and focus on component logic.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
  },
}));

// Mock the custom `Button` component to ensure interactions are correctly simulated and captured.
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    className,
    disabled,
    onClick,
    ...props
  }: React.ComponentProps<"button">) => (
    <button className={className} disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

// Mock the `CardFooter` component to verify content within the expected footer structure.
vi.mock("@/components/ui/card", () => ({
  CardFooter: ({ children, className }: React.ComponentProps<"div">) => (
    <div className={className}>{children}</div>
  ),
}));

// Mock the external style constants used for button styling.
vi.mock("@/features/cases/constants/styles", () => ({
  buttonClasses: "mock-button-class",
}));

/**
 * Test suite for the `UploadFormActions` component.
 */
describe("UploadFormActions", () => {
  // Arrange: Define a default set of props, including mock functions for navigation handlers.
  const defaultProps = {
    onPrev: vi.fn(),
    onNext: vi.fn(),
    isNextDisabled: false,
  };

  /**
   * Test case to verify that the "Previous" and "Next" buttons are rendered and visible.
   */
  it("renders Previous and Next buttons", () => {
    // Arrange: Render the component with default props.
    render(<UploadFormActions {...defaultProps} />);

    // Assert: Check that the buttons containing the "Previous" and "Next" text are present in the document.
    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the `onPrev` handler is executed when the "Previous" button is clicked.
   */
  it("calls onPrev when Previous button is clicked", () => {
    // Arrange: Render the component.
    render(<UploadFormActions {...defaultProps} />);

    // Act: Simulate a click on the "Previous" button.
    fireEvent.click(screen.getByText("Previous"));
    // Assert: Verify that the `onPrev` mock function was called exactly once.
    expect(defaultProps.onPrev).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the `onNext` handler is executed when the "Next" button is clicked.
   */
  it("calls onNext when Next button is clicked", () => {
    // Arrange: Render the component.
    render(<UploadFormActions {...defaultProps} />);

    // Act: Simulate a click on the "Next" button.
    fireEvent.click(screen.getByText("Next"));
    // Assert: Verify that the `onNext` mock function was called exactly once.
    expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the "Next" button is rendered in a disabled state when `isNextDisabled` is `true`.
   */
  it("disables Next button when isNextDisabled is true", () => {
    // Arrange: Render the component with `isNextDisabled` set to `true`.
    render(<UploadFormActions {...defaultProps} isNextDisabled={true} />);

    // Assert: Retrieve the "Next" button and check for the `disabled` attribute.
    const nextButton = screen.getByText("Next");
    expect(nextButton).toBeDisabled();
  });

  /**
   * Test case to verify that the `onNext` handler is not called if the "Next" button is clicked while disabled.
   */
  it("does not call onNext when disabled button is clicked", () => {
    // Arrange: Render the component with `isNextDisabled` set to `true`.
    render(<UploadFormActions {...defaultProps} isNextDisabled={true} />);

    // Act: Retrieve the disabled "Next" button and simulate a click.
    const nextButton = screen.getByText("Next");
    fireEvent.click(nextButton);
    // Assert: Verify that the `onNext` mock function was not called.
    expect(defaultProps.onNext).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the "Next" button is enabled when `isNextDisabled` is `false`.
   */
  it("enables Next button when isNextDisabled is false", () => {
    // Arrange: Render the component with `isNextDisabled` set to `false`.
    render(<UploadFormActions {...defaultProps} isNextDisabled={false} />);

    // Assert: Retrieve the "Next" button and check that it is not disabled.
    const nextButton = screen.getByText("Next");
    expect(nextButton).not.toBeDisabled();
  });
});
