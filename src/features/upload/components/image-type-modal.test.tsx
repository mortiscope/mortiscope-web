import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockUploads } from "@/__tests__/mocks/fixtures/uploads.fixtures";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { ImageTypeModal } from "@/features/upload/components/image-type-modal";

// Mock the framer-motion library to bypass animation logic during tests.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock the Dialog component to simplify the DOM structure for testing.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
    onOpenChange: (v: boolean) => void;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
}));

// Mock the Label component to provide a testable role and data attributes.
vi.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    className,
    htmlFor,
  }: {
    children: React.ReactNode;
    className?: string;
    htmlFor?: string;
  }) => (
    <label data-testid={`label-${htmlFor}`} htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ),
}));

// Mock the RadioGroup component to facilitate simulated value changes.
vi.mock("@/components/ui/radio-group", () => ({
  RadioGroup: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <div data-testid="radio-group" data-value={value}>
      <button data-testid="select-field" onClick={() => onValueChange("field")} type="button">
        Select Field
      </button>
      <button data-testid="select-macro" onClick={() => onValueChange("macro")} type="button">
        Select Macro
      </button>
      {children}
    </div>
  ),
  RadioGroupItem: ({ value, id, disabled }: { value: string; id: string; disabled?: boolean }) => (
    <input type="radio" data-testid={`radio-${value}`} id={id} disabled={disabled} />
  ),
}));

// Mock the modal header to verify title and description props.
vi.mock("@/features/export/components/export-modal-header", () => ({
  ExportModalHeader: ({ title, description }: { title: string; description: React.ReactNode }) => (
    <div data-testid="modal-header">
      <h2 data-testid="modal-title">{title}</h2>
      <div data-testid="modal-description">{description}</div>
    </div>
  ),
}));

// Mock the modal footer to verify button labels and event handlers.
vi.mock("@/features/export/components/export-modal-footer", () => ({
  ExportModalFooter: ({
    isPending,
    onCancel,
    onExport,
    exportButtonText,
    cancelButtonText,
    pendingButtonText,
  }: {
    isPending: boolean;
    onCancel: () => void;
    onExport: () => void;
    exportButtonText: string;
    cancelButtonText: string;
    pendingButtonText: string;
  }) => (
    <div data-testid="modal-footer">
      <button data-testid="cancel-button" onClick={onCancel}>
        {cancelButtonText}
      </button>
      <button data-testid="confirm-button" onClick={onExport} disabled={isPending}>
        {isPending ? pendingButtonText : exportButtonText}
      </button>
    </div>
  ),
}));

// Mock utility functions for styling.
vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Define a standard file object for use across test cases.
const mockFile: UploadableFile = {
  id: mockUploads.firstUpload.id,
  key: mockUploads.firstUpload.key,
  url: mockUploads.firstUpload.url,
  name: mockUploads.firstUpload.name,
  size: mockUploads.firstUpload.size,
  type: mockUploads.firstUpload.type,
  progress: 100,
  status: "success",
  source: "upload",
  dateUploaded: new Date(mockUploads.firstUpload.createdAt),
  version: 1,
  imageType: null,
};

// Define a file object with a pre-set image type.
const mockFileWithField: UploadableFile = { ...mockFile, imageType: "field" };

/**
 * Test suite for the ImageTypeModal component.
 */
describe("ImageTypeModal", () => {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();

  const defaultProps = {
    file: mockFile,
    isOpen: true,
    onOpenChange,
    onConfirm,
  };

  // Reset mocks before each test to maintain clean state.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Revert to real timers after each test to avoid interference.
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Verifies that the component does not output HTML when the open state is false.
   */
  it("renders nothing when the modal is closed", () => {
    // Arrange: Render the component with `isOpen` set to false.
    render(<ImageTypeModal {...defaultProps} isOpen={false} />);

    // Assert: Ensure elements are not present in the document.
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("modal-header")).not.toBeInTheDocument();
  });

  /**
   * Verifies that the modal title and file name are displayed correctly.
   */
  it("renders the modal heading when open", () => {
    // Arrange: Render the component with default props.
    render(<ImageTypeModal {...defaultProps} />);

    // Assert: Verify the presence of the title and the file `name` in the header.
    expect(screen.getByTestId("modal-title")).toHaveTextContent("Specify Image Type");
    expect(screen.getByTestId("modal-description")).toHaveTextContent(mockFile.name);
  });

  /**
   * Verifies the presence of all radio selection options.
   */
  it("renders both Macro and Field options", () => {
    // Arrange: Render the component.
    render(<ImageTypeModal {...defaultProps} />);

    // Assert: Ensure both radio options are visible to the user.
    expect(screen.getByTestId("radio-macro")).toBeInTheDocument();
    expect(screen.getByTestId("radio-field")).toBeInTheDocument();
  });

  /**
   * Verifies that 'macro' is the fallback when no type is provided in the file data.
   */
  it("defaults to 'macro' when the file's imageType is null", () => {
    // Arrange: Provide a file with a `null` value for `imageType`.
    render(<ImageTypeModal {...defaultProps} file={mockFile} />);

    // Assert: Check if the `RadioGroup` container reflects the default value.
    expect(screen.getByTestId("radio-group")).toHaveAttribute("data-value", "macro");
  });

  /**
   * Verifies that the modal initializes with the existing file property.
   */
  it("defaults to the file's existing imageType when set to 'field'", () => {
    // Arrange: Provide a file with `imageType` already set to `field`.
    render(<ImageTypeModal {...defaultProps} file={mockFileWithField} />);

    // Assert: Check if the `RadioGroup` reflects the existing file state.
    expect(screen.getByTestId("radio-group")).toHaveAttribute("data-value", "field");
  });

  /**
   * Verifies that user interaction updates the local state of the radio group.
   */
  it("updates the selected type when a user selects 'field'", async () => {
    // Arrange: Initialize user events and render component.
    const user = userEvent.setup();
    render(<ImageTypeModal {...defaultProps} />);

    // Act: Click the button that triggers the value change to `field`.
    await user.click(screen.getByTestId("select-field"));

    // Assert: Confirm the internal state change reflected in the attribute.
    expect(screen.getByTestId("radio-group")).toHaveAttribute("data-value", "field");
  });

  /**
   * Verifies that the confirmation callback is triggered with correct arguments.
   */
  it("calls onConfirm with the file id and selected type on confirm", async () => {
    // Arrange: Initialize user events and render component.
    const user = userEvent.setup();
    render(<ImageTypeModal {...defaultProps} />);

    // Act: Click the confirmation button.
    await user.click(screen.getByTestId("confirm-button"));

    // Assert: Ensure `onConfirm` and `onOpenChange` are called with expected parameters.
    expect(onConfirm).toHaveBeenCalledWith(mockFile.id, "macro");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Verifies that the cancel button closes the modal without saving.
   */
  it("calls onOpenChange(false) and does not call onConfirm when cancelled", async () => {
    // Arrange: Initialize user events and render component.
    const user = userEvent.setup();
    render(<ImageTypeModal {...defaultProps} />);

    // Act: Click the cancellation button.
    await user.click(screen.getByTestId("cancel-button"));

    // Assert: Ensure the modal signals a close event without triggering a save.
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  /**
   * Verifies that modified selections are correctly passed to the confirmation callback.
   */
  it("passes the newly selected type to onConfirm", async () => {
    // Arrange: Initialize user events and render component.
    const user = userEvent.setup();
    render(<ImageTypeModal {...defaultProps} />);

    // Act: Change the selection to `field` and then confirm.
    await user.click(screen.getByTestId("select-field"));
    await user.click(screen.getByTestId("confirm-button"));

    // Assert: Verify that the updated value `field` is sent to the parent.
    expect(onConfirm).toHaveBeenCalledWith(mockFile.id, "field");
  });

  /**
   * Verifies that the component handles missing file data gracefully.
   */
  it("does not call onConfirm if file is null", async () => {
    // Arrange: Pass a `null` value for the `file` prop.
    const user = userEvent.setup();
    render(<ImageTypeModal {...defaultProps} file={null} />);

    // Act: Attempt to click the confirmation button.
    await user.click(screen.getByTestId("confirm-button"));

    // Assert: Ensure no callbacks are triggered when there is no target file.
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  /**
   * Verifies that duplicate submissions are blocked while an operation is in progress.
   */
  it("does not call onConfirm while a confirmation is pending", async () => {
    // Arrange: Set the `isPending` prop to true.
    const user = userEvent.setup();
    render(<ImageTypeModal {...defaultProps} isPending={true} />);

    // Act: Attempt to click the confirmation button.
    await user.click(screen.getByTestId("confirm-button"));

    // Assert: Ensure callbacks are not executed during the pending state.
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  /**
   * Verifies that user input is disabled during asynchronous operations.
   */
  it("disables all radio inputs when isPending is true", () => {
    // Arrange: Render the component in a `isPending` state.
    render(<ImageTypeModal {...defaultProps} isPending={true} />);

    // Assert: Check if the radio inputs have the `disabled` attribute.
    expect(screen.getByTestId("radio-macro")).toBeDisabled();
    expect(screen.getByTestId("radio-field")).toBeDisabled();
  });

  /**
   * Verifies that the UI provides visual feedback during saving.
   */
  it("shows the pending button text when isPending is true", () => {
    // Arrange: Render the component in a `isPending` state.
    render(<ImageTypeModal {...defaultProps} isPending={true} />);

    // Assert: Verify that the confirm button displays the loading text.
    expect(screen.getByTestId("confirm-button")).toHaveTextContent("Saving...");
  });

  /**
   * Verifies that the component updates its internal state when props change.
   */
  it("syncs selected type to the new file's imageType when modal reopens", () => {
    // Arrange: Initially render as closed.
    const { rerender } = render(<ImageTypeModal {...defaultProps} isOpen={false} />);

    // Act: Re-render with a different file and the modal set to open.
    rerender(<ImageTypeModal {...defaultProps} file={mockFileWithField} isOpen={true} />);

    // Assert: Ensure the internal state has synchronized with the new `imageType`.
    expect(screen.getByTestId("radio-group")).toHaveAttribute("data-value", "field");
  });

  /**
   * Verifies that the internal state resets to the file's original value after dismissal.
   */
  it("resets selected type to the file's imageType after the modal close animation", () => {
    // Arrange: Enable fake timers to control animation delays.
    vi.useFakeTimers();
    render(<ImageTypeModal {...defaultProps} file={mockFileWithField} />);

    // Act: Change the selection locally and then cancel.
    fireEvent.click(screen.getByTestId("select-macro"));
    expect(screen.getByTestId("radio-group")).toHaveAttribute("data-value", "macro");
    fireEvent.click(screen.getByTestId("cancel-button"));

    // Act: Progress time to simulate completion of the close animation.
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Assert: Verify that the selection has reverted to the original `field` value.
    expect(screen.getByTestId("radio-group")).toHaveAttribute("data-value", "field");
  });
});
