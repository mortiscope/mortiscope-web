import { fireEvent, render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { AnnotationModalContainer } from "@/features/annotation/components/annotation-modal-container";

// Mock the framer-motion library to avoid animation-related side effects during testing.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock the Dialog UI components to simulate open/close behavior and capture events.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
  }) =>
    open ? (
      <div data-testid="dialog-root">
        <button data-testid="dialog-close" onClick={() => onOpenChange(false)}>
          Close
        </button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
}));

/**
 * Test suite for the `AnnotationModalContainer` component.
 */
describe("AnnotationModalContainer", () => {
  // Mock function to track the state changes of the modal.
  const mockOnOpenChange = vi.fn();

  // Define default properties to be shared across multiple test cases.
  const defaultProps = {
    isOpen: true,
    onOpenChange: mockOnOpenChange,
    children: <div data-testid="child-content">Modal Content</div>,
  };

  /**
   * Test case to verify that the modal and its children are rendered when the isOpen prop is true.
   */
  it("renders children when isOpen is true", () => {
    // Arrange: Render the container with the `isOpen` prop set to true.
    render(<AnnotationModalContainer {...defaultProps} />);

    // Assert: Verify that the dialog structure and the passed `children` are visible in the document.
    expect(screen.getByTestId("dialog-root")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Modal Content")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the modal does not render any content when the isOpen prop is false.
   */
  it("does not render when isOpen is false", () => {
    // Arrange: Render the container with the `isOpen` prop set to false.
    render(<AnnotationModalContainer {...defaultProps} isOpen={false} />);

    // Assert: Ensure that neither the dialog root nor the `children` content is present in the DOM.
    expect(screen.queryByTestId("dialog-root")).not.toBeInTheDocument();
    expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the onOpenChange callback is triggered when the dialog is closed.
   */
  it("calls onOpenChange when dialog requests close", () => {
    // Arrange: Render the component in an open state.
    render(<AnnotationModalContainer {...defaultProps} />);

    // Act: Simulate a user clicking the close button within the mocked dialog.
    const closeButton = screen.getByTestId("dialog-close");
    fireEvent.click(closeButton);

    // Assert: Verify that the `mockOnOpenChange` function was called with the value `false`.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that specific Tailwind CSS classes are applied to the modal content wrapper.
   */
  it("applies correct styling classes to content wrapper", () => {
    // Arrange: Render the component to inspect its applied attributes.
    render(<AnnotationModalContainer {...defaultProps} />);

    // Assert: Check that the `DialogContent` element contains the required layout and styling classes.
    const content = screen.getByTestId("dialog-content");
    expect(content).toHaveClass("flex", "flex-col", "rounded-2xl", "bg-white", "shadow-2xl");
  });
});
