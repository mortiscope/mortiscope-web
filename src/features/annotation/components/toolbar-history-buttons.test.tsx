import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { render } from "@/__tests__/setup/test-utils";
import { ToolbarHistoryButtons } from "@/features/annotation/components/toolbar-history-buttons";

/**
 * Test suite for the `ToolbarHistoryButtons` component.
 */
describe("ToolbarHistoryButtons", () => {
  // Define default properties including mock handlers for history actions.
  const defaultProps = {
    canUndo: true,
    canRedo: true,
    hasChanges: true,
    isLocked: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onResetChanges: vi.fn(),
  };

  /**
   * Test case to verify that all history-related action buttons are rendered with correct accessibility labels.
   */
  it("renders all history action buttons", () => {
    // Arrange: Render the history buttons component.
    render(<ToolbarHistoryButtons {...defaultProps} />);

    // Assert: Check for the existence of redo, reset, and undo buttons.
    expect(screen.getByLabelText("Redo change")).toBeInTheDocument();
    expect(screen.getByLabelText("Reset changes")).toBeInTheDocument();
    expect(screen.getByLabelText("Undo change")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the redo button executes the provided `onRedo` handler.
   */
  it("calls onRedo when redo button is clicked", () => {
    // Arrange: Render the component.
    render(<ToolbarHistoryButtons {...defaultProps} />);

    // Act: Simulate a click on the redo button.
    fireEvent.click(screen.getByLabelText("Redo change"));

    // Assert: Verify the redo handler was called exactly once.
    expect(defaultProps.onRedo).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that clicking the reset button executes the provided `onResetChanges` handler.
   */
  it("calls onResetChanges when reset button is clicked", () => {
    // Arrange: Render the component.
    render(<ToolbarHistoryButtons {...defaultProps} />);

    // Act: Simulate a click on the reset changes button.
    fireEvent.click(screen.getByLabelText("Reset changes"));

    // Assert: Verify the reset handler was called exactly once.
    expect(defaultProps.onResetChanges).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that clicking the undo button executes the provided `onUndo` handler.
   */
  it("calls onUndo when undo button is clicked", () => {
    // Arrange: Render the component.
    render(<ToolbarHistoryButtons {...defaultProps} />);

    // Act: Simulate a click on the undo button.
    fireEvent.click(screen.getByLabelText("Undo change"));

    // Assert: Verify the undo handler was called exactly once.
    expect(defaultProps.onUndo).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the redo button is disabled when there are no future states in the history stack.
   */
  it("disables redo button when canRedo is false", () => {
    // Arrange: Render with `canRedo` set to false.
    render(<ToolbarHistoryButtons {...defaultProps} canRedo={false} />);

    // Assert: Verify the button is disabled and reflects the correct cursor styling.
    const button = screen.getByLabelText("Redo change");
    expect(button).toBeDisabled();
    expect(button).toHaveClass("cursor-not-allowed");
  });

  /**
   * Test case to verify that the reset button is disabled when no modifications have been made to the image.
   */
  it("disables reset button when hasChanges is false", () => {
    // Arrange: Render with `hasChanges` set to false.
    render(<ToolbarHistoryButtons {...defaultProps} hasChanges={false} />);

    // Assert: Verify the button is disabled and reflects the correct cursor styling.
    const button = screen.getByLabelText("Reset changes");
    expect(button).toBeDisabled();
    expect(button).toHaveClass("cursor-not-allowed");
  });

  /**
   * Test case to verify that the undo button is disabled when there are no previous states in the history stack.
   */
  it("disables undo button when canUndo is false", () => {
    // Arrange: Render with `canUndo` set to false.
    render(<ToolbarHistoryButtons {...defaultProps} canUndo={false} />);

    // Assert: Verify the button is disabled and reflects the correct cursor styling.
    const button = screen.getByLabelText("Undo change");
    expect(button).toBeDisabled();
    expect(button).toHaveClass("cursor-not-allowed");
  });

  /**
   * Test case to verify that all history buttons are disabled when the editor is in a locked state.
   */
  it("disables all buttons when isLocked is true", () => {
    // Arrange: Render with `isLocked` set to true.
    render(<ToolbarHistoryButtons {...defaultProps} isLocked={true} />);

    // Assert: Verify that none of the history actions can be performed.
    expect(screen.getByLabelText("Redo change")).toBeDisabled();
    expect(screen.getByLabelText("Reset changes")).toBeDisabled();
    expect(screen.getByLabelText("Undo change")).toBeDisabled();
  });

  /**
   * Test case to verify visual styling (opacity and cursor) when history actions are available.
   */
  it("applies correct styling for enabled states", () => {
    // Arrange: Render the component with default enabled props.
    render(<ToolbarHistoryButtons {...defaultProps} />);

    // Assert: Check for full opacity and pointer cursor.
    const undoButton = screen.getByLabelText("Undo change");
    expect(undoButton).toHaveClass("cursor-pointer");
    expect(undoButton).toHaveClass("text-white");
    expect(undoButton).not.toHaveClass("text-white/30");
  });

  /**
   * Test case to verify visual styling (reduced opacity and restricted cursor) when actions are unavailable.
   */
  it("applies correct styling for disabled states", () => {
    // Arrange: Render with `canUndo` set to false.
    render(<ToolbarHistoryButtons {...defaultProps} canUndo={false} />);

    // Assert: Check for reduced opacity and not-allowed cursor.
    const undoButton = screen.getByLabelText("Undo change");
    expect(undoButton).toHaveClass("cursor-not-allowed");
    expect(undoButton).toHaveClass("text-white/30");
  });

  /**
   * Test case to verify that interaction handlers are not triggered when buttons are in a disabled state.
   */
  it("does not trigger handlers when buttons are disabled", () => {
    // Arrange: Render with all actions disabled.
    render(
      <ToolbarHistoryButtons {...defaultProps} canUndo={false} canRedo={false} hasChanges={false} />
    );

    // Act: Attempt to click all three buttons.
    fireEvent.click(screen.getByLabelText("Redo change"));
    fireEvent.click(screen.getByLabelText("Reset changes"));
    fireEvent.click(screen.getByLabelText("Undo change"));

    // Assert: Verify that none of the mock handlers were executed.
    expect(defaultProps.onRedo).not.toHaveBeenCalled();
    expect(defaultProps.onResetChanges).not.toHaveBeenCalled();
    expect(defaultProps.onUndo).not.toHaveBeenCalled();
  });
});
