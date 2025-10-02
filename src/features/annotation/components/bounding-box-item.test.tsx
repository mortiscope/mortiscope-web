import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BoundingBoxItem } from "@/features/annotation/components/bounding-box-item";
import { type Detection } from "@/features/annotation/hooks/use-editor-image";
import { eventCoordinates } from "@/features/annotation/utils/event-coordinates";
import { useIsMobile } from "@/hooks/use-mobile";

// Mock the tooltip components to simplify the DOM structure for easier querying in tests.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="tooltip" data-open={open}>
      {children}
    </div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// Mock the resize handles to isolate the testing of the bounding box item itself.
vi.mock("@/features/annotation/components/bounding-box-handles", () => ({
  BoundingBoxHandles: () => <div data-testid="bounding-box-handles" />,
}));

// Mock the coordinate utility to control return values during drag and touch simulations.
vi.mock("@/features/annotation/utils/event-coordinates", () => ({
  eventCoordinates: vi.fn(),
}));

// Mock the mobile detection hook to toggle between desktop and touch interaction logic.
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(),
}));

// Mock library utilities to ensure predictable formatting of labels and colors.
vi.mock("@/lib/utils", () => ({
  formatConfidence: (val: number) => `${val * 100}%`,
  formatLabel: (val: string) => val.toUpperCase(),
  getColorForClass: () => "#ff0000",
}));

/**
 * Test suite for the `BoundingBoxItem` component.
 */
describe("BoundingBoxItem", () => {
  // Mock detection object containing spatial and metadata properties.
  const mockDetection = {
    id: "det-1",
    label: "test_label",
    confidence: 0.9,
    xMin: 10,
    yMin: 10,
    xMax: 60,
    yMax: 60,
    status: "model_generated",
  } as unknown as Detection;

  const mockImageDimensions = { width: 100, height: 100 };
  const mockEventCoords = { clientX: 100, clientY: 100 };

  // Set up standard properties to be used across test cases.
  const defaultProps = {
    detection: mockDetection,
    isSelected: false,
    isLocked: false,
    isResizing: false,
    borderWidth: 2,
    imageDimensions: mockImageDimensions,
    transformScale: 1,
    showTooltip: false,
    onSelect: vi.fn(),
    onOpenPanel: vi.fn(),
    onStartDrag: vi.fn(),
    onStartResize: vi.fn(),
  };

  // Prepare the test environment and fake timers for double-tap logic.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(useIsMobile).mockReturnValue(false);
    vi.mocked(eventCoordinates).mockReturnValue(mockEventCoords);
  });

  // Restore real timers after each test to prevent side effects.
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Test case to verify the component computes correct percentage-based CSS styles.
   */
  it("renders correctly with calculated styles", () => {
    // Arrange: Render the bounding box within its trigger wrapper.
    render(<BoundingBoxItem {...defaultProps} />);

    // Act: Access the inner box element.
    const box = screen.getByTestId("tooltip-trigger").firstElementChild;

    // Assert: Verify coordinates and custom boxShadow styling for high-definition borders.
    expect(box).toHaveStyle({
      left: "10%",
      top: "10%",
      width: "50%",
      height: "50%",
      boxShadow: "inset 0 0 0 calc(2px / var(--zoom-scale, 1)) #ff0000",
    });
  });

  /**
   * Test case to verify that the tooltip displays formatted labels and confidence scores.
   */
  it("renders tooltip content correctly", () => {
    // Arrange: Render the component with `showTooltip` enabled.
    render(<BoundingBoxItem {...defaultProps} showTooltip={true} />);

    // Assert: Check for formatted text combining the label and confidence percentage.
    expect(screen.getByText("TEST_LABEL: 90%")).toBeInTheDocument();
  });

  /**
   * Test case to ensure resize handles are hidden when the item is not active.
   */
  it("does not render resize handles when not selected", () => {
    // Arrange: Render in a non-selected state.
    render(<BoundingBoxItem {...defaultProps} isSelected={false} />);

    // Assert: Confirm the handles component is absent.
    expect(screen.queryByTestId("bounding-box-handles")).not.toBeInTheDocument();
  });

  /**
   * Test case to ensure resize handles are visible when the item is active.
   */
  it("renders resize handles when selected", () => {
    // Arrange: Render in a selected state.
    render(<BoundingBoxItem {...defaultProps} isSelected={true} />);

    // Assert: Confirm the handles component is present.
    expect(screen.getByTestId("bounding-box-handles")).toBeInTheDocument();
  });

  /**
   * Group of tests focusing on standard mouse-based interactions.
   */
  describe("Desktop Interactions", () => {
    beforeEach(() => {
      vi.mocked(useIsMobile).mockReturnValue(false);
    });

    /**
     * Test case to verify that a mouse click triggers the selection callback.
     */
    it("handles click to select (and open panel)", () => {
      // Arrange: Render the component.
      render(<BoundingBoxItem {...defaultProps} />);
      const box = screen.getByTestId("tooltip-trigger").firstElementChild!;

      // Act: Simulate a desktop mouse click.
      fireEvent.click(box);

      // Assert: Verify `onSelect` was called with the correct ID and panel flag.
      expect(defaultProps.onSelect).toHaveBeenCalledWith("det-1", true);
    });

    /**
     * Test case to ensure locked items ignore selection attempts.
     */
    it("does not handle click when locked", () => {
      // Arrange: Render with the `isLocked` prop set to true.
      render(<BoundingBoxItem {...defaultProps} isLocked={true} />);
      const box = screen.getByTestId("tooltip-trigger").firstElementChild!;

      // Act: Simulate a mouse click.
      fireEvent.click(box);

      // Assert: Verify that selection callback was not triggered.
      expect(defaultProps.onSelect).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that selected items can initiate a drag operation.
     */
    it("initiates drag on mouse down if selected", () => {
      // Arrange: Render a selected component.
      render(<BoundingBoxItem {...defaultProps} isSelected={true} />);
      const box = screen.getByTestId("tooltip-trigger").firstElementChild!;

      // Act: Simulate mouse down to start dragging.
      fireEvent.mouseDown(box);

      // Assert: Verify coordinates were captured and `onStartDrag` was triggered.
      expect(eventCoordinates).toHaveBeenCalled();
      expect(defaultProps.onStartDrag).toHaveBeenCalledWith("det-1", 100, 100);
    });

    /**
     * Test case to ensure unselected items cannot be dragged immediately.
     */
    it("does not initiate drag on mouse down if not selected", () => {
      // Arrange: Render an unselected component.
      render(<BoundingBoxItem {...defaultProps} isSelected={false} />);
      const box = screen.getByTestId("tooltip-trigger").firstElementChild!;

      // Act: Simulate mouse down.
      fireEvent.mouseDown(box);

      // Assert: Verify that the drag callback was not executed.
      expect(defaultProps.onStartDrag).not.toHaveBeenCalled();
    });
  });

  /**
   * Group of tests focusing on touch-based interactions and mobile gestures.
   */
  describe("Mobile Interactions", () => {
    beforeEach(() => {
      vi.mocked(useIsMobile).mockReturnValue(true);
    });

    /**
     * Test case to verify that a single tap selects the item without opening the side panel.
     */
    it("handles single tap to select (without opening panel)", () => {
      // Arrange: Render the component in mobile mode.
      render(<BoundingBoxItem {...defaultProps} />);
      const box = screen.getByTestId("tooltip-trigger").firstElementChild!;

      // Act: Simulate a single touch end event.
      fireEvent.touchEnd(box);

      // Assert: Check that selection occurred but panel opening was skipped.
      expect(defaultProps.onSelect).toHaveBeenCalledWith("det-1", false);
      expect(defaultProps.onOpenPanel).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that two rapid taps trigger the panel opening callback.
     */
    it("handles double tap to open panel", () => {
      // Arrange: Render the component.
      render(<BoundingBoxItem {...defaultProps} />);
      const box = screen.getByTestId("tooltip-trigger").firstElementChild!;

      // Act: Trigger first tap, advance time within the threshold, then trigger second tap.
      fireEvent.touchEnd(box);
      expect(defaultProps.onSelect).toHaveBeenCalledWith("det-1", false);
      vi.advanceTimersByTime(100);
      fireEvent.touchEnd(box);

      // Assert: Verify the panel opening callback was executed.
      expect(defaultProps.onOpenPanel).toHaveBeenCalled();
    });

    /**
     * Test case to ensure taps occurring after the timeout are treated as separate single taps.
     */
    it("does not trigger double tap if taps are too far apart", () => {
      // Arrange: Render the component.
      render(<BoundingBoxItem {...defaultProps} />);
      const box = screen.getByTestId("tooltip-trigger").firstElementChild!;

      // Act: Trigger two taps separated by more than 300ms.
      fireEvent.touchEnd(box);
      vi.advanceTimersByTime(350);
      fireEvent.touchEnd(box);

      // Assert: Verify two separate selection calls were made but no panel opened.
      expect(defaultProps.onSelect).toHaveBeenCalledTimes(2);
      expect(defaultProps.onOpenPanel).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify the logic that prevents secondary mouse events after a touch interaction.
     */
    it("prevents ghost clicks after touch interaction", () => {
      // Arrange: Render the component.
      render(<BoundingBoxItem {...defaultProps} />);
      const box = screen.getByTestId("tooltip-trigger").firstElementChild!;

      // Act: Simulate a touch event followed immediately by a click event.
      fireEvent.touchEnd(box);
      fireEvent.click(box);

      // Assert: Ensure only the initial touch interaction triggered a selection.
      expect(defaultProps.onSelect).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Group of tests ensuring event isolation from parent containers.
   */
  describe("Mouse/Touch Event Propagation", () => {
    /**
     * Test case to verify that clicking a box doesn't trigger parent click listeners.
     */
    it("stops propagation on click", () => {
      // Arrange: Wrap the item in a parent with a click listener.
      const parentClick = vi.fn();
      render(
        <div onClick={parentClick}>
          <BoundingBoxItem {...defaultProps} />
        </div>
      );
      const box = screen.getByTestId("tooltip-trigger").firstElementChild!;

      // Act: Click the bounding box.
      fireEvent.click(box);

      // Assert: Check that the parent listener was not called.
      expect(parentClick).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that dragging doesn't bubble up to parent containers.
     */
    it("stops propagation on drag start (mouse down)", () => {
      // Arrange: Wrap the item in a parent with a mouse down listener.
      const parentMouseDown = vi.fn();
      render(
        <div onMouseDown={parentMouseDown}>
          <BoundingBoxItem {...defaultProps} isSelected={true} />
        </div>
      );
      const box = screen.getByTestId("tooltip-trigger").firstElementChild!;

      // Act: Initiate a drag via mouse down.
      fireEvent.mouseDown(box);

      // Assert: Verify the event propagation was halted.
      expect(parentMouseDown).not.toHaveBeenCalled();
    });
  });

  /**
   * Group of tests checking conditional logic for tooltip text.
   */
  describe("Tooltip Content Variations", () => {
    /**
     * Test case to verify confidence scores are hidden for manually confirmed detections.
     */
    it("shows only label for user_confirmed status", () => {
      // Arrange: Create a detection with a confirmed status.
      const confirmedDetection = { ...mockDetection, status: "user_confirmed" };
      render(
        <BoundingBoxItem
          {...defaultProps}
          detection={confirmedDetection as unknown as Detection}
          showTooltip={true}
        />
      );

      // Assert: Ensure the label is present but the confidence score is hidden.
      expect(screen.getByText("TEST_LABEL")).toBeInTheDocument();
      expect(screen.queryByText(/90%/)).not.toBeInTheDocument();
    });

    /**
     * Test case to verify confidence scores are hidden for edited and confirmed detections.
     */
    it("shows only label for user_edited_confirmed status", () => {
      // Arrange: Create a detection with an edited and confirmed status.
      const editedDetection = { ...mockDetection, status: "user_edited_confirmed" };
      render(
        <BoundingBoxItem
          {...defaultProps}
          detection={editedDetection as unknown as Detection}
          showTooltip={true}
        />
      );

      // Assert: Confirm only the label is rendered.
      expect(screen.getByText("TEST_LABEL")).toBeInTheDocument();
    });

    /**
     * Test case to verify formatting when the confidence value is missing from the data.
     */
    it("shows only label when confidence is null", () => {
      // Arrange: Create a detection with a null confidence property.
      const noConfDetection = { ...mockDetection, confidence: null };
      render(
        <BoundingBoxItem
          {...defaultProps}
          detection={noConfDetection as unknown as Detection}
          showTooltip={true}
        />
      );

      // Assert: Confirm the label still renders correctly without a score.
      expect(screen.getByText("TEST_LABEL")).toBeInTheDocument();
    });
  });

  /**
   * Group of tests ensuring interaction blocks when the component is locked.
   */
  describe("Locked State Interactions", () => {
    /**
     * Test case to verify touch interaction is blocked in locked mode.
     */
    it("does not trigger touch events when locked", () => {
      // Arrange: Render a locked component.
      render(<BoundingBoxItem {...defaultProps} isLocked={true} />);
      const box = screen.getByTestId("tooltip-trigger").firstElementChild!;

      // Act: Attempt a touch gesture.
      fireEvent.touchEnd(box);

      // Assert: Verify no selection or panel callbacks were executed.
      expect(defaultProps.onSelect).not.toHaveBeenCalled();
      expect(defaultProps.onOpenPanel).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify mouse interaction is blocked in locked mode.
     */
    it("does not trigger pointer down events when locked", () => {
      // Arrange: Render a locked and selected component.
      render(<BoundingBoxItem {...defaultProps} isLocked={true} isSelected={true} />);
      const box = screen.getByTestId("tooltip-trigger").firstElementChild!;

      // Act: Attempt to initiate a drag.
      fireEvent.mouseDown(box);

      // Assert: Verify the drag start callback was not executed.
      expect(defaultProps.onStartDrag).not.toHaveBeenCalled();
    });
  });
});
