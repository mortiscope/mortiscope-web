import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { render } from "@/__tests__/setup/test-utils";
import { EditorHeaderContext } from "@/features/annotation/components/editor-header-context";

/**
 * Test suite for the `EditorHeaderContext` component.
 */
describe("EditorHeaderContext", () => {
  const defaultProps = {
    onBackNavigation: vi.fn(),
    isMobileSidebarOpen: false,
    onToggleMobileSidebar: vi.fn(),
    hasOpenPanel: false,
    caseName: "Test Case",
    currentImageName: "Image 1",
  };

  /**
   * Test case to verify that the back navigation trigger is present in the document.
   */
  it("renders back navigation button", () => {
    // Arrange: Render the header context component.
    render(<EditorHeaderContext {...defaultProps} />);

    // Assert: Check for the presence of the button via its accessible label.
    expect(screen.getByLabelText("Go back to results")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the back button correctly executes the navigation callback.
   */
  it("calls onBackNavigation when back button is clicked", () => {
    // Arrange: Render the header context component.
    render(<EditorHeaderContext {...defaultProps} />);

    // Act: Click the back navigation button.
    fireEvent.click(screen.getByLabelText("Go back to results"));

    // Assert: Ensure the provided callback function was triggered.
    expect(defaultProps.onBackNavigation).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that breadcrumb information for the case and image is visible.
   */
  it("displays case and image names in breadcrumbs on large screens", () => {
    // Arrange: Render the component with specific metadata.
    render(<EditorHeaderContext {...defaultProps} />);

    // Assert: Verify that both the `caseName` and `currentImageName` are rendered.
    expect(screen.getByText("Test Case")).toBeInTheDocument();
    expect(screen.getByText("Image 1")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the toggle button for the mobile sidebar is rendered.
   */
  it("renders mobile sidebar toggle button", () => {
    // Arrange: Render the header context component.
    render(<EditorHeaderContext {...defaultProps} />);

    // Assert: Check for the button that opens the sidebar.
    expect(screen.getByLabelText("Open sidebar")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the toggle button's label and icon reflect the sidebar state.
   */
  it("toggles mobile sidebar icon based on state", () => {
    // Arrange: Render the component in a closed state.
    const { rerender } = render(
      <EditorHeaderContext {...defaultProps} isMobileSidebarOpen={false} />
    );
    expect(screen.getByLabelText("Open sidebar")).toBeInTheDocument();

    // Act: Update the state to open.
    rerender(<EditorHeaderContext {...defaultProps} isMobileSidebarOpen={true} />);

    // Assert: Verify the label has updated to reflect the close action.
    expect(screen.getByLabelText("Close sidebar")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the mobile toggle triggers the sidebar state update.
   */
  it("calls onToggleMobileSidebar when mobile toggle is clicked", () => {
    // Arrange: Render the header context component.
    render(<EditorHeaderContext {...defaultProps} />);

    // Act: Click the mobile sidebar toggle button.
    const toggleBtn = screen.getByLabelText("Open sidebar");
    fireEvent.click(toggleBtn);

    // Assert: Ensure the toggle handler was executed.
    expect(defaultProps.onToggleMobileSidebar).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the sidebar cannot be closed if a specific settings panel is currently active.
   */
  it("disables mobile sidebar toggle when panel is open and sidebar is open", () => {
    // Arrange: Set both the sidebar and a detailed panel to an open state.
    render(
      <EditorHeaderContext {...defaultProps} isMobileSidebarOpen={true} hasOpenPanel={true} />
    );

    // Act: Locate the active toggle button.
    const toggleBtn = screen.getByLabelText("Close sidebar");

    // Assert: Verify the button is visually and functionally disabled via attributes and classes.
    expect(toggleBtn).toHaveAttribute("aria-disabled", "true");
    expect(toggleBtn).toHaveClass("opacity-50");
    expect(toggleBtn.parentElement).toHaveClass("cursor-not-allowed");

    // Act: Attempt to click the disabled button.
    fireEvent.click(toggleBtn);

    // Assert: Ensure the toggle callback was not executed.
    expect(defaultProps.onToggleMobileSidebar).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify the sidebar toggle is active when no detailed settings panels are open.
   */
  it("allows mobile sidebar toggle when panel is closed", () => {
    // Arrange: Set sidebar to open but detailed panels to closed.
    render(
      <EditorHeaderContext {...defaultProps} isMobileSidebarOpen={true} hasOpenPanel={false} />
    );

    // Act: Locate the toggle button.
    const toggleBtn = screen.getByLabelText("Close sidebar");

    // Assert: Verify the button is not visually disabled.
    expect(toggleBtn).not.toHaveClass("opacity-50");

    // Act: Click the button.
    fireEvent.click(toggleBtn);

    // Assert: Ensure the toggle callback was executed successfully.
    expect(defaultProps.onToggleMobileSidebar).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the application branding is rendered correctly in the header.
   */
  it("renders the MORTISCOPE logo for medium screens", () => {
    // Arrange: Render the header context component.
    render(<EditorHeaderContext {...defaultProps} />);

    // Assert: Check for the constituent parts of the application logo text.
    expect(screen.getByText("MORTI")).toBeInTheDocument();
    expect(screen.getByText("SCOPE")).toBeInTheDocument();
  });
});
