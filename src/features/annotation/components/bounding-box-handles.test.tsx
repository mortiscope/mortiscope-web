import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BoundingBoxHandles } from "@/features/annotation/components/bounding-box-handles";
import { type Detection } from "@/features/annotation/hooks/use-editor-image";
import { eventCoordinates } from "@/features/annotation/utils/event-coordinates";

// Mock the coordinate utility to provide predictable cursor positions across different environment types.
vi.mock("@/features/annotation/utils/event-coordinates", () => ({
  eventCoordinates: vi.fn(),
}));

/**
 * Test suite for the `BoundingBoxHandles` component.
 */
describe("BoundingBoxHandles", () => {
  // Mock data representing a detected object with defined spatial boundaries.
  const mockDetection = {
    id: "det-1",
    label: "test-label",
    confidence: 0.9,
    box: { xMin: 10, yMin: 10, xMax: 100, yMax: 100 },
  } as unknown as Detection;

  // Mock function to capture the initiation of a resizing action.
  const mockOnStartResize = vi.fn();

  // Static coordinate values used to verify event handling logic.
  const mockEventCoords = { clientX: 123, clientY: 456 };

  // Reset mocks and establish a standard return value for coordinates before every test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(eventCoordinates).mockReturnValue(mockEventCoords);
  });

  /**
   * Test case to verify that all interaction points for corners and edges are present.
   */
  it("renders all 8 resize handles", () => {
    // Arrange: Render the handles component with a standard scale and border.
    const { container } = render(
      <BoundingBoxHandles
        detection={mockDetection}
        borderWidth={2}
        zoomScale={1}
        onStartResize={mockOnStartResize}
      />
    );

    // Assert: Check the DOM for the existence of eight distinct interactive handle elements.
    const handles = container.querySelectorAll('div[style*="cursor"]');
    expect(handles).toHaveLength(8);
  });

  /**
   * Test case to verify that the handle positioning logic accounts for border thickness.
   */
  it("calculates handle offset correctly", () => {
    // Arrange: Define the expected CSS offset based on the provided border width.
    const expectedOffset = "-10px";

    // Act: Render the handles with a specific border width of 4.
    const { container } = render(
      <BoundingBoxHandles
        detection={mockDetection}
        borderWidth={4}
        zoomScale={1}
        onStartResize={mockOnStartResize}
      />
    );

    // Assert: Verify that the top-left handle is positioned outside the box relative to the offset.
    const tlHandle = container.querySelector('div[style*="cursor: nw-resize"]');
    expect(tlHandle).toHaveStyle({ top: expectedOffset, left: expectedOffset });
  });

  /**
   * Test case to verify that mouse interactions trigger the resizing callback with the correct metadata.
   */
  it("calls onStartResize with correct arguments on mouse down", () => {
    // Arrange: Render the component and locate the top-left corner handle.
    const { container } = render(
      <BoundingBoxHandles
        detection={mockDetection}
        borderWidth={2}
        zoomScale={1}
        onStartResize={mockOnStartResize}
      />
    );

    const tlHandle = container.querySelector('div[style*="cursor: nw-resize"]');
    expect(tlHandle).toBeInTheDocument();

    // Act: Simulate a mouse press on the specific handle.
    if (tlHandle) {
      fireEvent.mouseDown(tlHandle);

      // Assert: Verify that the coordinates were extracted and the callback was triggered for the `tl` handle.
      expect(eventCoordinates).toHaveBeenCalled();
      expect(mockOnStartResize).toHaveBeenCalledWith(
        "tl",
        mockEventCoords.clientX,
        mockEventCoords.clientY,
        mockDetection
      );
    }
  });

  /**
   * Test case to verify that touch interactions trigger the resizing callback for mobile support.
   */
  it("calls onStartResize with correct arguments on touch start", () => {
    // Arrange: Render the component and locate the bottom-right corner handle.
    const { container } = render(
      <BoundingBoxHandles
        detection={mockDetection}
        borderWidth={2}
        zoomScale={1}
        onStartResize={mockOnStartResize}
      />
    );

    const brHandle = container.querySelector('div[style*="cursor: se-resize"]');
    expect(brHandle).toBeInTheDocument();

    // Act: Simulate a touch start event on the specific handle.
    if (brHandle) {
      fireEvent.touchStart(brHandle);

      // Assert: Verify that the coordinates were extracted and the callback was triggered for the `br` handle.
      expect(eventCoordinates).toHaveBeenCalled();
      expect(mockOnStartResize).toHaveBeenCalledWith(
        "br",
        mockEventCoords.clientX,
        mockEventCoords.clientY,
        mockDetection
      );
    }
  });

  /**
   * Test case to verify that interactions on a handle do not trigger parent container events.
   */
  it("stops event propagation on mouse down", () => {
    // Arrange: Create a parent spy and wrap the handles within a clickable parent div.
    const onParentMouseDown = vi.fn();
    const { container } = render(
      <div onMouseDown={onParentMouseDown}>
        <BoundingBoxHandles
          detection={mockDetection}
          borderWidth={2}
          zoomScale={1}
          onStartResize={mockOnStartResize}
        />
      </div>
    );

    const handle = container.querySelector('div[style*="cursor: nw-resize"]');
    expect(handle).toBeInTheDocument();

    // Act: Trigger a mouse event on the handle element.
    if (handle) {
      fireEvent.mouseDown(handle);

      // Assert: Ensure the event did not bubble up to the `onParentMouseDown` listener.
      expect(onParentMouseDown).not.toHaveBeenCalled();
    }
  });

  /**
   * Test case to verify that edge-specific handles trigger the correct resizing orientation.
   */
  it("handles edge resize interaction", () => {
    // Arrange: Render the component to access the top edge handle.
    const { container } = render(
      <BoundingBoxHandles
        detection={mockDetection}
        borderWidth={2}
        zoomScale={1}
        onStartResize={mockOnStartResize}
      />
    );

    const topHandle = container.querySelector('div[style*="cursor: n-resize"]');
    expect(topHandle).toBeInTheDocument();

    // Act: Simulate a mouse press on the top edge handle.
    if (topHandle) {
      fireEvent.mouseDown(topHandle);

      // Assert: Verify the callback was called for the `t` (top) edge orientation.
      expect(mockOnStartResize).toHaveBeenCalledWith(
        "t",
        mockEventCoords.clientX,
        mockEventCoords.clientY,
        mockDetection
      );
    }
  });
});
