import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { EditorBoundingBox } from "@/features/annotation/components/editor-bounding-box";
import { useBoundingBox } from "@/features/annotation/hooks/use-bounding-box";
import { type Detection } from "@/features/annotation/hooks/use-editor-image";

// Mock the hook that manages bounding box interactions and state logic.
vi.mock("@/features/annotation/hooks/use-bounding-box", () => ({
  useBoundingBox: vi.fn(),
}));

// Mock the individual bounding box item component to simplify property assertions.
vi.mock("@/features/annotation/components/bounding-box-item", () => ({
  BoundingBoxItem: ({
    detection,
    isSelected,
    borderWidth,
  }: {
    detection: Detection;
    isSelected: boolean;
    borderWidth: number;
  }) => (
    <div
      data-testid={`bbox-item-${detection.id}`}
      data-selected={isSelected}
      data-border-width={borderWidth}
    >
      {detection.label}
    </div>
  ),
}));

/**
 * Utility function to create a mock detection object for testing purposes.
 */
const createDetection = (id: string): Detection => ({
  id,
  label: "adult",
  originalLabel: "adult",
  confidence: 0.9,
  originalConfidence: 0.9,
  xMin: 0,
  yMin: 0,
  xMax: 100,
  yMax: 100,
  status: "model_generated",
  uploadId: "img-1",
  createdById: "user-1",
  lastModifiedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
});

/**
 * Test suite for the `EditorBoundingBox` component.
 */
describe("EditorBoundingBox", () => {
  const mockSelectDetection = vi.fn();
  const mockOpenPanel = vi.fn();
  const mockStartDrag = vi.fn();
  const mockStartResize = vi.fn();

  const defaultHookValues = {
    selectedDetectionId: null,
    selectDetection: mockSelectDetection,
    openPanel: mockOpenPanel,
    isLocked: false,
    isResizing: false,
    showTooltipFor: null,
    startDrag: mockStartDrag,
    startResize: mockStartResize,
  };

  const defaultProps = {
    detections: [createDetection("1"), createDetection("2")],
    imageDimensions: { width: 1000, height: 1000 },
    renderedImageStyle: { width: 500, height: 500, top: 10, left: 20 },
  };

  // Reset mocks and provide default hook return values before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    (useBoundingBox as Mock).mockReturnValue(defaultHookValues);
  });

  /**
   * Test case to verify that the overlay container aligns perfectly with the rendered image dimensions.
   */
  it("renders the container with correct positioning styles", () => {
    // Arrange: Render the component with standard image styles.
    render(<EditorBoundingBox {...defaultProps} />);

    // Act: Locate the container wrapping the bounding box items.
    const item1 = screen.getByTestId("bbox-item-1");
    const container = item1.parentElement;

    // Assert: Verify the container matches the `renderedImageStyle` values.
    expect(container).toHaveStyle({
      width: "500px",
      height: "500px",
      top: "10px",
      left: "20px",
    });
  });

  /**
   * Test case to ensure every detection passed via props is rendered as a child.
   */
  it("renders all provided detections", () => {
    // Arrange: Render the component.
    render(<EditorBoundingBox {...defaultProps} />);

    // Assert: Check for the existence of both detection items defined in `defaultProps`.
    expect(screen.getByTestId("bbox-item-1")).toBeInTheDocument();
    expect(screen.getByTestId("bbox-item-2")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the border width remains consistent regardless of image scaling.
   */
  it("passes fixed border width", () => {
    // Arrange: Render the component once at standard size.
    render(<EditorBoundingBox {...defaultProps} />);
    const item = screen.getByTestId("bbox-item-1");

    // Assert: Check if the initial border width is the expected constant.
    expect(item).toHaveAttribute("data-border-width", "2");

    // Arrange: Re-render with a significantly larger image width.
    const largeProps = {
      ...defaultProps,
      renderedImageStyle: { ...defaultProps.renderedImageStyle, width: 2000 },
    };
    render(<EditorBoundingBox {...largeProps} />);

    // Assert: Verify the border width passed to the item remains at the fixed value.
    const largeItem = screen.getAllByTestId("bbox-item-1")[1];
    expect(largeItem).toHaveAttribute("data-border-width", "2");
  });

  /**
   * Test case to verify that the selected status is correctly distributed to child items based on hook state.
   */
  it("identifies selected detection correctly", () => {
    // Arrange: Mock the hook to indicate that detection `1` is currently selected.
    (useBoundingBox as Mock).mockReturnValue({
      ...defaultHookValues,
      selectedDetectionId: "1",
    });

    render(<EditorBoundingBox {...defaultProps} />);

    // Assert: Ensure detection `1` is marked selected while detection `2` is not.
    expect(screen.getByTestId("bbox-item-1")).toHaveAttribute("data-selected", "true");
    expect(screen.getByTestId("bbox-item-2")).toHaveAttribute("data-selected", "false");
  });

  /**
   * Test case to ensure the component correctly initializes its internal logic hook with the provided props.
   */
  it("initializes useBoundingBox hook with correct props", () => {
    // Arrange: Render the component.
    render(<EditorBoundingBox {...defaultProps} />);

    // Assert: Verify that `useBoundingBox` received the exact `defaultProps` object.
    expect(useBoundingBox).toHaveBeenCalledWith(defaultProps);
  });
});
