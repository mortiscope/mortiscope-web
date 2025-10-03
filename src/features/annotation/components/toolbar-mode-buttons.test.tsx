import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { render } from "@/__tests__/setup/test-utils";
import { ToolbarModeButtons } from "@/features/annotation/components/toolbar-mode-buttons";

/**
 * Test suite for the `ToolbarModeButtons` component.
 */
describe("ToolbarModeButtons", () => {
  // Define default properties and mock handlers for mode switching logic.
  const defaultProps = {
    isPanActive: true,
    isSelectActive: false,
    isDrawActive: false,
    isLocked: false,
    drawMode: false,
    onClearSelection: vi.fn(),
    onSetDrawMode: vi.fn(),
    onSetSelectMode: vi.fn(),
  };

  /**
   * Test case to verify that all primary editor mode buttons are rendered with correct accessibility labels.
   */
  it("renders all mode buttons", () => {
    // Arrange: Render the mode buttons component.
    render(<ToolbarModeButtons {...defaultProps} />);

    // Assert: Check for the presence of Pan, Select, and Draw buttons.
    expect(screen.getByLabelText("Pan")).toBeInTheDocument();
    expect(screen.getByLabelText("Select")).toBeInTheDocument();
    expect(screen.getByLabelText("Draw")).toBeInTheDocument();
  });

  /**
   * Test case to verify that activating Pan mode clears active selections and disables Draw and Select modes.
   */
  it("activates Pan mode correctly", () => {
    // Arrange: Render the component.
    render(<ToolbarModeButtons {...defaultProps} />);

    // Act: Click the Pan mode button.
    fireEvent.click(screen.getByLabelText("Pan"));

    // Assert: Verify that selection is cleared and other modes are explicitly set to false.
    expect(defaultProps.onClearSelection).toHaveBeenCalled();
    expect(defaultProps.onSetDrawMode).toHaveBeenCalledWith(false);
    expect(defaultProps.onSetSelectMode).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that activating Select mode clears active selections and enables the selection state.
   */
  it("activates Select mode correctly", () => {
    // Arrange: Render the component.
    render(<ToolbarModeButtons {...defaultProps} />);

    // Act: Click the Select mode button.
    fireEvent.click(screen.getByLabelText("Select"));

    // Assert: Verify that selection is cleared and select mode is enabled while draw mode is disabled.
    expect(defaultProps.onClearSelection).toHaveBeenCalled();
    expect(defaultProps.onSetDrawMode).toHaveBeenCalledWith(false);
    expect(defaultProps.onSetSelectMode).toHaveBeenCalledWith(true);
  });

  /**
   * Test case to verify that clicking the Draw button when inactive enables draw mode.
   */
  it("activates Draw mode correctly (enabling)", () => {
    // Arrange: Render with draw mode initially disabled.
    render(<ToolbarModeButtons {...defaultProps} drawMode={false} />);

    // Act: Click the Draw mode button.
    fireEvent.click(screen.getByLabelText("Draw"));

    // Assert: Verify that selection is cleared and draw mode is enabled while select mode is disabled.
    expect(defaultProps.onClearSelection).toHaveBeenCalled();
    expect(defaultProps.onSetSelectMode).toHaveBeenCalledWith(false);
    expect(defaultProps.onSetDrawMode).toHaveBeenCalledWith(true);
  });

  /**
   * Test case to verify that clicking the Draw button when already active disables draw mode.
   */
  it("toggles Draw mode correctly (disabling)", () => {
    // Arrange: Render with draw mode already enabled.
    render(<ToolbarModeButtons {...defaultProps} drawMode={true} />);

    // Act: Click the Draw mode button.
    fireEvent.click(screen.getByLabelText("Draw"));

    // Assert: Verify that draw mode is set to false.
    expect(defaultProps.onSetDrawMode).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the Pan button reflects active visual styling when its state is active.
   */
  it("applies active styling to Pan button", () => {
    // Arrange: Set `isPanActive` to true.
    render(<ToolbarModeButtons {...defaultProps} isPanActive={true} />);

    // Assert: Check for emerald background and text utility classes on the Pan button.
    const panBtn = screen.getByLabelText("Pan");
    expect(panBtn.className).toContain("bg-emerald-100");
    expect(panBtn.className).toContain("text-emerald-600");
  });

  /**
   * Test case to verify that the Select button reflects active visual styling when its state is active.
   */
  it("applies active styling to Select button", () => {
    // Arrange: Set `isSelectActive` to true and `isPanActive` to false.
    render(<ToolbarModeButtons {...defaultProps} isSelectActive={true} isPanActive={false} />);

    // Assert: Check for emerald background and text utility classes on the Select button.
    const selectBtn = screen.getByLabelText("Select");
    expect(selectBtn.className).toContain("bg-emerald-100");
    expect(selectBtn.className).toContain("text-emerald-600");
  });

  /**
   * Test case to verify that the Draw button reflects active visual styling when its state is active.
   */
  it("applies active styling to Draw button", () => {
    // Arrange: Set `isDrawActive` to true and `isPanActive` to false.
    render(<ToolbarModeButtons {...defaultProps} isDrawActive={true} isPanActive={false} />);

    // Assert: Check for emerald background and text utility classes on the Draw button.
    const drawBtn = screen.getByLabelText("Draw");
    expect(drawBtn.className).toContain("bg-emerald-100");
    expect(drawBtn.className).toContain("text-emerald-600");
  });

  /**
   * Test case to verify that modification modes are disabled when the editor is locked, while navigation remains available.
   */
  it("disables Select and Draw buttons when locked", () => {
    // Arrange: Set `isLocked` to true.
    render(<ToolbarModeButtons {...defaultProps} isLocked={true} />);

    const selectBtn = screen.getByLabelText("Select");
    const drawBtn = screen.getByLabelText("Draw");
    const panBtn = screen.getByLabelText("Pan");

    // Assert: Verify modification buttons are disabled while the Pan button remains interactive.
    expect(selectBtn).toBeDisabled();
    expect(drawBtn).toBeDisabled();
    expect(panBtn).toBeEnabled();
  });

  /**
   * Test case to verify that clicking disabled mode buttons during a locked state does not trigger state changes.
   */
  it("prevents interactions on disabled buttons when locked", () => {
    // Arrange: Render in a locked state.
    render(<ToolbarModeButtons {...defaultProps} isLocked={true} />);

    // Act: Attempt to click the disabled Select and Draw buttons.
    fireEvent.click(screen.getByLabelText("Select"));
    fireEvent.click(screen.getByLabelText("Draw"));

    // Assert: Verify that the corresponding state handlers were not called.
    expect(defaultProps.onSetSelectMode).not.toHaveBeenCalled();
    expect(defaultProps.onSetDrawMode).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the parent container of disabled buttons reflects the locked state via cursor styling.
   */
  it("applies cursor-not-allowed styling when locked", () => {
    // Arrange: Render in a locked state.
    render(<ToolbarModeButtons {...defaultProps} isLocked={true} />);

    const selectBtn = screen.getByLabelText("Select");
    const drawBtn = screen.getByLabelText("Draw");

    // Assert: Check that the wrapper elements indicate the interactive restriction.
    expect(selectBtn.parentElement).toHaveClass("cursor-not-allowed");
    expect(drawBtn.parentElement).toHaveClass("cursor-not-allowed");
  });
});
