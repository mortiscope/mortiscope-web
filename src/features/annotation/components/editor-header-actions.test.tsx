import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { render } from "@/__tests__/setup/test-utils";
import { EditorHeaderActions } from "@/features/annotation/components/editor-header-actions";
import { STATUS_CONFIG } from "@/lib/constants";

/**
 * Test suite for the `EditorHeaderActions` component.
 */
describe("EditorHeaderActions", () => {
  const defaultProps = {
    verificationStatus: "unverified" as const,
    onVerificationClick: vi.fn(),
    isLocked: false,
    onToggleLock: vi.fn(),
    hasChanges: false,
    isSaving: false,
    onSaveClick: vi.fn(),
  };

  /**
   * Test case to verify that all primary control buttons are rendered with accessible labels.
   */
  it("renders all action buttons correctly", () => {
    // Arrange: Render the header actions with default settings.
    render(<EditorHeaderActions {...defaultProps} />);

    // Assert: Verify visibility of verification status, lock, and save buttons.
    expect(screen.getByLabelText(STATUS_CONFIG.unverified.label)).toBeInTheDocument();
    expect(screen.getByLabelText("Lock editor")).toBeInTheDocument();
    expect(screen.getByLabelText("Save")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the verification button triggers the callback with the correct status.
   */
  it("calls onVerificationClick with current status when clicked", () => {
    // Arrange: Render the component.
    render(<EditorHeaderActions {...defaultProps} />);

    // Act: Click the button associated with the current verification status.
    const button = screen.getByLabelText(STATUS_CONFIG.unverified.label);
    fireEvent.click(button);

    // Assert: Ensure the callback receives the `unverified` status string.
    expect(defaultProps.onVerificationClick).toHaveBeenCalledWith("unverified");
  });

  /**
   * Test case to verify that the UI correctly reflects the verified status.
   */
  it("renders correct icon/label for verified status", () => {
    // Arrange: Render with `verificationStatus` set to verified.
    render(<EditorHeaderActions {...defaultProps} verificationStatus="verified" />);

    // Assert: Check for the corresponding label defined in `STATUS_CONFIG`.
    expect(screen.getByLabelText(STATUS_CONFIG.verified.label)).toBeInTheDocument();
  });

  /**
   * Test case to verify that the UI correctly reflects the in-progress status.
   */
  it("renders correct icon/label for in_progress status", () => {
    // Arrange: Render with `verificationStatus` set to in_progress.
    render(<EditorHeaderActions {...defaultProps} verificationStatus="in_progress" />);

    // Assert: Check for the corresponding label defined in `STATUS_CONFIG`.
    expect(screen.getByLabelText(STATUS_CONFIG.in_progress.label)).toBeInTheDocument();
  });

  /**
   * Test case to verify that the UI correctly reflects the status when no detections are present.
   */
  it("renders correct icon/label for no_detections status", () => {
    // Arrange: Render with `verificationStatus` set to no_detections.
    render(<EditorHeaderActions {...defaultProps} verificationStatus="no_detections" />);

    // Assert: Check for the corresponding label defined in `STATUS_CONFIG`.
    expect(screen.getByLabelText(STATUS_CONFIG.no_detections.label)).toBeInTheDocument();
  });

  /**
   * Test case to verify the lock button label updates when the editor is in a locked state.
   */
  it("displays unlock icon and label when isLocked is true", () => {
    // Arrange: Set `isLocked` prop to true.
    render(<EditorHeaderActions {...defaultProps} isLocked={true} />);

    // Assert: Verify the button label has changed to indicate an unlock action.
    const button = screen.getByLabelText("Unlock editor");
    expect(button).toBeInTheDocument();
  });

  /**
   * Test case to verify the lock button label updates when the editor is in an unlocked state.
   */
  it("displays lock icon and label when isLocked is false", () => {
    // Arrange: Set `isLocked` prop to false.
    render(<EditorHeaderActions {...defaultProps} isLocked={false} />);

    // Assert: Verify the button label indicates a lock action.
    const button = screen.getByLabelText("Lock editor");
    expect(button).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the lock button triggers the toggle callback.
   */
  it("calls onToggleLock when lock button is clicked", () => {
    // Arrange: Render the component.
    render(<EditorHeaderActions {...defaultProps} />);

    // Act: Click the lock control.
    fireEvent.click(screen.getByLabelText("Lock editor"));

    // Assert: Ensure the `onToggleLock` function is called exactly once.
    expect(defaultProps.onToggleLock).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to ensure the save button is unusable when there are no unsaved modifications.
   */
  it("disables save button when hasChanges is false", () => {
    // Arrange: Set `hasChanges` prop to false.
    render(<EditorHeaderActions {...defaultProps} hasChanges={false} />);

    // Assert: Verify the button is disabled and reflects the appropriate cursor style.
    const saveButton = screen.getByLabelText("Save");
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveClass("cursor-not-allowed");
  });

  /**
   * Test case to ensure the save button is active when modifications exist and no save operation is in progress.
   */
  it("enables save button when hasChanges is true and not saving", () => {
    // Arrange: Set `hasChanges` to true and `isSaving` to false.
    render(<EditorHeaderActions {...defaultProps} hasChanges={true} isSaving={false} />);

    // Assert: Verify the button is enabled and has the correct interactive cursor.
    const saveButton = screen.getByLabelText("Save");
    expect(saveButton).toBeEnabled();
    expect(saveButton).not.toHaveClass("cursor-not-allowed");
  });

  /**
   * Test case to verify that clicking the save button triggers the save callback.
   */
  it("calls onSaveClick when save button is clicked", () => {
    // Arrange: Set `hasChanges` to true to enable the button.
    render(<EditorHeaderActions {...defaultProps} hasChanges={true} />);

    // Act: Click the save button.
    fireEvent.click(screen.getByLabelText("Save"));

    // Assert: Ensure the `onSaveClick` function is called.
    expect(defaultProps.onSaveClick).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to ensure the save button is disabled and non-functional during an active save operation.
   */
  it("disables save button and shows loading state when isSaving is true", () => {
    // Arrange: Set both `hasChanges` and `isSaving` to true.
    render(<EditorHeaderActions {...defaultProps} hasChanges={true} isSaving={true} />);

    // Act: Locate the button and attempt a click.
    const saveButton = screen.getByLabelText("Save");
    expect(saveButton).toBeDisabled();

    // Assert: Verify the parent container reflects the non-interactive state.
    expect(saveButton.parentElement).toHaveClass("cursor-not-allowed");

    // Act: Fire a click event.
    fireEvent.click(saveButton);

    // Assert: Ensure the save callback was not triggered during the pending state.
    expect(defaultProps.onSaveClick).not.toHaveBeenCalled();
  });
});
