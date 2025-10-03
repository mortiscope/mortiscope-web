import { fireEvent, render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { VerifiedStatusModal } from "@/features/annotation/components/verified-status-modal";

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

// Mock the header sub-component to verify the injection of verified status titles and descriptions.
vi.mock("@/features/annotation/components/annotation-modal-header", () => ({
  AnnotationModalHeader: ({ title, description }: { title: string; description: ReactNode }) => (
    <div data-testid="modal-header">
      <h1>{title}</h1>
      <div>{description}</div>
    </div>
  ),
}));

// Mock the footer sub-component to verify the rendering and behavior of the confirmation action.
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
 * Test suite for the `VerifiedStatusModal` component.
 */
describe("VerifiedStatusModal", () => {
  // Define a mock function to track modal visibility state changes.
  const mockOnOpenChange = vi.fn();

  // Define default properties for the verified status modal tests.
  const defaultProps = {
    isOpen: true,
    onOpenChange: mockOnOpenChange,
  };

  /**
   * Test case to verify that the modal and its specific verification content render correctly when open.
   */
  it("renders correctly when open", () => {
    // Arrange: Render the modal in the open state.
    render(<VerifiedStatusModal {...defaultProps} />);

    // Assert: Verify that the container, header title, and status descriptions are present.
    expect(screen.getByTestId("modal-container")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText(/This status indicates that all detections/i)).toBeInTheDocument();
    expect(screen.getByText("Fully Reviewed:")).toBeInTheDocument();
    expect(screen.getByText("Complete:")).toBeInTheDocument();
    expect(screen.getByText("Still Editable:")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component suppresses rendering when the `isOpen` prop is false.
   */
  it("does not render when closed", () => {
    // Arrange: Render the modal in the closed state.
    render(<VerifiedStatusModal {...defaultProps} isOpen={false} />);

    // Assert: Verify that the modal container is absent from the document.
    expect(screen.queryByTestId("modal-container")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the confirmation button triggers the `onOpenChange` callback to close the modal.
   */
  it("closes modal when confirmation button is clicked", () => {
    // Arrange: Render the modal.
    render(<VerifiedStatusModal {...defaultProps} />);

    // Act: Click the 'Understood' button within the mocked footer.
    const confirmButton = screen.getByText("Understood");
    fireEvent.click(confirmButton);

    // Assert: Verify that the close callback was executed with a false value.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that clicking the backdrop triggers the `onOpenChange` callback to close the modal.
   */
  it("closes modal when container background is clicked (simulating outside click)", () => {
    // Arrange: Render the modal.
    render(<VerifiedStatusModal {...defaultProps} />);

    // Act: Simulate a click on the outer container backdrop.
    const container = screen.getByTestId("modal-container");
    fireEvent.click(container);

    // Assert: Verify that the close callback was executed with a false value.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
