import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  SaveConfirmationModal,
  shouldShowSaveConfirmation,
} from "@/features/annotation/components/save-confirmation-modal";
import { HIDE_SAVE_CONFIRMATION } from "@/lib/constants";

// Mock the core modal container to verify open/close logic and state forwarding.
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
      <button onClick={() => onOpenChange(false)}>Close Container</button>
      <button onClick={() => onOpenChange(true)}>Open Container</button>
      {children}
    </div>
  ),
}));

// Mock the header sub-component to verify the rendering of the save title and metadata.
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

// Mock the footer sub-component to isolate testing of confirm and cancel actions.
vi.mock("@/features/annotation/components/annotation-modal-footer", () => ({
  AnnotationModalFooter: ({
    onConfirm,
    onCancel,
    confirmText,
  }: {
    onConfirm: () => void;
    onCancel: () => void;
    confirmText: string;
  }) => (
    <div data-testid="modal-footer">
      <button onClick={onCancel}>Cancel</button>
      <button onClick={onConfirm}>{confirmText}</button>
    </div>
  ),
}));

/**
 * Test suite for the `SaveConfirmationModal` component.
 */
describe("SaveConfirmationModal", () => {
  // Define interaction spies and default properties for the modal.
  const mockOnOpenChange = vi.fn();
  const mockOnConfirm = vi.fn();
  const defaultProps = {
    imageName: "mortiscope-image-to-save.jpg",
    isOpen: true,
    onOpenChange: mockOnOpenChange,
    onConfirm: mockOnConfirm,
  };

  // Reset mocks and clear persistent storage before each test for isolation.
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  /**
   * Test case to verify that the modal renders the correct metadata, checkbox, and header text.
   */
  it("renders with correct title, image name, and info message", () => {
    // Arrange: Render the save confirmation modal.
    render(<SaveConfirmationModal {...defaultProps} />);

    // Assert: Check for title, filename, and the user preference checkbox.
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
    expect(screen.getByText(defaultProps.imageName, { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Note:", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Do not show this message again")).toBeInTheDocument();
  });

  /**
   * Test case to verify that confirming without checking the preference box does not update storage.
   */
  it("calls onConfirm and closes modal when Save button is clicked (no checkbox)", () => {
    // Arrange: Render the modal.
    render(<SaveConfirmationModal {...defaultProps} />);

    // Act: Click the save button.
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // Assert: Verify handlers are called but `localStorage` remains empty.
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(localStorage.getItem(HIDE_SAVE_CONFIRMATION)).toBeNull();
  });

  /**
   * Test case to verify that checking the preference box updates `localStorage` upon confirmation.
   */
  it("stores preference, calls onConfirm, and closes modal when checkbox is checked", () => {
    // Arrange: Render the modal.
    render(<SaveConfirmationModal {...defaultProps} />);
    const checkbox = screen.getByRole("checkbox", { name: "Do not show this message again" });

    // Act: Check the preference box and confirm the save.
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // Assert: Verify the preference is persisted and handlers are executed.
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(localStorage.getItem(HIDE_SAVE_CONFIRMATION)).toBe("true");
  });

  /**
   * Test case to verify that the internal checkbox state is cleared when the modal is closed and reopened.
   */
  it("resets doNotShowAgain state when modal closes externally", () => {
    // Arrange: Render and check the preference box.
    const { rerender } = render(<SaveConfirmationModal {...defaultProps} />);
    const checkbox = screen.getByRole("checkbox", { name: "Do not show this message again" });
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Act: Simulate external closure and reopening.
    fireEvent.click(screen.getByRole("button", { name: "Close Container" }));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    rerender(<SaveConfirmationModal {...defaultProps} isOpen={false} />);
    rerender(<SaveConfirmationModal {...defaultProps} isOpen={true} />);

    // Assert: Verify the checkbox is no longer checked on the fresh render.
    expect(
      screen.getByRole("checkbox", { name: "Do not show this message again" })
    ).not.toBeChecked();
  });

  /**
   * Test case to verify that the modal correctly handles requests to remain open.
   */
  it("calls onOpenChange(true) when handleModalClose is triggered with true", () => {
    // Arrange: Render the modal.
    render(<SaveConfirmationModal {...defaultProps} />);

    // Act: Simulate the container triggering an open state.
    fireEvent.click(screen.getByRole("button", { name: "Open Container" }));

    // Assert: Verify the state handler was called with the true value.
    expect(mockOnOpenChange).toHaveBeenCalledWith(true);
  });

  /**
   * Test case to verify that clicking the cancel button closes the modal without saving.
   */
  it("closes modal when Cancel button is clicked", () => {
    // Arrange: Render the modal.
    render(<SaveConfirmationModal {...defaultProps} />);

    // Act: Click the cancel button.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Assert: Verify the modal closure was requested.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});

/**
 * Test suite for the save confirmation logic helper.
 */
describe("shouldShowSaveConfirmation", () => {
  // Clear storage before each logic test.
  beforeEach(() => {
    localStorage.clear();
  });

  /**
   * Test case to verify that confirmation defaults to true when no preference exists.
   */
  it("returns true if no preference is set in localStorage", () => {
    // Assert: Check that the default behavior is to show the modal.
    expect(shouldShowSaveConfirmation()).toBe(true);
  });

  /**
   * Test case to verify server-side safety for the preference helper.
   */
  it("returns true (safe default) when running on server (window is undefined)", () => {
    // Arrange: Simulate a server-side environment where the window object is missing.
    vi.stubGlobal("window", undefined);

    // Assert: Check that it defaults to showing the modal.
    expect(shouldShowSaveConfirmation()).toBe(true);

    // Cleanup: Restore global variables.
    vi.unstubAllGlobals();
  });

  /**
   * Test case to verify that setting the preference correctly suppresses the modal.
   */
  it("returns false if preference is set to 'true'", () => {
    // Arrange: Persist the hide preference.
    localStorage.setItem(HIDE_SAVE_CONFIRMATION, "true");

    // Assert: Verify the logic returns false.
    expect(shouldShowSaveConfirmation()).toBe(false);
  });

  /**
   * Test case to verify that invalid preference values do not suppress the modal.
   */
  it("returns true if preference is set to something other than 'true'", () => {
    // Arrange: Persist an invalid preference value.
    localStorage.setItem(HIDE_SAVE_CONFIRMATION, "false");

    // Assert: Verify the logic defaults to true.
    expect(shouldShowSaveConfirmation()).toBe(true);
  });
});
