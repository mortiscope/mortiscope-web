import { fireEvent, render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { UnverifiedStatusModal } from "@/features/annotation/components/unverified-status-modal";

// Mock the core modal container to verify conditional rendering and backdrop click logic.
vi.mock("@/features/annotation/components/annotation-modal-container", () => ({
  AnnotationModalContainer: ({
    children,
    isOpen,
    onOpenChange,
  }: {
    children: ReactNode;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    isOpen ? (
      <div data-testid="modal-container" onClick={() => onOpenChange(false)}>
        {children}
      </div>
    ) : null,
}));

// Mock the header sub-component to verify the injection of unverified status metadata and titles.
vi.mock("@/features/annotation/components/annotation-modal-header", () => ({
  AnnotationModalHeader: ({ title, description }: { title: string; description: ReactNode }) => (
    <div data-testid="modal-header">
      <h1>{title}</h1>
      <div>{description}</div>
    </div>
  ),
}));

// Mock the footer sub-component to verify the rendering and behavior of action buttons.
vi.mock("@/features/annotation/components/annotation-modal-footer", () => ({
  AnnotationModalFooter: ({
    onConfirm,
    confirmText,
  }: {
    onConfirm: () => void;
    confirmText: string;
  }) => (
    <div data-testid="modal-footer">
      <button onClick={onConfirm}>{confirmText}</button>
    </div>
  ),
}));

/**
 * Test suite for the `UnverifiedStatusModal` component.
 */
describe("UnverifiedStatusModal", () => {
  // Define a mock function to track modal visibility state changes.
  const mockOnOpenChange = vi.fn();

  // Define default properties for the unverified status modal tests.
  const defaultProps = {
    isOpen: true,
    onOpenChange: mockOnOpenChange,
  };

  /**
   * Test case to verify that the modal structure and informational text render correctly when the `isOpen` prop is true.
   */
  it("renders correctly when open", () => {
    // Arrange: Render the modal in the open state.
    render(<UnverifiedStatusModal {...defaultProps} />);

    // Assert: Verify that the container, status title, and descriptive list items are present.
    expect(screen.getByTestId("modal-container")).toBeInTheDocument();
    expect(screen.getByText("Unverified")).toBeInTheDocument();
    expect(
      screen.getByText(/This status indicates that none of the detections/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Not Yet Reviewed:")).toBeInTheDocument();
    expect(screen.getByText("Needs Verification:")).toBeInTheDocument();
    expect(screen.getByText("Action Required:")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component suppresses all rendering when the `isOpen` prop is false.
   */
  it("does not render when closed", () => {
    // Arrange: Render the modal in the closed state.
    render(<UnverifiedStatusModal {...defaultProps} isOpen={false} />);

    // Assert: Verify that the modal container is absent from the document.
    expect(screen.queryByTestId("modal-container")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the confirmation button triggers the `onOpenChange` callback to close the modal.
   */
  it("closes modal when confirmation button is clicked", () => {
    // Arrange: Render the modal.
    render(<UnverifiedStatusModal {...defaultProps} />);

    // Act: Click the 'Understood' confirmation button.
    const confirmButton = screen.getByText("Understood");
    fireEvent.click(confirmButton);

    // Assert: Verify that the close callback was executed with a false value.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that clicking the backdrop triggers the `onOpenChange` callback to close the modal.
   */
  it("closes modal when container background is clicked", () => {
    // Arrange: Render the modal.
    render(<UnverifiedStatusModal {...defaultProps} />);

    // Act: Simulate a click on the mocked modal container backdrop.
    const container = screen.getByTestId("modal-container");
    fireEvent.click(container);

    // Assert: Verify that the close callback was executed with a false value.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
