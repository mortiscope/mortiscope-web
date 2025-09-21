import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@/__tests__/setup/test-utils";
import { ResultsImagesModal } from "@/features/images/components/results-images-modal";
import {
  type ImageFile,
  useResultsImageViewer,
} from "@/features/images/hooks/use-results-image-viewer";

interface MockDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface MockHeaderProps {
  onClose: () => void;
}

interface MockViewControlsProps {
  onNext: () => void;
  onPrevious: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetTransform: () => void;
}

interface MockTransformWrapperProps {
  children: React.ReactNode | ((controls: Record<string, unknown>) => React.ReactNode);
  onTransformed?: (ref: unknown, state: { scale: number }) => void;
}

interface MockMotionProps {
  children: React.ReactNode;
}

// Mock the hook to control internal state logic like `activeImage` and `isMobile`.
vi.mock("@/features/images/hooks/use-results-image-viewer");

// Mock the Dialog component to expose internal triggers and avoid Radix UI rendering complexity.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open, onOpenChange }: MockDialogProps) =>
    open ? (
      <div data-testid="dialog-root">
        <button data-testid="trigger-close" onClick={() => onOpenChange?.(false)}>
          Close
        </button>
        {children}
      </div>
    ) : null,
  DialogContent: ({
    children,
    onInteractOutside,
    className,
  }: {
    children: React.ReactNode;
    onInteractOutside?: (e: { preventDefault: () => void }) => void;
    className?: string;
  }) => (
    <div
      data-testid="dialog-content"
      className={className}
      onClick={(e) => {
        const event = { ...e, preventDefault: vi.fn() };
        onInteractOutside?.(event);
      }}
    >
      {children}
    </div>
  ),
}));

// Mock child components to isolate unit tests to the modal logic.
vi.mock("@/features/images/components/results-image-viewer", () => ({
  ResultsImageViewer: () => <div data-testid="image-viewer" />,
}));

vi.mock("@/features/images/components/results-thumbnail-list", () => ({
  ResultsThumbnailList: () => <div data-testid="thumbnail-list" />,
}));

vi.mock("@/features/results/components/results-modal-header", () => ({
  ResultsModalHeader: ({ onClose }: MockHeaderProps) => (
    <div data-testid="modal-header">
      <button onClick={onClose} data-testid="close-btn">
        Close
      </button>
    </div>
  ),
}));

vi.mock("@/features/results/components/results-view-controls", () => ({
  ResultsViewControls: ({
    onNext,
    onPrevious,
    zoomIn,
    zoomOut,
    resetTransform,
  }: MockViewControlsProps) => (
    <div data-testid="view-controls">
      <button onClick={onPrevious} data-testid="prev-btn">
        Prev
      </button>
      <button onClick={onNext} data-testid="next-btn">
        Next
      </button>
      <button onClick={() => zoomIn()} data-testid="zoom-in">
        Zoom In
      </button>
      <button onClick={() => zoomOut()} data-testid="zoom-out">
        Zoom Out
      </button>
      <button onClick={() => resetTransform()} data-testid="reset-btn">
        Reset
      </button>
    </div>
  ),
}));

// Mock `react-zoom-pan-pinch` to simulate the render prop pattern and expose zoom controls.
vi.mock("react-zoom-pan-pinch", () => ({
  TransformWrapper: ({ children, onTransformed }: MockTransformWrapperProps) => {
    const controls = {
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      resetTransform: vi.fn(),
      centerView: vi.fn(),
    };

    const simulateTransform = () => {
      if (onTransformed)
        onTransformed({ instance: { contentComponent: {}, wrapperComponent: {} } }, { scale: 2 });
    };

    return (
      <div data-testid="transform-wrapper">
        <button onClick={simulateTransform} data-testid="trigger-transform">
          Transform
        </button>
        {typeof children === "function" ? children(controls) : children}
      </div>
    );
  },
}));

// Mock Framer Motion to bypass animation logic.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: MockMotionProps) => <>{children}</>,
  motion: {
    div: ({ children }: MockMotionProps) => <div>{children}</div>,
  },
}));

const mockImage: ImageFile = {
  id: "1",
  name: "test.jpg",
  url: "http://test.com/img.jpg",
  version: 1,
} as unknown as ImageFile;

const defaultHookValues = {
  activeImage: mockImage,
  isImageLoaded: true,
  imageDimensions: { width: 100, height: 100 },
  isMobile: false,
  imageContainerRef: { current: null },
  renderedImageStyle: {},
  hasNext: true,
  hasPrevious: true,
};

const defaultProps = {
  image: mockImage,
  images: [mockImage],
  isOpen: true,
  onClose: vi.fn(),
  onNext: vi.fn(),
  onPrevious: vi.fn(),
  onSelectImage: vi.fn(),
};

/**
 * Test suite for the `ResultsImagesModal` component covering rendering, navigation, and interaction logic.
 */
describe("ResultsImagesModal", () => {
  // Reset mocks and establish default hook behavior before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useResultsImageViewer).mockReturnValue(
      defaultHookValues as unknown as ReturnType<typeof useResultsImageViewer>
    );
  });

  /**
   * Test case to verify that the modal does not render when the open prop is false.
   */
  it("renders nothing if isOpen is false", () => {
    // Arrange: Render the component with isOpen set to false.
    render(<ResultsImagesModal {...defaultProps} isOpen={false} />);
    // Assert: Verify that the dialog root is not in the DOM.
    expect(screen.queryByTestId("dialog-root")).toBeNull();
  });

  /**
   * Test case to verify that the modal content is hidden if the hook returns no active image.
   */
  it("renders nothing if activeImage is null (via hook)", () => {
    // Arrange: Mock the hook to return null for activeImage.
    vi.mocked(useResultsImageViewer).mockReturnValue({
      ...defaultHookValues,
      activeImage: null,
    } as unknown as ReturnType<typeof useResultsImageViewer>);

    render(<ResultsImagesModal {...defaultProps} />);
    // Assert: Verify that the dialog content is not rendered.
    expect(screen.queryByTestId("dialog-content")).toBeNull();
  });

  /**
   * Test case to verify that essential sub-components are rendered when data is present.
   */
  it("renders main components when open and data exists", () => {
    // Arrange: Render the component with default valid data.
    render(<ResultsImagesModal {...defaultProps} />);

    // Assert: Check for the presence of content, header, viewer, and controls.
    expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
    expect(screen.getByTestId("modal-header")).toBeInTheDocument();
    expect(screen.getByTestId("image-viewer")).toBeInTheDocument();
    expect(screen.getByTestId("view-controls")).toBeInTheDocument();
    // Assert: The thumbnail list should be null because only one image is in the default props.
    expect(screen.queryByTestId("thumbnail-list")).toBeNull();
  });

  /**
   * Test case to verify that the thumbnail list is rendered only when multiple images are available.
   */
  it("renders thumbnail list if multiple images exist", () => {
    // Arrange: Create props containing multiple images and render.
    const multiProps = { ...defaultProps, images: [mockImage, { ...mockImage, id: "2" }] };
    render(<ResultsImagesModal {...multiProps} />);

    // Assert: Verify that the thumbnail list component is present.
    expect(screen.getByTestId("thumbnail-list")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the close callback is triggered via the header button.
   */
  it("calls onClose when close button is clicked", () => {
    // Arrange: Render the component.
    render(<ResultsImagesModal {...defaultProps} />);

    // Act: Click the close button inside the modal header.
    fireEvent.click(screen.getByTestId("close-btn"));
    // Assert: Verify the onClose prop was called.
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  /**
   * Test case to verify that navigation buttons trigger the corresponding prop callbacks.
   */
  it("calls navigation handlers", () => {
    // Arrange: Render the component.
    render(<ResultsImagesModal {...defaultProps} />);

    // Act: Click the next button.
    fireEvent.click(screen.getByTestId("next-btn"));
    // Assert: Verify onNext was called.
    expect(defaultProps.onNext).toHaveBeenCalled();

    // Act: Click the previous button.
    fireEvent.click(screen.getByTestId("prev-btn"));
    // Assert: Verify onPrevious was called.
    expect(defaultProps.onPrevious).toHaveBeenCalled();
  });

  /**
   * Test case to verify that zoom control functions are correctly propagated from the transform wrapper to the controls component.
   */
  it("passes zoom controls from TransformWrapper to ViewControls", () => {
    // Arrange: Render the component.
    render(<ResultsImagesModal {...defaultProps} />);

    // Act: Trigger the zoom in button which relies on the internal TransformWrapper render prop.
    const zoomInBtn = screen.getByTestId("zoom-in");
    fireEvent.click(zoomInBtn);

    // Act: Trigger the reset button.
    const resetBtn = screen.getByTestId("reset-btn");
    fireEvent.click(resetBtn);
  });

  /**
   * Test case to verify that the component handles transform state updates from the wrapper.
   */
  it("updates transform state when onTransformed is fired", () => {
    // Arrange: Render the component.
    render(<ResultsImagesModal {...defaultProps} />);

    // Act: Trigger the simulated transform event from the mock.
    fireEvent.click(screen.getByTestId("trigger-transform"));
  });

  /**
   * Test case to verify mobile-specific styling and interaction behaviors.
   */
  it("handles mobile-specific behaviors", () => {
    // Arrange: Mock the hook to simulate a mobile device.
    vi.mocked(useResultsImageViewer).mockReturnValue({
      ...defaultHookValues,
      isMobile: true,
    } as unknown as ReturnType<typeof useResultsImageViewer>);

    render(<ResultsImagesModal {...defaultProps} />);

    // Assert: Check for mobile-specific CSS classes on the content.
    const content = screen.getByTestId("dialog-content");
    expect(content).toHaveClass("h-dvh w-screen");

    // Act: Click the dialog close trigger.
    fireEvent.click(screen.getByTestId("trigger-close"));
    // Assert: Verify onClose was called.
    expect(defaultProps.onClose).toHaveBeenCalled();

    // Act: Simulate interacting outside the modal content.
    fireEvent.click(content);
  });
});
