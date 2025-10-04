import { fireEvent, render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { VerifyAllDetectionsModal } from "@/features/annotation/components/verify-all-detections-modal";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";

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

// Mock the header sub-component to verify the injection of the confirmation title and image metadata.
vi.mock("@/features/annotation/components/annotation-modal-header", () => ({
  AnnotationModalHeader: ({ title, description }: { title: string; description: ReactNode }) => (
    <div data-testid="modal-header">
      <h1>{title}</h1>
      <div>{description}</div>
    </div>
  ),
}));

// Mock the footer sub-component to isolate testing of the verify and cancel action handlers.
vi.mock("@/features/annotation/components/annotation-modal-footer", () => ({
  AnnotationModalFooter: ({
    onConfirm,
    onCancel,
    confirmText,
    cancelText,
  }: {
    onConfirm: () => void;
    onCancel: () => void;
    confirmText: string;
    cancelText: string;
  }) => (
    <div data-testid="modal-footer">
      <button onClick={onCancel}>{cancelText}</button>
      <button onClick={onConfirm}>{confirmText}</button>
    </div>
  ),
}));

// Mock the global annotation store to control the verification action in tests.
vi.mock("@/features/annotation/store/annotation-store", () => ({
  useAnnotationStore: vi.fn(),
}));

/**
 * Test suite for the `VerifyAllDetectionsModal` component.
 */
describe("VerifyAllDetectionsModal", () => {
  // Define interaction spies and default properties for the verification modal.
  const mockVerifyAllDetections = vi.fn();
  const mockOnOpenChange = vi.fn();
  const defaultProps = {
    imageName: "image.jpg",
    isOpen: true,
    onOpenChange: mockOnOpenChange,
  };

  // Reset all mocks and initialize the store selector return value before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    (useAnnotationStore as unknown as Mock).mockImplementation(
      (selector: (state: unknown) => unknown) =>
        selector({
          verifyAllDetections: mockVerifyAllDetections,
        })
    );
  });

  /**
   * Test case to verify that the modal and its specific verification content render correctly when open.
   */
  it("renders correctly when open", () => {
    // Arrange: Render the modal in the open state.
    render(<VerifyAllDetectionsModal {...defaultProps} />);

    // Assert: Verify that the container, header title, filename, and warning note are present.
    expect(screen.getByTestId("modal-container")).toBeInTheDocument();
    expect(screen.getByText("Verify All Detections")).toBeInTheDocument();
    expect(screen.getByText("image.jpg")).toBeInTheDocument();
    expect(screen.getByText("Note:")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component suppresses all rendering when the `isOpen` prop is false.
   */
  it("does not render when closed", () => {
    // Arrange: Render the modal in the closed state.
    render(<VerifyAllDetectionsModal {...defaultProps} isOpen={false} />);

    // Assert: Verify that the modal container is absent from the document.
    expect(screen.queryByTestId("modal-container")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the bulk verification action is triggered and the modal closes upon confirmation.
   */
  it("calls verifyAllDetections and closes modal on confirm", () => {
    // Arrange: Render the modal.
    render(<VerifyAllDetectionsModal {...defaultProps} />);

    // Act: Simulate a user clicking the 'Verify' button.
    const confirmButton = screen.getByText("Verify");
    fireEvent.click(confirmButton);

    // Assert: Verify the `verifyAllDetections` action was executed and the modal requested closure.
    expect(mockVerifyAllDetections).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that clicking cancel closes the modal without altering the annotation state.
   */
  it("closes modal without verifying on cancel", () => {
    // Arrange: Render the modal.
    render(<VerifyAllDetectionsModal {...defaultProps} />);

    // Act: Simulate a user clicking the 'Cancel' button.
    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    // Assert: Verify the verification action was not called and the modal requested closure.
    expect(mockVerifyAllDetections).not.toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the component handles missing image metadata without crashing.
   */
  it("handles null image name gracefully", () => {
    // Arrange: Render the modal with a null `imageName`.
    render(<VerifyAllDetectionsModal {...defaultProps} imageName={null} />);

    // Assert: Verify the modal structure still renders correctly.
    expect(screen.getByTestId("modal-header")).toBeInTheDocument();
  });
});
