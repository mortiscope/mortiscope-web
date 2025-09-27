import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ResultsViewControls } from "@/features/results/components/results-view-controls";

// Mock framer-motion to prevent animation side-effects and provide a stable container for class assertions.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div data-testid="controls-container" className={className}>
        {children}
      </div>
    ),
  },
}));

// Mock the UI Button component to capture click events and verify accessibility labels.
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    "aria-label"?: string;
  }) => (
    <button onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

// Mock Dialog components to verify structural layout and conditional background styling.
vi.mock("@/components/ui/dialog", () => ({
  DialogFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-footer" className={className}>
      {children}
    </div>
  ),
}));

// Mock Tooltip components to ensure content is accessible for verification without complex hover logic.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// Mock Lucide icons used for zoom, navigation, and view reset actions.
vi.mock("react-icons/lu", () => ({
  LuChevronLeft: () => <span data-testid="icon-prev" />,
  LuChevronRight: () => <span data-testid="icon-next" />,
  LuFocus: () => <span data-testid="icon-focus" />,
  LuZoomIn: () => <span data-testid="icon-zoom-in" />,
  LuZoomOut: () => <span data-testid="icon-zoom-out" />,
}));

/**
 * Test suite for the `ResultsViewControls` component.
 */
describe("ResultsViewControls", () => {
  const defaultProps = {
    isMobile: false,
    hasPrevious: true,
    hasNext: true,
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    resetTransform: vi.fn(),
    centerView: vi.fn(),
    variants: {},
  };

  /**
   * Test case to verify that the primary image manipulation buttons are present in the document.
   */
  it("renders the zoom and focus controls", () => {
    // Arrange: Render the controls with default props.
    render(<ResultsViewControls {...defaultProps} />);

    // Assert: Check for the presence of Zoom In, Zoom Out, and Center Focus buttons.
    expect(screen.getByLabelText("Zoom in")).toBeInTheDocument();
    expect(screen.getByLabelText("Zoom out")).toBeInTheDocument();
    expect(screen.getByLabelText("Center focus")).toBeInTheDocument();
  });

  /**
   * Test case to verify that specific Tailwind CSS classes are applied for a mobile overlay layout.
   */
  it("applies mobile styling classes when isMobile is true", () => {
    // Arrange: Render the component with `isMobile` enabled.
    render(<ResultsViewControls {...defaultProps} isMobile={true} />);

    // Assert: Verify that the container is absolute-positioned and the footer has an opaque background.
    const container = screen.getByTestId("controls-container");
    expect(container).toHaveClass("absolute bottom-0 left-0 z-10 w-full");

    const footer = screen.getByTestId("dialog-footer");
    expect(footer).toHaveClass("bg-black/75");
  });

  /**
   * Test case to verify that the component uses standard spacing and padding for the desktop layout.
   */
  it("applies desktop styling classes when isMobile is false", () => {
    // Arrange: Render the component in desktop mode.
    render(<ResultsViewControls {...defaultProps} isMobile={false} />);

    // Assert: Verify that mobile-only overlay classes are removed and desktop padding is added.
    const container = screen.getByTestId("controls-container");
    expect(container).toHaveClass("shrink-0 px-6 pt-0 pb-6 md:pt-4");
    expect(container).not.toHaveClass("absolute bottom-0");

    const footer = screen.getByTestId("dialog-footer");
    expect(footer).not.toHaveClass("bg-black/75");
  });

  /**
   * Test case to verify the rendering of the previous navigation button based on item availability.
   */
  it("renders the Previous button when hasPrevious is true", () => {
    // Arrange: Provide a true value for `hasPrevious`.
    render(<ResultsViewControls {...defaultProps} hasPrevious={true} />);

    // Assert: Verify the button is rendered.
    expect(screen.getByLabelText("Previous image")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the previous button is hidden if no previous item exists.
   */
  it("does not render the Previous button when hasPrevious is false", () => {
    // Arrange: Provide a false value for `hasPrevious`.
    render(<ResultsViewControls {...defaultProps} hasPrevious={false} />);

    // Assert: Verify the button is absent from the DOM.
    expect(screen.queryByLabelText("Previous image")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify the rendering of the next navigation button based on item availability.
   */
  it("renders the Next button when hasNext is true", () => {
    // Arrange: Provide a true value for `hasNext`.
    render(<ResultsViewControls {...defaultProps} hasNext={true} />);

    // Assert: Verify the button is rendered.
    expect(screen.getByLabelText("Next image")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the next button is hidden if no subsequent item exists.
   */
  it("does not render the Next button when hasNext is false", () => {
    // Arrange: Provide a false value for `hasNext`.
    render(<ResultsViewControls {...defaultProps} hasNext={false} />);

    // Assert: Verify the button is absent from the DOM.
    expect(screen.queryByLabelText("Next image")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking navigation buttons triggers the appropriate callbacks.
   */
  it("triggers navigation callbacks when buttons are clicked", async () => {
    // Arrange: Setup user interaction and render.
    const user = userEvent.setup();
    render(<ResultsViewControls {...defaultProps} />);

    // Act: Click the previous and next buttons.
    await user.click(screen.getByLabelText("Previous image"));
    await user.click(screen.getByLabelText("Next image"));

    // Assert: Verify that both `onPrevious` and `onNext` callbacks were called once.
    expect(defaultProps.onPrevious).toHaveBeenCalledTimes(1);
    expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that zoom interactions call the corresponding magnification functions.
   */
  it("triggers zoom callbacks when buttons are clicked", async () => {
    // Arrange: Setup user interaction and render.
    const user = userEvent.setup();
    render(<ResultsViewControls {...defaultProps} />);

    // Act: Click the zoom in and zoom out buttons.
    await user.click(screen.getByLabelText("Zoom in"));
    await user.click(screen.getByLabelText("Zoom out"));

    // Assert: Verify that `zoomIn` and `zoomOut` were triggered.
    expect(defaultProps.zoomIn).toHaveBeenCalledTimes(1);
    expect(defaultProps.zoomOut).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that centering the focus resets the image transformation and centers the viewport.
   */
  it("triggers reset and center callbacks when center focus is clicked", async () => {
    // Arrange: Setup user interaction and render.
    const user = userEvent.setup();
    render(<ResultsViewControls {...defaultProps} />);

    // Act: Click the center focus button.
    await user.click(screen.getByLabelText("Center focus"));

    // Assert: Verify that both the transformation reset and the centering callbacks were executed.
    expect(defaultProps.resetTransform).toHaveBeenCalledTimes(1);
    expect(defaultProps.centerView).toHaveBeenCalledTimes(1);
  });
});
