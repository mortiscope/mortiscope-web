import { fireEvent, render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { UnsavedChangesModal } from "@/features/annotation/components/unsaved-changes-modal";

// Mock the core modal container to verify conditional rendering and backdrop interaction logic.
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

// Mock the header sub-component to verify the injection of the warning title and description.
vi.mock("@/features/annotation/components/annotation-modal-header", () => ({
  AnnotationModalHeader: ({ title, description }: { title: string; description: ReactNode }) => (
    <div data-testid="modal-header">
      <h1>{title}</h1>
      <div>{description}</div>
    </div>
  ),
}));

// Mock the footer sub-component to verify button actions, labels, and loading states.
vi.mock("@/features/annotation/components/annotation-modal-footer", () => ({
  AnnotationModalFooter: ({
    onConfirm,
    onCancel,
    confirmText,
    cancelText,
    isPending,
  }: {
    onConfirm: () => void;
    onCancel: () => void;
    confirmText: string;
    cancelText: string;
    isPending: boolean;
  }) => (
    <div data-testid="modal-footer">
      <button onClick={onCancel} disabled={isPending}>
        {cancelText}
      </button>
      <button onClick={onConfirm} disabled={isPending}>
        {confirmText}
      </button>
    </div>
  ),
}));

// Mock the radio group components to verify the selection logic between leaving and saving.
vi.mock("@/components/ui/radio-group", () => ({
  RadioGroup: ({
    children,
    onValueChange,
    value,
  }: {
    children: ReactNode;
    onValueChange: (val: string) => void;
    value: string;
  }) => (
    <div role="radiogroup">
      <input type="hidden" data-testid="radio-group-value" value={value} />
      <button data-testid="radio-select-leave" onClick={() => onValueChange("leave")}>
        Select Leave
      </button>
      <button data-testid="radio-select-save" onClick={() => onValueChange("save-and-leave")}>
        Select Save
      </button>
      {children}
    </div>
  ),
  RadioGroupItem: ({ value }: { value: string }) => <div data-testid={`radio-item-${value}`} />,
}));

// Mock the UI label component.
vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children: ReactNode }) => <label>{children}</label>,
}));

/**
 * Test suite for the `UnsavedChangesModal` component.
 */
describe("UnsavedChangesModal", () => {
  // Define interaction spies and default properties for the modal.
  const mockOnOpenChange = vi.fn();
  const mockOnProceed = vi.fn();

  const defaultProps = {
    isOpen: true,
    onOpenChange: mockOnOpenChange,
    onProceed: mockOnProceed,
    isPending: false,
  };

  /**
   * Test case to verify that the modal structure and textual warnings render correctly when the `isOpen` prop is true.
   */
  it("renders correctly when open", () => {
    // Arrange: Render the modal in the open state.
    render(<UnsavedChangesModal {...defaultProps} />);

    // Assert: Verify all critical UI text and containers are present.
    expect(screen.getByTestId("modal-container")).toBeInTheDocument();
    expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();
    expect(screen.getByText(/You have unsaved changes/)).toBeInTheDocument();
    expect(screen.getByText("Leave Without Saving")).toBeInTheDocument();
    expect(screen.getByText("Save and Leave")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component suppresses all rendering when the `isOpen` prop is false.
   */
  it("does not render when closed", () => {
    // Arrange: Render the modal in the closed state.
    render(<UnsavedChangesModal {...defaultProps} isOpen={false} />);

    // Assert: Verify that the modal container is absent from the document.
    expect(screen.queryByTestId("modal-container")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the component defaults the radio selection to the 'leave' option for immediate exit.
   */
  it("defaults to 'leave' option initially", () => {
    // Arrange: Render the modal.
    render(<UnsavedChangesModal {...defaultProps} />);

    // Assert: Check the underlying value of the mocked radio group.
    const radioGroupValue = screen.getByTestId("radio-group-value") as HTMLInputElement;
    expect(radioGroupValue.value).toBe("leave");
  });

  /**
   * Test case to verify that proceeding without changing options triggers the callback with the 'leave' flag.
   */
  it("calls onProceed with 'leave' when proceeding with default selection", () => {
    // Arrange: Render the modal.
    render(<UnsavedChangesModal {...defaultProps} />);

    // Act: Click the proceed action button.
    const proceedButton = screen.getByText("Proceed");
    fireEvent.click(proceedButton);

    // Assert: Verify the handler received the default 'leave' value.
    expect(mockOnProceed).toHaveBeenCalledWith("leave");
  });

  /**
   * Test case to verify that changing the selection and proceeding triggers the callback with the 'save-and-leave' flag.
   */
  it("calls onProceed with 'save-and-leave' when option is changed", () => {
    // Arrange: Render the modal.
    render(<UnsavedChangesModal {...defaultProps} />);

    // Act: Simulate selecting the 'save-and-leave' radio item and then proceeding.
    const selectSaveButton = screen.getByTestId("radio-select-save");
    fireEvent.click(selectSaveButton);

    const proceedButton = screen.getByText("Proceed");
    fireEvent.click(proceedButton);

    // Assert: Verify the handler received the updated value.
    expect(mockOnProceed).toHaveBeenCalledWith("save-and-leave");
  });

  /**
   * Test case to verify that clicking the cancel button triggers the `onOpenChange` callback to close the modal.
   */
  it("calls onOpenChange with false when cancelled", () => {
    // Arrange: Render the modal.
    render(<UnsavedChangesModal {...defaultProps} />);

    // Act: Click the cancel action button.
    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    // Assert: Verify the close callback was executed with a false value.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the UI is locked and backdrop dismissal is disabled during an active pending state (e.g., saving).
   */
  it("disables controls and prevents closing when pending", () => {
    // Arrange: Render the modal in a pending state.
    render(<UnsavedChangesModal {...defaultProps} isPending={true} />);

    const cancelButton = screen.getByText("Cancel") as HTMLButtonElement;
    const proceedButton = screen.getByText("Proceed") as HTMLButtonElement;

    // Assert: Verify that action buttons are non-interactive.
    expect(cancelButton).toBeDisabled();
    expect(proceedButton).toBeDisabled();

    // Act: Simulate a click on the container backdrop.
    const container = screen.getByTestId("modal-container");
    fireEvent.click(container);

    // Assert: Verify the close callback was suppressed due to the pending state.
    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });
});
