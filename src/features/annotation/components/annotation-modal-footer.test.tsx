import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnnotationModalFooter } from "@/features/annotation/components/annotation-modal-footer";

// Mock the framer-motion library to bypass animations during the execution of test cases.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock the DialogFooter component to verify its presence and class application in the DOM.
vi.mock("@/components/ui/dialog", () => ({
  DialogFooter: ({ children, className }: { children: React.ReactNode; className: string }) => (
    <div className={className}>{children}</div>
  ),
}));

// Mock the custom Button component to simulate user interactions and state changes.
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

/**
 * Test suite for the `AnnotationModalFooter` component.
 */
describe("AnnotationModalFooter", () => {
  // Mock functions to track button click events.
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  // Define default properties to ensure consistency across standard test cases.
  const defaultProps = {
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
  };

  /**
   * Test case to verify that the footer renders two buttons with default labels.
   */
  it("renders both Cancel and Confirm buttons by default", () => {
    // Arrange: Render the footer with standard properties.
    render(<AnnotationModalFooter {...defaultProps} />);

    // Assert: Verify that the expected default text labels are present.
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });

  /**
   * Test case to verify that custom labels are correctly passed to the button components.
   */
  it("renders custom text for buttons", () => {
    // Arrange: Render the component with explicit `cancelText` and `confirmText` props.
    render(
      <AnnotationModalFooter {...defaultProps} cancelText="Back" confirmText="Save Changes" />
    );

    // Assert: Check if the custom strings are rendered instead of defaults.
    expect(screen.getByText("Back")).toBeInTheDocument();
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the cancel button is hidden when the singleButton prop is enabled.
   */
  it("renders single button when singleButton prop is true", () => {
    // Arrange: Render the component with the `singleButton` flag.
    render(<AnnotationModalFooter {...defaultProps} singleButton />);

    // Assert: Ensure the confirm button exists while the cancel button is removed from the DOM.
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the onConfirm callback is executed upon user interaction.
   */
  it("calls onConfirm when confirm button is clicked", () => {
    // Arrange: Render the component to access the confirm action.
    render(<AnnotationModalFooter {...defaultProps} />);

    // Act: Simulate a user click on the button labeled Confirm.
    const confirmButton = screen.getByText("Confirm");
    fireEvent.click(confirmButton);

    // Assert: Check that the `mockOnConfirm` function was triggered exactly once.
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the onCancel callback is executed upon user interaction.
   */
  it("calls onCancel when cancel button is clicked", () => {
    // Arrange: Render the component to access the cancel action.
    render(<AnnotationModalFooter {...defaultProps} />);

    // Act: Simulate a user click on the button labeled Cancel.
    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    // Assert: Check that the `mockOnCancel` function was triggered exactly once.
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that interaction is prevented when an asynchronous action is pending.
   */
  it("disables buttons and shows spinner when isPending is true", () => {
    // Arrange: Render the component with the `isPending` state active.
    render(<AnnotationModalFooter {...defaultProps} isPending />);

    // Act: Locate the confirm and cancel buttons by their role and name.
    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });

    // Assert: Verify that both buttons are set to a disabled state.
    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  /**
   * Test case to verify that custom status text is displayed during the pending state.
   */
  it("shows custom pending text", () => {
    // Arrange: Render the component with `isPending` and a specific `pendingText` value.
    render(<AnnotationModalFooter {...defaultProps} isPending pendingText="Saving..." />);

    // Assert: Confirm that the provided status message is visible to the user.
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the destructive variant applies high-contrast rose styling.
   */
  it("applies the destructive variant classes", () => {
    // Arrange: Render with the `buttonVariant` set to `destructive`.
    render(<AnnotationModalFooter {...defaultProps} buttonVariant="destructive" />);

    // Act: Access the confirm button.
    const confirmButton = screen.getByText("Confirm");

    // Assert: Verify the presence of the `bg-rose-600` Tailwind class.
    expect(confirmButton).toHaveClass("bg-rose-600");
  });

  /**
   * Test case to verify that the warning variant applies amber styling.
   */
  it("applies the warning variant classes", () => {
    // Arrange: Render with the `buttonVariant` set to `warning`.
    render(<AnnotationModalFooter {...defaultProps} buttonVariant="warning" />);

    // Act: Access the confirm button.
    const confirmButton = screen.getByText("Confirm");

    // Assert: Verify the presence of the `bg-amber-500` Tailwind class.
    expect(confirmButton).toHaveClass("bg-amber-500");
  });

  /**
   * Test case to verify that the success variant applies emerald styling.
   */
  it("applies the success variant classes", () => {
    // Arrange: Render with the `buttonVariant` set to `success`.
    render(<AnnotationModalFooter {...defaultProps} buttonVariant="success" />);

    // Act: Access the confirm button.
    const confirmButton = screen.getByText("Confirm");

    // Assert: Verify the presence of the `bg-emerald-600` Tailwind class.
    expect(confirmButton).toHaveClass("bg-emerald-600");
  });

  /**
   * Test case to verify that the info variant applies sky styling.
   */
  it("applies the info variant classes", () => {
    // Arrange: Render with the `buttonVariant` set to `info`.
    render(<AnnotationModalFooter {...defaultProps} buttonVariant="info" />);

    // Act: Access the confirm button.
    const confirmButton = screen.getByText("Confirm");

    // Assert: Verify the presence of the `bg-sky-600` Tailwind class.
    expect(confirmButton).toHaveClass("bg-sky-600");
  });

  /**
   * Test case to verify that supplemental React nodes are rendered within the footer.
   */
  it("renders children content if provided", () => {
    // Arrange: Render the footer containing an additional custom element.
    render(
      <AnnotationModalFooter {...defaultProps}>
        <div data-testid="custom-content">Extra Content</div>
      </AnnotationModalFooter>
    );

    // Assert: Verify that the `children` content is successfully injected into the layout.
    expect(screen.getByTestId("custom-content")).toBeInTheDocument();
  });
});
