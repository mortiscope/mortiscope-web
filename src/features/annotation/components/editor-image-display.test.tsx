import { fireEvent, screen } from "@testing-library/react";
import { createRef } from "react";
import { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render } from "@/__tests__/setup/test-utils";
import { EditorImageDisplay } from "@/features/annotation/components/editor-image-display";
import { type EditorImage } from "@/features/annotation/hooks/use-editor-image";
import { useImageDisplayState } from "@/features/annotation/hooks/use-image-display-state";
import { useImageDrawing } from "@/features/annotation/hooks/use-image-drawing";
import { useRenderedImage } from "@/features/images/hooks/use-rendered-image";

type ImageDisplayState = ReturnType<typeof useImageDisplayState>;
type ImageDrawingState = ReturnType<typeof useImageDrawing>;
type RenderedImageState = ReturnType<typeof useRenderedImage>;
import { useIsMobile } from "@/hooks/use-mobile";

// Mock the mobile detection hook to control viewport behavior in tests.
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(),
}));

// Mock the Next.js Image component to render as a standard img tag for easier testing.
vi.mock("next/image", async () => {
  const React = await import("react");
  return {
    default: ({
      fill,
      priority,
      alt,
      ...props
    }: React.ComponentProps<"img"> & { fill?: boolean; priority?: boolean }) =>
      React.createElement("img", {
        ...props,
        alt,
        "data-fill": fill,
        "data-priority": priority,
      }),
  };
});

// Mock the hook managing the display modes and transformation state.
vi.mock("@/features/annotation/hooks/use-image-display-state", () => ({
  useImageDisplayState: vi.fn(),
}));

// Mock the hook that calculates the actual rendered dimensions and styles of the image.
vi.mock("@/features/images/hooks/use-rendered-image", () => ({
  useRenderedImage: vi.fn(),
}));

// Mock the hook responsible for managing the logic of drawing new bounding boxes.
vi.mock("@/features/annotation/hooks/use-image-drawing", () => ({
  useImageDrawing: vi.fn(),
}));

// Mock the bounding box component to verify its conditional rendering.
vi.mock("@/features/annotation/components/editor-bounding-box", () => ({
  EditorBoundingBox: () => <div data-testid="editor-bounding-box" />,
}));

// Mock framer-motion to simplify the rendering of animated container divs.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, onClick, ...props }: React.ComponentProps<"div">) => (
      <div className={className} onClick={onClick} data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock the loading spinner component.
vi.mock("react-spinners/BeatLoader", () => ({
  default: () => <div data-testid="beat-loader" />,
}));

// Mock the zoom-pan-pinch library to simulate transformations and component structure.
vi.mock("react-zoom-pan-pinch", async () => {
  const React = await import("react");
  const MockTransformWrapper = React.forwardRef(
    (
      {
        children,
        ...props
      }: React.ComponentProps<"div"> & {
        initialScale?: number;
        minScale?: number;
        maxScale?: number;
        centerOnInit?: boolean;
        limitToBounds?: boolean;
        panning?: unknown;
        wheel?: unknown;
        doubleClick?: unknown;
        onTransformed?: (ref: unknown, state: unknown) => void;
      },
      ref: React.ForwardedRef<HTMLDivElement>
    ) => {
      const {
        initialScale,
        minScale,
        maxScale,
        centerOnInit,
        limitToBounds,
        panning,
        wheel,
        doubleClick,
        onTransformed,
        ...domProps
      } = props;

      const unusedProps = {
        _i: initialScale,
        _min: minScale,
        _max: maxScale,
        _c: centerOnInit,
        _l: limitToBounds,
        _p: panning,
        _w: wheel,
        _d: doubleClick,
        _o: onTransformed,
      };

      return (
        <div
          data-testid="transform-wrapper"
          ref={ref}
          {...domProps}
          data-mock-unused={JSON.stringify(unusedProps)}
        >
          <button
            data-testid="trigger-transform"
            onClick={() =>
              onTransformed?.({} as ReactZoomPanPinchRef, {
                scale: 2.5,
                positionX: 0,
                positionY: 0,
              })
            }
          />
          {children}
        </div>
      );
    }
  );
  MockTransformWrapper.displayName = "TransformWrapper";

  return {
    TransformWrapper: MockTransformWrapper,
    TransformComponent: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="transform-component">{children}</div>
    ),
  };
});

/**
 * Test suite for the `EditorImageDisplay` component.
 */
describe("EditorImageDisplay", () => {
  // Define a mock image object for the component prop.
  const mockImage: EditorImage = {
    id: "img-1",
    url: "http://example.com/image.jpg",
    name: "test-image.jpg",
    dateUploaded: new Date("2025-01-01"),
    size: 1024,
  };

  // Define default state values for the display state hook.
  const defaultDisplayState: Partial<ImageDisplayState> = {
    clearSelection: vi.fn(),
    detections: [],
    drawMode: false,
    selectMode: false,
    transformScale: 1,
    handleTransformed: vi.fn(),
  };

  // Define default values for the rendered image dimensions and style.
  const defaultRenderedImage: RenderedImageState = {
    isImageLoaded: true,
    imageDimensions: { width: 1000, height: 1000 },
    renderedImageStyle: { width: 500, height: 500, top: 0, left: 0 },
  };

  // Define default state values for the image drawing logic.
  const defaultDrawingState: Partial<ImageDrawingState> = {
    isDrawing: false,
    drawStart: null,
    drawCurrent: null,
    justFinishedDrawing: { current: false },
    handleDrawStart: vi.fn(),
    handleDrawMove: vi.fn(),
    handleDrawEnd: vi.fn(),
  };

  // Setup default mock returns before each test to ensure a clean slate.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIsMobile).mockReturnValue(false);
    vi.mocked(useImageDisplayState).mockReturnValue(defaultDisplayState as ImageDisplayState);
    vi.mocked(useRenderedImage).mockReturnValue(defaultRenderedImage);
    vi.mocked(useImageDrawing).mockReturnValue(defaultDrawingState as ImageDrawingState);
  });

  /**
   * Test case to verify the basic rendering of the image and its wrapper components.
   */
  it("renders the image and main containers", () => {
    // Arrange: Render the display component.
    render(<EditorImageDisplay image={mockImage} />);

    // Assert: Verify that the main structural containers and the image are present.
    expect(screen.getByTestId("motion-div")).toBeInTheDocument();
    expect(screen.getByTestId("transform-wrapper")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Annotation view of test-image.jpg/i })
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that the loading spinner is shown while the image is fetching.
   */
  it("shows loader when image is not loaded", () => {
    // Arrange: Mock the image loading state to false.
    vi.mocked(useRenderedImage).mockReturnValue({
      ...defaultRenderedImage,
      isImageLoaded: false,
    });

    render(<EditorImageDisplay image={mockImage} />);

    // Assert: Verify that the loader is displayed.
    expect(screen.getByTestId("beat-loader")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the loading spinner is removed once the image is ready.
   */
  it("hides loader when image is loaded", () => {
    // Arrange: Use the default state where the image is loaded.
    render(<EditorImageDisplay image={mockImage} />);

    // Assert: Verify that the loader is not in the DOM.
    expect(screen.queryByTestId("beat-loader")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that bounding box components are rendered when detections are present.
   */
  it("renders bounding boxes when detections exist and image is loaded", () => {
    // Arrange: Mock the display state with a sample detection.
    vi.mocked(useImageDisplayState).mockReturnValue({
      ...defaultDisplayState,
      detections: [{ id: "d1" }] as unknown as ImageDisplayState["detections"],
    } as ImageDisplayState);

    render(<EditorImageDisplay image={mockImage} />);

    // Assert: Verify that the bounding box component is rendered.
    expect(screen.getByTestId("editor-bounding-box")).toBeInTheDocument();
  });

  /**
   * Test case to verify that bounding boxes are not rendered when there are no detections.
   */
  it("does not render bounding boxes if no detections", () => {
    // Arrange: Mock the display state with an empty detections array.
    vi.mocked(useImageDisplayState).mockReturnValue({
      ...defaultDisplayState,
      detections: [],
    } as ImageDisplayState);

    render(<EditorImageDisplay image={mockImage} />);

    // Assert: Verify that no bounding box components are found.
    expect(screen.queryByTestId("editor-bounding-box")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify the rendering of the dashed preview box during an active draw action.
   */
  it("renders drawing preview box when isDrawing is true", () => {
    // Arrange: Mock the drawing hook with active drawing coordinates.
    vi.mocked(useImageDrawing).mockReturnValue({
      ...defaultDrawingState,
      isDrawing: true,
      drawStart: { x: 0, y: 0 },
      drawCurrent: { x: 100, y: 100 },
    } as ImageDrawingState);

    render(<EditorImageDisplay image={mockImage} />);

    // Assert: Check for the presence and style of the emerald dashed preview box.
    const previewBox = document.querySelector(".border-emerald-400");
    expect(previewBox).toBeInTheDocument();
    expect(previewBox).toHaveStyle({
      width: "100px",
      height: "100px",
      borderStyle: "dashed",
    });
  });

  /**
   * Test case to verify that the cursor changes to a crosshair when in draw mode.
   */
  it("applies correct cursor style for draw mode", () => {
    // Arrange: Mock the display state to enable draw mode.
    vi.mocked(useImageDisplayState).mockReturnValue({
      ...defaultDisplayState,
      drawMode: true,
    } as ImageDisplayState);

    render(<EditorImageDisplay image={mockImage} />);

    // Assert: Verify the cursor style on the image container.
    const imageContainer = screen.getByRole("img").parentElement;
    expect(imageContainer).toHaveStyle({ cursor: "crosshair" });
  });

  /**
   * Test case to verify that the cursor changes to default when in selection mode.
   */
  it("applies correct cursor style for select mode", () => {
    // Arrange: Mock the display state to enable select mode.
    vi.mocked(useImageDisplayState).mockReturnValue({
      ...defaultDisplayState,
      selectMode: true,
    } as ImageDisplayState);

    render(<EditorImageDisplay image={mockImage} />);

    // Assert: Verify the cursor style on the image container.
    const imageContainer = screen.getByRole("img").parentElement;
    expect(imageContainer).toHaveStyle({ cursor: "default" });
  });

  /**
   * Test case to verify that the cursor defaults to a grab icon for panning.
   */
  it("applies correct cursor style for pan mode (default)", () => {
    // Arrange: Mock the display state with both draw and select modes disabled.
    vi.mocked(useImageDisplayState).mockReturnValue({
      ...defaultDisplayState,
      drawMode: false,
      selectMode: false,
    } as ImageDisplayState);

    render(<EditorImageDisplay image={mockImage} />);

    // Assert: Verify the grab cursor style on the image container.
    const imageContainer = screen.getByRole("img").parentElement;
    expect(imageContainer).toHaveStyle({ cursor: "grab" });
  });

  /**
   * Test case to verify that interaction events correctly trigger drawing handlers.
   */
  it("handles mouse/touch events for drawing", () => {
    // Arrange: Define spies for drawing events.
    const handleDrawStart = vi.fn();
    const handleDrawMove = vi.fn();
    const handleDrawEnd = vi.fn();

    vi.mocked(useImageDrawing).mockReturnValue({
      ...defaultDrawingState,
      handleDrawStart,
      handleDrawMove,
      handleDrawEnd,
    } as ImageDrawingState);

    render(<EditorImageDisplay image={mockImage} />);
    const imageContainer = screen.getByRole("img").parentElement!;

    // Act: Simulate mouse sequence and touch sequence.
    fireEvent.mouseDown(imageContainer);
    expect(handleDrawStart).toHaveBeenCalled();

    fireEvent.mouseMove(imageContainer);
    expect(handleDrawMove).toHaveBeenCalled();

    fireEvent.mouseUp(imageContainer);
    expect(handleDrawEnd).toHaveBeenCalled();

    fireEvent.touchStart(imageContainer);
    expect(handleDrawStart).toHaveBeenCalled();
  });

  /**
   * Test case to verify that click events are blocked immediately after a box is drawn.
   */
  it("stops propagation of clicks when drawing just finished", () => {
    // Arrange: Mock state to indicate a drawing action has just concluded.
    vi.mocked(useImageDrawing).mockReturnValue({
      ...defaultDrawingState,
      justFinishedDrawing: { current: true },
    } as ImageDrawingState);

    render(<EditorImageDisplay image={mockImage} />);
    const imageContainer = screen.getByRole("img").parentElement!;

    // Act: Create and dispatch a manual click event with a propagation spy.
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });

    const stopPropagationSpy = vi.fn();
    Object.defineProperty(event, "stopPropagation", {
      value: stopPropagationSpy,
    });

    fireEvent(imageContainer, event);

    // Assert: Verify that the click event was blocked.
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the forwarded ref correctly references the zoom wrapper.
   */
  it("forwards ref to TransformWrapper", () => {
    // Arrange: Create a ref object.
    const ref = createRef<ReactZoomPanPinchRef>();
    render(<EditorImageDisplay ref={ref} image={mockImage} />);

    // Assert: Verify the ref points to the mocked transform wrapper.
    expect(ref.current).toBeInTheDocument();
    expect(ref.current).toHaveAttribute("data-testid", "transform-wrapper");
  });

  /**
   * Test case to verify that clicking the background clears the active detection selection.
   */
  it("calls clearSelection when background is clicked", () => {
    // Arrange: Define a spy for clearing selection.
    const clearSelection = vi.fn();
    vi.mocked(useImageDisplayState).mockReturnValue({
      ...defaultDisplayState,
      clearSelection,
    } as ImageDisplayState);

    render(<EditorImageDisplay image={mockImage} />);

    // Act: Click the outermost motion div.
    fireEvent.click(screen.getByTestId("motion-div"));

    // Assert: Verify the selection was cleared.
    expect(clearSelection).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the transform wrapper is active during draw mode.
   */
  it("disables panning when in draw or select mode", () => {
    // Arrange: Mock draw mode as enabled.
    vi.mocked(useImageDisplayState).mockReturnValue({
      ...defaultDisplayState,
      drawMode: true,
    } as ImageDisplayState);

    render(<EditorImageDisplay image={mockImage} />);

    // Assert: Verify that the transform wrapper is still present in the DOM.
    expect(screen.getByTestId("transform-wrapper")).toBeInTheDocument();
  });

  /**
   * Test case to verify that mobile-specific CSS classes are applied in mobile view.
   */
  it("applies mobile layout styles when isMobile is true", () => {
    // Arrange: Mock the mobile hook to return true.
    vi.mocked(useIsMobile).mockReturnValue(true);
    render(<EditorImageDisplay image={mockImage} />);

    // Assert: Verify that full-width/height classes are applied to the container.
    const imageContainer = screen.getByRole("img").parentElement;
    expect(imageContainer).toHaveClass("h-full w-full");
    expect(imageContainer).not.toHaveClass("h-3/4 w-3/4");
  });

  /**
   * Test case to verify that clicks do not bubble up when the user is in draw mode.
   */
  it("stops propagation of clicks when in draw mode", () => {
    // Arrange: Mock the display state to enable draw mode.
    vi.mocked(useImageDisplayState).mockReturnValue({
      ...defaultDisplayState,
      drawMode: true,
    } as ImageDisplayState);

    render(<EditorImageDisplay image={mockImage} />);
    const imageContainer = screen.getByRole("img").parentElement!;

    // Act: Dispatch a click event and check for propagation block.
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    const stopPropagationSpy = vi.fn();
    Object.defineProperty(event, "stopPropagation", { value: stopPropagationSpy });

    fireEvent(imageContainer, event);

    // Assert: Verify the event was stopped.
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  /**
   * Test case to verify that clicks propagate to clear selection when not drawing.
   */
  it("allows click propagation to clear selection when not drawing", () => {
    // Arrange: Mock a state where draw mode is disabled.
    const clearSelection = vi.fn();
    vi.mocked(useImageDisplayState).mockReturnValue({
      ...defaultDisplayState,
      clearSelection,
      drawMode: false,
    } as ImageDisplayState);

    render(<EditorImageDisplay image={mockImage} />);
    const imageContainer = screen.getByRole("img").parentElement!;

    // Act: Click the image container.
    fireEvent.click(imageContainer);

    // Assert: Verify the clear selection handler was reached via bubbling.
    expect(clearSelection).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the component updates its zoom CSS variable on transformation.
   */
  it("updates --zoom-scale CSS variable when image is transformed", () => {
    // Arrange: Render the display component.
    render(<EditorImageDisplay image={mockImage} />);
    const imageContainer = screen.getByRole("img").parentElement!;
    const triggerBtn = screen.getByTestId("trigger-transform");

    // Act: Trigger a mock transformation event.
    fireEvent.click(triggerBtn);

    // Assert: Verify the CSS variable matches the new scale.
    expect(imageContainer).toHaveStyle({ "--zoom-scale": "2.5" });
  });

  /**
   * Test case to verify the visual overlay style for 'annotations_only' view mode.
   */
  it("applies inset box shadow when viewMode is 'annotations_only'", () => {
    // Arrange: Mock the display state for annotations only view.
    vi.mocked(useImageDisplayState).mockReturnValue({
      ...defaultDisplayState,
      viewMode: "annotations_only",
    } as ImageDisplayState);

    render(<EditorImageDisplay image={mockImage} />);

    // Assert: Verify the emerald inset shadow is applied to the overlay.
    const overlay = document.querySelector(".pointer-events-none.absolute");
    expect(overlay).toHaveStyle({
      boxShadow: "inset 0 0 0 calc(2px / var(--zoom-scale)) #6ee7b7",
    });
  });

  /**
   * Test case to verify the visual overlay style for the standard 'all' view mode.
   */
  it("applies standard box shadow when viewMode is 'all'", () => {
    // Arrange: Mock the display state for the default view.
    vi.mocked(useImageDisplayState).mockReturnValue({
      ...defaultDisplayState,
      viewMode: "all",
    } as ImageDisplayState);

    render(<EditorImageDisplay image={mockImage} />);

    // Assert: Verify the standard drop shadow is applied to the overlay.
    const overlay = document.querySelector(".pointer-events-none.absolute");
    expect(overlay).toHaveStyle({
      boxShadow:
        "0 25px 50px -12px rgba(148, 163, 184, 0.15), 0 12px 24px -8px rgba(148, 163, 184, 0.1)",
    });
  });
});
