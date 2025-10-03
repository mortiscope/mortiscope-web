import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render } from "@/__tests__/setup/test-utils";
import { EditorToolbar } from "@/features/annotation/components/editor-toolbar";
import { ToolbarHistoryButtons } from "@/features/annotation/components/toolbar-history-buttons";
import { ToolbarModeButtons } from "@/features/annotation/components/toolbar-mode-buttons";
import { ToolbarViewButtons } from "@/features/annotation/components/toolbar-view-buttons";
import { useEditorImage } from "@/features/annotation/hooks/use-editor-image";
import { useEditorToolbar } from "@/features/annotation/hooks/use-editor-toolbar";

// Mock the hook providing image metadata to the toolbar.
vi.mock("@/features/annotation/hooks/use-editor-image", () => ({
  useEditorImage: vi.fn(),
}));

// Mock the main toolbar logic hook to control UI states like undo/redo and active modes.
vi.mock("@/features/annotation/hooks/use-editor-toolbar", () => ({
  useEditorToolbar: vi.fn(),
}));

// Mock the component responsible for switching between pan, select, and draw modes.
vi.mock("@/features/annotation/components/toolbar-mode-buttons", () => ({
  ToolbarModeButtons: vi.fn(() => <div data-testid="toolbar-mode-buttons" />),
}));

// Mock the component responsible for zoom and view controls.
vi.mock("@/features/annotation/components/toolbar-view-buttons", () => ({
  ToolbarViewButtons: vi.fn(() => <div data-testid="toolbar-view-buttons" />),
}));

// Mock the component responsible for undo, redo, and reset actions.
vi.mock("@/features/annotation/components/toolbar-history-buttons", () => ({
  ToolbarHistoryButtons: vi.fn(({ onResetChanges }) => (
    <div data-testid="toolbar-history-buttons">
      <button onClick={onResetChanges} data-testid="trigger-reset">
        Trigger Reset
      </button>
    </div>
  )),
}));

// Mock UI separators for structural verification.
vi.mock("@/components/ui/separator", () => ({
  Separator: () => <div data-testid="separator" />,
}));

// Mock the modal for confirming state resets.
vi.mock("@/features/annotation/components/reset-changes-modal", () => ({
  ResetChangesModal: () => <div data-testid="real-reset-modal-mock" />,
}));

// Mock dynamic imports to facilitate testing of the lazy-loaded reset modal.
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ ResetChangesModal: React.ComponentType<unknown> }>) => {
    loader().then((mod) => mod.ResetChangesModal);

    const MockDynamicComponent = (props: unknown) => (
      <div data-testid="mock-reset-modal" data-props={JSON.stringify(props)} />
    );
    MockDynamicComponent.displayName = "MockDynamicComponent";
    return MockDynamicComponent;
  },
}));

/**
 * Test suite for the `EditorToolbar` component.
 */
describe("EditorToolbar", () => {
  // Define mock functions for tracking toolbar interactions and state changes.
  const mockSetIsResetModalOpen = vi.fn();
  const mockClearSelection = vi.fn();
  const mockSetDrawMode = vi.fn();
  const mockSetSelectMode = vi.fn();
  const mockUndo = vi.fn();
  const mockRedo = vi.fn();

  // Define a default mock image for use in tests.
  const mockImage = {
    id: "img-1",
    name: "image.jpg",
    url: "/images/image.jpg",
    size: 1024,
    dateUploaded: new Date(),
  };

  // Define default values for the toolbar logic state.
  const defaultToolbarState = {
    isResetModalOpen: false,
    setIsResetModalOpen: mockSetIsResetModalOpen,
    isPanActive: true,
    isSelectActive: false,
    isDrawActive: false,
    isLocked: false,
    clearSelection: mockClearSelection,
    setDrawMode: mockSetDrawMode,
    setSelectMode: mockSetSelectMode,
    drawMode: false,
    canUndo: false,
    canRedo: false,
    hasChanges: false,
    undo: mockUndo,
    redo: mockRedo,
  };

  // Define default props for the EditorToolbar component.
  const defaultProps = {
    hasOpenPanel: false,
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onCenterView: vi.fn(),
    onResetView: vi.fn(),
    isMinimapEnabled: false,
    onToggleMinimap: vi.fn(),
  };

  // Reset mocks and setup default hook returns before each individual test.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useEditorImage).mockReturnValue({
      image: mockImage,
      isLoading: false,
    });

    vi.mocked(useEditorToolbar).mockReturnValue(defaultToolbarState);
  });

  /**
   * Test case to verify that the main toolbar container and its sub-sections render.
   */
  it("renders the toolbar container and sections", () => {
    // Arrange: Render the toolbar component.
    render(<EditorToolbar {...defaultProps} />);

    // Assert: Check for the presence of sub-components and structural elements.
    expect(screen.getByTestId("toolbar-mode-buttons")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-view-buttons")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-history-buttons")).toBeInTheDocument();
    expect(screen.getAllByTestId("separator")).toHaveLength(2);
    expect(screen.getByTestId("mock-reset-modal")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the useEditorToolbar hook receives correct configuration props.
   */
  it("initializes useEditorToolbar with correct props", () => {
    // Arrange: Render the toolbar component.
    render(<EditorToolbar {...defaultProps} />);

    // Assert: Verify that zoom and view callbacks were passed to the logic hook.
    expect(useEditorToolbar).toHaveBeenCalledWith({
      onZoomIn: defaultProps.onZoomIn,
      onZoomOut: defaultProps.onZoomOut,
      onCenterView: defaultProps.onCenterView,
      onResetView: defaultProps.onResetView,
      onToggleMinimap: defaultProps.onToggleMinimap,
    });
  });

  /**
   * Test case to verify that interaction mode props are passed correctly to mode buttons.
   */
  it("passes correct props to ToolbarModeButtons", () => {
    // Arrange: Mock a specific UI state where select mode and lock are active.
    const mockState = {
      ...defaultToolbarState,
      isPanActive: false,
      isSelectActive: true,
      drawMode: true,
      isLocked: true,
    };
    vi.mocked(useEditorToolbar).mockReturnValue(mockState);

    render(<EditorToolbar {...defaultProps} />);

    // Assert: Verify the mode buttons received the specific state and handler flags.
    expect(ToolbarModeButtons).toHaveBeenCalledWith(
      expect.objectContaining({
        isPanActive: false,
        isSelectActive: true,
        isDrawActive: false,
        isLocked: true,
        drawMode: true,
        onClearSelection: mockClearSelection,
        onSetDrawMode: mockSetDrawMode,
        onSetSelectMode: mockSetSelectMode,
      }),
      undefined
    );
  });

  /**
   * Test case to verify that view control props are passed correctly to view buttons.
   */
  it("passes correct props to ToolbarViewButtons", () => {
    // Arrange: Render toolbar with minimap enabled.
    render(<EditorToolbar {...defaultProps} isMinimapEnabled={true} />);

    // Assert: Verify view buttons received zoom handlers and the minimap flag.
    expect(ToolbarViewButtons).toHaveBeenCalledWith(
      expect.objectContaining({
        onZoomIn: defaultProps.onZoomIn,
        onZoomOut: defaultProps.onZoomOut,
        onCenterView: defaultProps.onCenterView,
        onResetView: defaultProps.onResetView,
        isMinimapEnabled: true,
        onToggleMinimap: defaultProps.onToggleMinimap,
      }),
      undefined
    );
  });

  /**
   * Test case to verify that history state props are passed correctly to history buttons.
   */
  it("passes correct props to ToolbarHistoryButtons", () => {
    // Arrange: Mock a state where undo and redo are available.
    const mockState = {
      ...defaultToolbarState,
      canUndo: true,
      canRedo: true,
      hasChanges: true,
      isLocked: true,
    };
    vi.mocked(useEditorToolbar).mockReturnValue(mockState);

    render(<EditorToolbar {...defaultProps} />);

    // Assert: Verify history buttons received the correct undo/redo capabilities and handlers.
    expect(ToolbarHistoryButtons).toHaveBeenCalledWith(
      expect.objectContaining({
        canUndo: true,
        canRedo: true,
        hasChanges: true,
        isLocked: true,
        onUndo: mockUndo,
        onRedo: mockRedo,
        onResetChanges: expect.any(Function),
      }),
      undefined
    );
  });

  /**
   * Test case to verify that the reset modal receives correct state and image metadata.
   */
  it("passes correct props to ResetChangesModal", () => {
    // Arrange: Mock a state where the reset modal should be visible.
    vi.mocked(useEditorToolbar).mockReturnValue({
      ...defaultToolbarState,
      isResetModalOpen: true,
    });

    render(<EditorToolbar {...defaultProps} />);

    // Act: Extract the props passed to the dynamically mocked modal.
    const modal = screen.getByTestId("mock-reset-modal");
    const props = JSON.parse(modal.getAttribute("data-props") || "{}");

    // Assert: Verify the modal received the correct image name and visibility flag.
    expect(props).toEqual(
      expect.objectContaining({
        imageName: "image.jpg",
        isOpen: true,
      })
    );
  });

  /**
   * Test case to verify that the reset modal handles cases where image metadata is missing.
   */
  it("handles empty image name gracefully in ResetChangesModal", () => {
    // Arrange: Mock the image hook to return no image.
    vi.mocked(useEditorImage).mockReturnValue({
      image: null,
      isLoading: false,
    });

    render(<EditorToolbar {...defaultProps} />);

    // Act: Extract props from the modal.
    const modal = screen.getByTestId("mock-reset-modal");
    const props = JSON.parse(modal.getAttribute("data-props") || "{}");

    // Assert: Verify the image name passed to the modal is null.
    expect(props.imageName).toBeNull();
  });

  /**
   * Test case to verify that clicking the reset trigger opens the reset confirmation modal.
   */
  it("wires up the reset changes trigger correctly", () => {
    // Arrange: Render the toolbar.
    render(<EditorToolbar {...defaultProps} />);

    // Act: Click the reset button in the history section.
    fireEvent.click(screen.getByTestId("trigger-reset"));

    // Assert: Verify that the state setter for the reset modal was called.
    expect(mockSetIsResetModalOpen).toHaveBeenCalledWith(true);
  });
});
