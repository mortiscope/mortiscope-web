import React from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { PreviewViewControls } from "@/features/cases/components/preview-view-controls";

// Mock the `framer-motion` component for isolation and to verify layout.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: React.ComponentProps<"div">) => (
      <div data-testid="motion-div" className={className}>
        {children}
      </div>
    ),
  },
}));

// Mock the Dialog Footer component to check structural classes.
vi.mock("@/components/ui/dialog", () => ({
  DialogFooter: ({ children, className }: React.ComponentProps<"div">) => (
    <footer className={className} data-testid="dialog-footer">
      {children}
    </footer>
  ),
}));

// Mock the `Tooltip` components to verify button tooltips.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// Mock icon components used in the toolbar.
vi.mock("react-icons/lu", () => ({
  LuChevronLeft: () => <span data-testid="icon-prev" />,
  LuChevronRight: () => <span data-testid="icon-next" />,
  LuFocus: () => <span data-testid="icon-focus" />,
  LuRefreshCw: () => <span data-testid="icon-rotate" />,
  LuZoomIn: () => <span data-testid="icon-zoom-in" />,
  LuZoomOut: () => <span data-testid="icon-zoom-out" />,
}));

vi.mock("react-icons/tb", () => ({
  TbRotate: () => <span data-testid="icon-reset" />,
}));

// Define default props for the component under test.
const defaultProps = {
  isMobile: false,
  hasPrevious: true,
  hasNext: true,
  isSaving: false,
  isDeleting: false,
  variants: {},
  onPrevious: vi.fn(),
  onNext: vi.fn(),
  onZoomIn: vi.fn(),
  onZoomOut: vi.fn(),
  onResetTransform: vi.fn(),
  onCenterView: vi.fn(),
  onRotate: vi.fn(),
};

/**
 * Test suite for the `PreviewViewControls` component.
 */
describe("PreviewViewControls", () => {
  /**
   * Test case to verify that all navigational, zoom, rotation, and view control buttons are rendered by default.
   */
  it("renders all control buttons", () => {
    // Arrange: Render the component.
    render(<PreviewViewControls {...defaultProps} />);

    // Assert: Check for the presence of each control button via its accessible label.
    expect(screen.getByLabelText("Previous image")).toBeInTheDocument();
    expect(screen.getByLabelText("Next image")).toBeInTheDocument();
    expect(screen.getByLabelText("Zoom in")).toBeInTheDocument();
    expect(screen.getByLabelText("Zoom out")).toBeInTheDocument();
    expect(screen.getByLabelText("Reset view")).toBeInTheDocument();
    expect(screen.getByLabelText("Center focus")).toBeInTheDocument();
    expect(screen.getByLabelText("Rotate image")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking each control button correctly triggers its associated callback function.
   */
  it("calls callback functions when buttons are clicked", async () => {
    // Arrange: Set up user events and render the component.
    const user = userEvent.setup();
    render(<PreviewViewControls {...defaultProps} />);

    // Act & Assert: Click each button and verify that its mock callback was called.
    await user.click(screen.getByLabelText("Previous image"));
    expect(defaultProps.onPrevious).toHaveBeenCalled();

    await user.click(screen.getByLabelText("Next image"));
    expect(defaultProps.onNext).toHaveBeenCalled();

    await user.click(screen.getByLabelText("Zoom in"));
    expect(defaultProps.onZoomIn).toHaveBeenCalled();

    await user.click(screen.getByLabelText("Zoom out"));
    expect(defaultProps.onZoomOut).toHaveBeenCalled();

    await user.click(screen.getByLabelText("Reset view"));
    expect(defaultProps.onResetTransform).toHaveBeenCalled();

    await user.click(screen.getByLabelText("Center focus"));
    expect(defaultProps.onCenterView).toHaveBeenCalled();

    await user.click(screen.getByLabelText("Rotate image"));
    expect(defaultProps.onRotate).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the "Previous" button is hidden when `hasPrevious` is false.
   */
  it("hides Previous button when hasPrevious is false", () => {
    // Arrange: Render the component with `hasPrevious` set to false.
    render(<PreviewViewControls {...defaultProps} hasPrevious={false} />);
    // Assert: Check that the "Previous image" button is not present.
    expect(screen.queryByLabelText("Previous image")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the "Next" button is hidden when `hasNext` is false.
   */
  it("hides Next button when hasNext is false", () => {
    // Arrange: Render the component with `hasNext` set to false.
    render(<PreviewViewControls {...defaultProps} hasNext={false} />);
    // Assert: Check that the "Next image" button is not present.
    expect(screen.queryByLabelText("Next image")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the "Rotate image" button is disabled when the application is in a saving state.
   */
  it("disables Rotate button when saving", () => {
    // Arrange: Render the component with `isSaving` set to true.
    render(<PreviewViewControls {...defaultProps} isSaving={true} />);
    // Assert: Check that the "Rotate image" button is disabled.
    expect(screen.getByLabelText("Rotate image")).toBeDisabled();
  });

  /**
   * Test case to verify that the "Rotate image" button is disabled when the application is in a deleting state.
   */
  it("disables Rotate button when deleting", () => {
    // Arrange: Render the component with `isDeleting` set to true.
    render(<PreviewViewControls {...defaultProps} isDeleting={true} />);
    // Assert: Check that the "Rotate image" button is disabled.
    expect(screen.getByLabelText("Rotate image")).toBeDisabled();
  });

  /**
   * Test case to verify that mobile-specific positioning and background classes are applied when `isMobile` is true.
   */
  it("applies mobile styles when isMobile is true", () => {
    // Arrange: Render the component in mobile mode.
    render(<PreviewViewControls {...defaultProps} isMobile={true} />);

    // Assert: Check the motion container for mobile-specific absolute positioning.
    const container = screen.getByTestId("motion-div");
    expect(container).toHaveClass("absolute bottom-0 left-0");

    // Assert: Check the dialog footer for the translucent background class.
    const footer = screen.getByTestId("dialog-footer");
    expect(footer).toHaveClass("bg-black/75");
  });

  /**
   * Test case to verify that desktop-specific layout classes are applied when `isMobile` is false.
   */
  it("applies desktop styles when isMobile is false", () => {
    // Arrange: Render the component in desktop mode.
    render(<PreviewViewControls {...defaultProps} isMobile={false} />);

    // Assert: Check the motion container for desktop-specific classes (non-absolute, shrink-0).
    const container = screen.getByTestId("motion-div");
    expect(container).not.toHaveClass("absolute");
    expect(container).toHaveClass("shrink-0");
  });
});
