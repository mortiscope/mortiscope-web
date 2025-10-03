import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResetChangesModal } from "@/features/annotation/components/reset-changes-modal";

// Mock the core modal container to verify property forwarding and external close triggers.
vi.mock("@/features/annotation/components/annotation-modal-container", () => ({
  AnnotationModalContainer: ({
    children,
    isOpen,
    onOpenChange,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
  }) => (
    <div data-testid="modal-container" data-open={isOpen}>
      <button onClick={() => onOpenChange(false)}>Close Modal</button>
      {children}
    </div>
  ),
}));

// Mock the header sub-component to verify the rendering of the reset warning and title.
vi.mock("@/features/annotation/components/annotation-modal-header", () => ({
  AnnotationModalHeader: ({
    title,
    description,
  }: {
    title: string;
    description: React.ReactNode;
  }) => (
    <div data-testid="modal-header">
      <h2>{title}</h2>
      <div>{description}</div>
    </div>
  ),
}));

// Mock the footer sub-component to isolate testing of the confirm and cancel action handlers.
vi.mock("@/features/annotation/components/annotation-modal-footer", () => ({
  AnnotationModalFooter: ({
    onCancel,
    onConfirm,
    confirmText,
  }: {
    onCancel: () => void;
    onConfirm: () => void;
    confirmText: string;
  }) => (
    <div data-testid="modal-footer">
      <button onClick={onCancel}>Cancel</button>
      <button onClick={onConfirm}>{confirmText}</button>
    </div>
  ),
}));

// Setup a spy for the store action and mock the annotation store hook.
const mockResetDetections = vi.fn();
vi.mock("@/features/annotation/store/annotation-store", () => ({
  useAnnotationStore: vi.fn((selector) => {
    if (typeof selector === "function") {
      return selector({ resetDetections: mockResetDetections });
    }
    return { resetDetections: mockResetDetections };
  }),
}));

/**
 * Test suite for the `ResetChangesModal` component.
 */
describe("ResetChangesModal", () => {
  // Define mock state change function and default props for the modal.
  const mockOnOpenChange = vi.fn();
  const defaultProps = {
    imageName: "mortiscope-image-1.jpg",
    isOpen: true,
    onOpenChange: mockOnOpenChange,
  };

  // Clear all interaction spies before each test to ensure isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the modal displays the target image name and appropriate warning text.
   */
  it("renders with correct title and image name when open", () => {
    // Arrange: Render the modal with a specified `imageName`.
    render(<ResetChangesModal {...defaultProps} />);

    // Assert: Check for the presence of the static title and the dynamic image name.
    expect(screen.getByText("Reset Changes")).toBeInTheDocument();
    expect(screen.getByText(defaultProps.imageName, { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Warning:", { exact: false })).toBeInTheDocument();
  });

  /**
   * Test case to verify that the reset action is triggered and the modal closes upon confirmation.
   */
  it("calls resetDetections and closes modal on confirm", () => {
    // Arrange: Render the modal.
    render(<ResetChangesModal {...defaultProps} />);

    // Act: Simulate clicking the confirmation button.
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    // Assert: Verify the `resetDetections` action was called and the modal was requested to close.
    expect(mockResetDetections).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that clicking cancel closes the modal without altering the annotation state.
   */
  it("closes modal on cancel click", () => {
    // Arrange: Render the modal.
    render(<ResetChangesModal {...defaultProps} />);

    // Act: Simulate clicking the cancel button.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Assert: Verify the `resetDetections` was not called and the modal requested closure.
    expect(mockResetDetections).not.toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that external close requests from the container are handled by the provided callback.
   */
  it("uses the onOpenChange prop when container requests close", () => {
    // Arrange: Render the modal.
    render(<ResetChangesModal {...defaultProps} />);

    // Act: Simulate a close request from the mocked container (e.g., backdrop click).
    fireEvent.click(screen.getByRole("button", { name: "Close Modal" }));

    // Assert: Verify the `onOpenChange` callback was executed with the correct value.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
