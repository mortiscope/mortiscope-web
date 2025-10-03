import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { render } from "@/__tests__/setup/test-utils";
import { ToolbarViewButtons } from "@/features/annotation/components/toolbar-view-buttons";

/**
 * Test suite for the `ToolbarViewButtons` component.
 */
describe("ToolbarViewButtons", () => {
  // Define default properties including mock handlers for zoom and view manipulation.
  const defaultProps = {
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onCenterView: vi.fn(),
    onResetView: vi.fn(),
    onToggleMinimap: vi.fn(),
    isMinimapEnabled: false,
  };

  /**
   * Test case to verify that all view-related control buttons are rendered with appropriate accessibility labels.
   */
  it("renders all view control buttons", () => {
    // Arrange: Render the view buttons component.
    render(<ToolbarViewButtons {...defaultProps} />);

    // Assert: Check for the presence of zoom, minimap toggle, center focus, and reset view buttons.
    expect(screen.getByLabelText("Zoom in")).toBeInTheDocument();
    expect(screen.getByLabelText("Enable minimap")).toBeInTheDocument();
    expect(screen.getByLabelText("Center focus")).toBeInTheDocument();
    expect(screen.getByLabelText("Reset view")).toBeInTheDocument();
    expect(screen.getByLabelText("Zoom out")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the zoom in button executes the provided `onZoomIn` handler.
   */
  it("calls onZoomIn when zoom in button is clicked", () => {
    // Arrange: Render the component.
    render(<ToolbarViewButtons {...defaultProps} />);

    // Act: Simulate a click on the zoom in button.
    fireEvent.click(screen.getByLabelText("Zoom in"));

    // Assert: Verify the zoom in handler was called exactly once.
    expect(defaultProps.onZoomIn).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that clicking the zoom out button executes the provided `onZoomOut` handler.
   */
  it("calls onZoomOut when zoom out button is clicked", () => {
    // Arrange: Render the component.
    render(<ToolbarViewButtons {...defaultProps} />);

    // Act: Simulate a click on the zoom out button.
    fireEvent.click(screen.getByLabelText("Zoom out"));

    // Assert: Verify the zoom out handler was called exactly once.
    expect(defaultProps.onZoomOut).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that clicking the center focus button executes the provided `onCenterView` handler.
   */
  it("calls onCenterView when center focus button is clicked", () => {
    // Arrange: Render the component.
    render(<ToolbarViewButtons {...defaultProps} />);

    // Act: Simulate a click on the center focus button.
    fireEvent.click(screen.getByLabelText("Center focus"));

    // Assert: Verify the center view handler was called exactly once.
    expect(defaultProps.onCenterView).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that clicking the reset view button executes the provided `onResetView` handler.
   */
  it("calls onResetView when reset view button is clicked", () => {
    // Arrange: Render the component.
    render(<ToolbarViewButtons {...defaultProps} />);

    // Act: Simulate a click on the reset view button.
    fireEvent.click(screen.getByLabelText("Reset view"));

    // Assert: Verify the reset view handler was called exactly once.
    expect(defaultProps.onResetView).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that clicking the minimap button executes the provided `onToggleMinimap` handler.
   */
  it("calls onToggleMinimap when minimap button is clicked", () => {
    // Arrange: Render the component.
    render(<ToolbarViewButtons {...defaultProps} />);

    // Act: Simulate a click on the minimap toggle button.
    fireEvent.click(screen.getByLabelText("Enable minimap"));

    // Assert: Verify the toggle handler was called exactly once.
    expect(defaultProps.onToggleMinimap).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the minimap button displays the correct label when the minimap is currently disabled.
   */
  it("displays correct label for minimap button when disabled", () => {
    // Arrange: Set `isMinimapEnabled` to false.
    render(<ToolbarViewButtons {...defaultProps} isMinimapEnabled={false} />);

    // Assert: Verify that the label instructs the user to enable the minimap.
    expect(screen.getByLabelText("Enable minimap")).toBeInTheDocument();
    expect(screen.queryByLabelText("Disable minimap")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the minimap button displays the correct label when the minimap is currently enabled.
   */
  it("displays correct label for minimap button when enabled", () => {
    // Arrange: Set `isMinimapEnabled` to true.
    render(<ToolbarViewButtons {...defaultProps} isMinimapEnabled={true} />);

    // Assert: Verify that the label instructs the user to disable the minimap.
    expect(screen.getByLabelText("Disable minimap")).toBeInTheDocument();
    expect(screen.queryByLabelText("Enable minimap")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the component does not throw errors if optional callback props are not provided.
   */
  it("handles missing optional callbacks gracefully", () => {
    // Arrange: Render the component without passing any props.
    render(<ToolbarViewButtons />);

    // Act: Simulate a click on the zoom in button.
    const zoomInBtn = screen.getByLabelText("Zoom in");
    fireEvent.click(zoomInBtn);

    // Assert: Verify the button is still rendered and no runtime crash occurred.
    expect(zoomInBtn).toBeInTheDocument();
  });
});
