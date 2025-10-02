import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { render } from "@/__tests__/setup/test-utils";
import { EditorDetectionPanel } from "@/features/annotation/components/editor-detection-panel";
import { useDetectionPanel } from "@/features/annotation/hooks/use-detection-panel";

// Mock the hook responsible for managing the state and visibility of the detection details panel.
vi.mock("@/features/annotation/hooks/use-detection-panel");

// Mock the nested content component to isolate the panel container logic from detection property rendering.
vi.mock("@/features/annotation/components/detection-panel-content", () => ({
  DetectionPanelContent: () => <div data-testid="detection-panel-content">Content</div>,
}));

// Mock framer-motion to track animation properties as data attributes without executing actual CSS transitions.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      style,
      className,
      animate,
      ...props
    }: React.ComponentProps<"div"> & { animate?: unknown }) => (
      <div
        data-testid="motion-div"
        data-animate={JSON.stringify(animate)}
        style={style}
        className={className}
        {...props}
      >
        {children}
      </div>
    ),
  },
}));

// Mock the UI Card components to simplify assertions on desktop layout structure.
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className, style }: React.ComponentProps<"div">) => (
    <div data-testid="card" className={className} style={style}>
      {children}
    </div>
  ),
  CardHeader: ({ children }: React.ComponentProps<"div">) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: React.ComponentProps<"div">) => (
    <div data-testid="card-title">{children}</div>
  ),
  CardContent: ({ children }: React.ComponentProps<"div">) => (
    <div data-testid="card-content">{children}</div>
  ),
}));

// Mock the UI Sheet components to simulate mobile-specific bottom-sheet behavior and transitions.
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="sheet" data-open={open}>
      {open && (
        <div data-testid="sheet-open-indicator">
          <button data-testid="close-sheet" onClick={() => onOpenChange(false)}>
            Close
          </button>
          <button data-testid="reopen-sheet" onClick={() => onOpenChange(true)}>
            Reopen
          </button>
          {children}
        </div>
      )}
    </div>
  ),
  SheetContent: ({ children }: React.ComponentProps<"div">) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: React.ComponentProps<"div">) => (
    <div data-testid="sheet-header">{children}</div>
  ),
  SheetTitle: ({ children }: React.ComponentProps<"div">) => (
    <div data-testid="sheet-title">{children}</div>
  ),
  SheetDescription: ({ children }: React.ComponentProps<"div">) => (
    <div data-testid="sheet-description">{children}</div>
  ),
}));

/**
 * Test suite for the `EditorDetectionPanel` component.
 */
describe("EditorDetectionPanel", () => {
  const mockHandleClose = vi.fn();

  // Reset mocks and initialize the detection panel hook with default open values before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useDetectionPanel).mockReturnValue({
      selectedDetectionId: "det-1",
      isPanelOpen: true,
      handleClose: mockHandleClose,
    } as unknown as ReturnType<typeof useDetectionPanel>);
  });

  /**
   * Groups tests related to the floating card layout used on larger screens.
   */
  describe("Desktop View", () => {
    /**
     * Test case to verify that the Card-based UI is rendered when not on mobile.
     */
    it("renders the floating Card layout by default", () => {
      // Arrange: Render the panel with the `isMobile` flag set to false.
      render(<EditorDetectionPanel isMobile={false} />);

      // Assert: Verify that the desktop-specific card elements and content are present.
      expect(screen.getByTestId("motion-div")).toBeInTheDocument();
      expect(screen.getByTestId("card")).toBeInTheDocument();
      expect(screen.getByTestId("card-title")).toHaveTextContent("Detection Details");
      expect(screen.getByTestId("detection-panel-content")).toBeInTheDocument();

      // Assert: Verify that the mobile Sheet is not rendered.
      expect(screen.queryByTestId("sheet")).not.toBeInTheDocument();
    });

    /**
     * Test case to verify that the panel shifts its position to avoid overlapping with an open sidebar.
     */
    it("adjusts horizontal position when sidebar panel is open", () => {
      // Arrange: Render the panel with the `hasOpenPanel` flag set to true.
      render(<EditorDetectionPanel isMobile={false} hasOpenPanel={true} />);

      // Act: Retrieve the motion animation properties from the rendered element.
      const motionDiv = screen.getByTestId("motion-div");
      const animateProp = JSON.parse(motionDiv.getAttribute("data-animate") || "{}");

      // Assert: Ensure the `x` coordinate is shifted by the expected sidebar width.
      expect(animateProp.x).toBe(256);
    });

    /**
     * Test case to ensure the panel stays at its default position when the sidebar is closed.
     */
    it("uses default horizontal position when sidebar panel is closed", () => {
      // Arrange: Render the panel with the `hasOpenPanel` flag set to false.
      render(<EditorDetectionPanel isMobile={false} hasOpenPanel={false} />);

      // Act: Retrieve the motion animation properties.
      const motionDiv = screen.getByTestId("motion-div");
      const animateProp = JSON.parse(motionDiv.getAttribute("data-animate") || "{}");

      // Assert: Ensure the `x` coordinate remains at the origin.
      expect(animateProp.x).toBe(0);
    });
  });

  /**
   * Groups tests related to the slide-up Sheet layout used on smaller screens.
   */
  describe("Mobile View", () => {
    /**
     * Test case to verify that the Sheet-based UI is used when the mobile environment is detected.
     */
    it("renders the Sheet layout when isMobile is true", () => {
      // Arrange: Render the panel with the `isMobile` flag set to true.
      render(<EditorDetectionPanel isMobile={true} />);

      // Assert: Verify the presence of Sheet elements and the absence of the desktop Card.
      expect(screen.getByTestId("sheet")).toBeInTheDocument();
      expect(screen.getByTestId("sheet-open-indicator")).toBeInTheDocument();
      expect(screen.getByTestId("sheet-content")).toBeInTheDocument();
      expect(screen.getByTestId("detection-panel-content")).toBeInTheDocument();

      expect(screen.queryByTestId("card")).not.toBeInTheDocument();
    });

    /**
     * Test case to ensure the Sheet visibility is linked to the state provided by the detection hook.
     */
    it("controls Sheet open state based on hook values", () => {
      // Arrange: Render the component.
      render(<EditorDetectionPanel isMobile={true} />);

      // Assert: Verify that the `data-open` attribute correctly reflects the `isPanelOpen` state.
      const sheet = screen.getByTestId("sheet");
      expect(sheet).toHaveAttribute("data-open", "true");
    });

    /**
     * Test case to verify the Sheet is forced closed when no specific detection is selected.
     */
    it("closes Sheet if detection ID is missing", () => {
      // Arrange: Mock the hook to return a null `selectedDetectionId`.
      vi.mocked(useDetectionPanel).mockReturnValue({
        selectedDetectionId: null,
        isPanelOpen: true,
        handleClose: mockHandleClose,
      } as unknown as ReturnType<typeof useDetectionPanel>);

      render(<EditorDetectionPanel isMobile={true} />);

      // Assert: Ensure the Sheet reports a closed state and hides its internal indicators.
      const sheet = screen.getByTestId("sheet");
      expect(sheet).toHaveAttribute("data-open", "false");
      expect(screen.queryByTestId("sheet-open-indicator")).not.toBeInTheDocument();
    });

    /**
     * Test case to verify the Sheet is forced closed when the panel visibility state is explicitly false.
     */
    it("closes Sheet if isPanelOpen is false", () => {
      // Arrange: Mock the hook with `isPanelOpen` set to false.
      vi.mocked(useDetectionPanel).mockReturnValue({
        selectedDetectionId: "det-1",
        isPanelOpen: false,
        handleClose: mockHandleClose,
      } as unknown as ReturnType<typeof useDetectionPanel>);

      render(<EditorDetectionPanel isMobile={true} />);

      // Assert: Verify the open attribute is set to false.
      const sheet = screen.getByTestId("sheet");
      expect(sheet).toHaveAttribute("data-open", "false");
    });

    /**
     * Test case to verify that dismissing the Sheet correctly triggers the cleanup logic in the hook.
     */
    it("calls handleClose when Sheet is closed", () => {
      // Arrange: Render the mobile panel.
      render(<EditorDetectionPanel isMobile={true} />);

      // Act: Simulate the user closing the bottom sheet.
      fireEvent.click(screen.getByTestId("close-sheet"));

      // Assert: Ensure the `handleClose` callback was executed.
      expect(mockHandleClose).toHaveBeenCalledTimes(1);
    });

    /**
     * Test case to ensure that opening the Sheet does not accidentally trigger the closure logic.
     */
    it("does not call handleClose when Sheet triggers open (swiping up or other interactions)", () => {
      // Arrange: Render the mobile panel.
      render(<EditorDetectionPanel isMobile={true} />);

      // Act: Simulate an interaction that keeps or sets the sheet to open.
      fireEvent.click(screen.getByTestId("reopen-sheet"));

      // Assert: Verify the close handler was not called.
      expect(mockHandleClose).not.toHaveBeenCalled();
    });
  });
});
