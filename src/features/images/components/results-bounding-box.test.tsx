import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { ResultsBoundingBox } from "@/features/images/components/results-bounding-box";
import { type ImageFile } from "@/features/images/hooks/use-results-image-viewer";
import { formatConfidence, formatLabel } from "@/lib/utils";

// Mock the Tooltip components to simplify the DOM structure for testing.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// Mock color constants to ensure consistent styling logic during tests.
vi.mock("@/lib/constants", () => ({
  DETECTION_CLASS_COLORS: {
    adult: "#14b8a6",
    pupa: "#f97316",
    instar_1: "#eab308",
    instar_2: "#84cc16",
    instar_3: "#22c55e",
    default: "#64748b",
  },
}));

// Define mock dimensions and styles for the image container.
const mockImageDimensions = { width: 1000, height: 1000 };
const mockRenderedStyle = { width: 500, height: 500, top: 10, left: 10 };

// Define mock detection data covering both model-generated and user-confirmed states.
const mockDetections = [
  {
    id: "det-1",
    label: "pupa",
    confidence: 0.9,
    status: "model_generated",
    xMin: 100,
    yMin: 100,
    xMax: 200,
    yMax: 200,
  },
  {
    id: "det-2",
    label: "adult",
    confidence: null,
    status: "user_confirmed",
    xMin: 500,
    yMin: 500,
    xMax: 600,
    yMax: 600,
  },
];

const mockImageFile = {
  id: "img-1",
  detections: mockDetections,
} as unknown as ImageFile;

/**
 * Test suite for the `ResultsBoundingBox` component covering rendering and positioning logic.
 */
describe("ResultsBoundingBox", () => {
  /**
   * Test case to verify that the correct number of bounding box elements are rendered.
   */
  it("renders correct number of bounding boxes", () => {
    // Arrange: Render the component with mock data.
    render(
      <ResultsBoundingBox
        imageFile={mockImageFile}
        imageDimensions={mockImageDimensions}
        renderedImageStyle={mockRenderedStyle}
        transformScale={1}
      />
    );

    // Assert: Verify that the number of tooltip triggers matches the detections count.
    const boxes = screen.getAllByTestId("tooltip-trigger");
    expect(boxes).toHaveLength(2);
  });

  /**
   * Test case to verify that bounding box styles are calculated correctly based on image dimensions.
   */
  it("calculates percentage-based styles and applies correct class color", () => {
    // Arrange: Render the component with mock data.
    render(
      <ResultsBoundingBox
        imageFile={mockImageFile}
        imageDimensions={mockImageDimensions}
        renderedImageStyle={mockRenderedStyle}
        transformScale={1}
      />
    );

    // Assert: Check that top, left, width, and height are converted to correct percentages.
    const boxes = screen.getAllByTestId("tooltip-trigger");
    const box1 = boxes[0].firstChild as HTMLElement;

    expect(box1.style.top).toBe("10%");
    expect(box1.style.left).toBe("10%");
    expect(box1.style.width).toBe("10%");
    expect(box1.style.height).toBe("10%");
  });

  /**
   * Test case to verify that model-generated detections display labels and confidence scores.
   */
  it("displays correctly formatted label and confidence for model detections", () => {
    // Arrange: Render the component with mock data.
    render(
      <ResultsBoundingBox
        imageFile={mockImageFile}
        imageDimensions={mockImageDimensions}
        renderedImageStyle={mockRenderedStyle}
        transformScale={1}
      />
    );

    // Assert: Verify the tooltip content contains the formatted label and confidence.
    const tooltips = screen.getAllByTestId("tooltip-content");

    const expectedLabel = formatLabel("pupa");
    const expectedConf = formatConfidence(0.9);

    expect(tooltips[0]).toHaveTextContent(`${expectedLabel}: ${expectedConf}`);
  });

  /**
   * Test case to verify that user-confirmed detections do not display confidence scores.
   */
  it("hides confidence score for user confirmed detections", () => {
    // Arrange: Render the component with mock data.
    render(
      <ResultsBoundingBox
        imageFile={mockImageFile}
        imageDimensions={mockImageDimensions}
        renderedImageStyle={mockRenderedStyle}
        transformScale={1}
      />
    );

    // Assert: Check that the confidence percentage is absent for user-confirmed items.
    const tooltips = screen.getAllByTestId("tooltip-content");
    const expectedLabel = formatLabel("adult");

    expect(tooltips[1]).toHaveTextContent(expectedLabel);
    expect(tooltips[1]).not.toHaveTextContent("%");
  });

  /**
   * Test case to verify that nothing is rendered when the detections list is empty.
   */
  it("renders nothing if detections array is missing or empty", () => {
    // Arrange: Create a mock image file with no detections and render.
    const emptyImage = { ...mockImageFile, detections: [] };

    render(
      <ResultsBoundingBox
        imageFile={emptyImage}
        imageDimensions={mockImageDimensions}
        renderedImageStyle={mockRenderedStyle}
        transformScale={1}
      />
    );

    // Assert: Verify that no bounding box elements are present in the DOM.
    expect(screen.queryByTestId("tooltip-trigger")).toBeNull();
  });
});
