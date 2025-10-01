import { act, renderHook } from "@testing-library/react";
import { useHotkeys } from "react-hotkeys-hook";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { useEditorToolbar } from "@/features/annotation/hooks/use-editor-toolbar";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";
import { KEYBOARD_SHORTCUTS } from "@/lib/constants";

// Mock the hotkeys hook to verify that keyboard shortcuts are correctly mapped to editor actions.
vi.mock("react-hotkeys-hook", () => ({
  useHotkeys: vi.fn(),
}));

// Mock the annotation store to control editor state and track toolbar-initiated side effects.
vi.mock("@/features/annotation/store/annotation-store", () => ({
  useAnnotationStore: vi.fn(),
}));

type ExtractState<T> = T extends (selector: (state: infer S) => unknown) => unknown ? S : never;
type AnnotationState = ExtractState<typeof useAnnotationStore>;

/**
 * Test suite for the `useEditorToolbar` hook which manages tool selection, view controls, and keyboard shortcuts.
 */
describe("useEditorToolbar", () => {
  const mockClearSelection = vi.fn();
  const mockSetDrawMode = vi.fn();
  const mockSetSelectMode = vi.fn();
  const mockSetDisplayFilter = vi.fn();
  const mockUndo = vi.fn();
  const mockRedo = vi.fn();
  const mockRemoveDetection = vi.fn();

  // Define a baseline store state to ensure consistent starting points for each test.
  const defaultStoreState = {
    selectedDetectionId: null,
    drawMode: false,
    selectMode: false,
    isLocked: false,
    canUndo: () => false,
    canRedo: () => false,
    hasChanges: () => false,
    clearSelection: mockClearSelection,
    setDrawMode: mockSetDrawMode,
    setSelectMode: mockSetSelectMode,
    setDisplayFilter: mockSetDisplayFilter,
    undo: mockUndo,
    redo: mockRedo,
    removeDetection: mockRemoveDetection,
  };

  // Reset all mocks and provide a default store implementation before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    (useAnnotationStore as unknown as Mock).mockImplementation(
      (selector: (state: AnnotationState) => unknown) => {
        return selector(defaultStoreState as unknown as AnnotationState);
      }
    );
  });

  /**
   * Helper utility to extract the handler function registered for a specific keyboard shortcut.
   */
  const getShortcutHandler = (key: string) => {
    const calls = (useHotkeys as unknown as Mock).mock.calls;
    const call = calls.find((args) => args[0] === key);
    return call ? call[1] : null;
  };

  /**
   * Verify that the toolbar initializes with the Pan tool active and modals closed.
   */
  it("initializes with default tool states", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useEditorToolbar({}));

    // Assert: Verify that Pan is active by default and interaction modes are disabled.
    expect(result.current.isPanActive).toBe(true);
    expect(result.current.isSelectActive).toBe(false);
    expect(result.current.isDrawActive).toBe(false);
    expect(result.current.isResetModalOpen).toBe(false);
  });

  /**
   * Verify that the hook correctly derives the Select tool's active status from the store.
   */
  it("correctly identifies Select Mode active state", () => {
    // Arrange: Mock the store to have Select Mode enabled.
    (useAnnotationStore as unknown as Mock).mockImplementation(
      (selector: (state: AnnotationState) => unknown) => {
        return selector({
          ...defaultStoreState,
          selectMode: true,
          drawMode: false,
        } as unknown as AnnotationState);
      }
    );

    // Act: Render the hook.
    const { result } = renderHook(() => useEditorToolbar({}));

    // Assert: Verify that Select is active and Pan is deactivated.
    expect(result.current.isPanActive).toBe(false);
    expect(result.current.isSelectActive).toBe(true);
    expect(result.current.isDrawActive).toBe(false);
  });

  /**
   * Verify that the hook correctly derives the Draw tool's active status from the store.
   */
  it("correctly identifies Draw Mode active state", () => {
    // Arrange: Mock the store to have Draw Mode enabled.
    (useAnnotationStore as unknown as Mock).mockImplementation(
      (selector: (state: AnnotationState) => unknown) => {
        return selector({
          ...defaultStoreState,
          selectMode: false,
          drawMode: true,
        } as unknown as AnnotationState);
      }
    );

    // Act: Render the hook.
    const { result } = renderHook(() => useEditorToolbar({}));

    // Assert: Verify that Draw is active and Pan is deactivated.
    expect(result.current.isPanActive).toBe(false);
    expect(result.current.isSelectActive).toBe(false);
    expect(result.current.isDrawActive).toBe(true);
  });

  /**
   * Group of tests covering keyboard shortcuts that toggle between different editor tools.
   */
  describe("Tool Keyboard Shortcuts", () => {
    /**
     * Verify that the Pan Mode shortcut clears selections and resets interaction modes.
     */
    it("activates Pan Mode via shortcut", () => {
      // Arrange: Find the handler for Pan Mode.
      renderHook(() => useEditorToolbar({}));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.PAN_MODE);

      // Act: Execute the shortcut handler.
      act(() => {
        handler();
      });

      // Assert: Verify store resets are called to enable panning.
      expect(mockClearSelection).toHaveBeenCalled();
      expect(mockSetDrawMode).toHaveBeenCalledWith(false);
      expect(mockSetSelectMode).toHaveBeenCalledWith(false);
    });

    /**
     * Verify that the Select Mode shortcut enables selection logic in the store.
     */
    it("activates Select Mode via shortcut", () => {
      // Arrange: Find the handler for Select Mode.
      renderHook(() => useEditorToolbar({}));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.SELECT_MODE);

      // Act: Execute the shortcut handler.
      act(() => {
        handler();
      });

      // Assert: Verify selection is cleared and select mode is explicitly enabled.
      expect(mockClearSelection).toHaveBeenCalled();
      expect(mockSetDrawMode).toHaveBeenCalledWith(false);
      expect(mockSetSelectMode).toHaveBeenCalledWith(true);
    });

    /**
     * Verify that the Draw Mode shortcut enables the creation of new annotations.
     */
    it("toggles Draw Mode via shortcut", () => {
      // Arrange: Find the handler for Draw Mode.
      renderHook(() => useEditorToolbar({}));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.DRAW_MODE);

      // Act: Execute the shortcut handler.
      act(() => {
        handler();
      });

      // Assert: Verify selection is cleared and draw mode is explicitly enabled.
      expect(mockClearSelection).toHaveBeenCalled();
      expect(mockSetSelectMode).toHaveBeenCalledWith(false);
      expect(mockSetDrawMode).toHaveBeenCalledWith(true);
    });
  });

  /**
   * Group of tests covering viewport adjustments and canvas navigation shortcuts.
   */
  describe("View Control Shortcuts", () => {
    const mockViewCallbacks = {
      onZoomIn: vi.fn(),
      onZoomOut: vi.fn(),
      onToggleMinimap: vi.fn(),
      onCenterView: vi.fn(),
      onResetView: vi.fn(),
    };

    /**
     * Verify that the Zoom In shortcut triggers the provided callback.
     */
    it("calls onZoomIn via shortcut", () => {
      // Arrange: Render with callbacks.
      renderHook(() => useEditorToolbar(mockViewCallbacks));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.ZOOM_IN);

      // Act: Trigger shortcut.
      act(() => handler());

      // Assert: Verify callback execution.
      expect(mockViewCallbacks.onZoomIn).toHaveBeenCalled();
    });

    /**
     * Verify that the Zoom Out shortcut triggers the provided callback.
     */
    it("calls onZoomOut via shortcut", () => {
      renderHook(() => useEditorToolbar(mockViewCallbacks));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.ZOOM_OUT);

      act(() => handler());
      expect(mockViewCallbacks.onZoomOut).toHaveBeenCalled();
    });

    /**
     * Verify that the Minimap toggle shortcut triggers the provided callback.
     */
    it("calls onToggleMinimap via shortcut", () => {
      renderHook(() => useEditorToolbar(mockViewCallbacks));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.TOGGLE_MINIMAP);

      act(() => handler());
      expect(mockViewCallbacks.onToggleMinimap).toHaveBeenCalled();
    });

    /**
     * Verify that the Center Focus shortcut triggers the provided callback.
     */
    it("calls onCenterView via shortcut", () => {
      renderHook(() => useEditorToolbar(mockViewCallbacks));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.CENTER_FOCUS);

      act(() => handler());
      expect(mockViewCallbacks.onCenterView).toHaveBeenCalled();
    });

    /**
     * Verify that the Reset View shortcut triggers the provided callback.
     */
    it("calls onResetView via shortcut", () => {
      renderHook(() => useEditorToolbar(mockViewCallbacks));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.RESET_VIEW);

      act(() => handler());
      expect(mockViewCallbacks.onResetView).toHaveBeenCalled();
    });
  });

  /**
   * Group of tests covering shortcuts for manipulating active selections.
   */
  describe("Selection & Deletion Shortcuts", () => {
    /**
     * Verify that the delete shortcut removes the active annotation from the store.
     */
    it("deletes selected detection if one is selected", () => {
      // Arrange: Mock a state where a specific detection is selected.
      (useAnnotationStore as unknown as Mock).mockImplementation(
        (selector: (state: AnnotationState) => unknown) => {
          return selector({
            ...defaultStoreState,
            selectedDetectionId: "det-1",
          } as unknown as AnnotationState);
        }
      );

      renderHook(() => useEditorToolbar({}));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.DELETE_SELECTED);

      // Act: Execute delete shortcut.
      act(() => handler());

      // Assert: Verify the removal action was called with the selected ID.
      expect(mockRemoveDetection).toHaveBeenCalledWith("det-1");
    });

    /**
     * Verify that the deselect shortcut clears the active selection in the store.
     */
    it("deselects current detection if one is selected", () => {
      // Arrange: Mock an active selection.
      (useAnnotationStore as unknown as Mock).mockImplementation(
        (selector: (state: AnnotationState) => unknown) => {
          return selector({
            ...defaultStoreState,
            selectedDetectionId: "det-1",
          } as unknown as AnnotationState);
        }
      );

      renderHook(() => useEditorToolbar({}));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.DESELECT);

      // Act: Execute deselect shortcut.
      act(() => handler());

      // Assert: Verify store selection was cleared.
      expect(mockClearSelection).toHaveBeenCalled();
    });

    /**
     * Ensure that the delete shortcut is ignored if no annotation is currently selected.
     */
    it("does nothing if no detection is selected for delete", () => {
      // Act: Execute delete shortcut with default null selection.
      renderHook(() => useEditorToolbar({}));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.DELETE_SELECTED);

      act(() => handler());

      // Assert: Verify no removal was attempted.
      expect(mockRemoveDetection).not.toHaveBeenCalled();
    });

    /**
     * Ensure that the deselect shortcut is ignored if no annotation is currently selected.
     */
    it("does nothing if no detection is selected for deselect", () => {
      // Act: Execute deselect shortcut with default null selection.
      renderHook(() => useEditorToolbar({}));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.DESELECT);

      act(() => handler());

      // Assert: Verify no clear action was attempted.
      expect(mockClearSelection).not.toHaveBeenCalled();
    });
  });

  /**
   * Group of tests covering history navigation (undo/redo) and reset functionality.
   */
  describe("History Shortcuts", () => {
    /**
     * Verify that the reset shortcut opens the confirmation modal if changes exist.
     */
    it("opens reset modal via shortcut", () => {
      // Arrange: Mock presence of unsaved changes.
      (useAnnotationStore as unknown as Mock).mockImplementation(
        (selector: (state: AnnotationState) => unknown) => {
          return selector({
            ...defaultStoreState,
            hasChanges: () => true,
          } as unknown as AnnotationState);
        }
      );
      const { result } = renderHook(() => useEditorToolbar({}));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.RESET_CHANGES);

      // Act: Execute reset shortcut.
      act(() => handler());

      // Assert: Verify modal visibility is toggled.
      expect(result.current.isResetModalOpen).toBe(true);
    });

    /**
     * Verify that the undo shortcut triggers the undo action in the store.
     */
    it("calls undo via shortcut", () => {
      // Arrange: Mock the availability of an undo history.
      (useAnnotationStore as unknown as Mock).mockImplementation(
        (selector: (state: AnnotationState) => unknown) => {
          return selector({
            ...defaultStoreState,
            canUndo: () => true,
          } as unknown as AnnotationState);
        }
      );
      renderHook(() => useEditorToolbar({}));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.UNDO);

      // Act: Execute undo shortcut.
      act(() => handler());

      // Assert: Verify undo logic was triggered.
      expect(mockUndo).toHaveBeenCalled();
    });

    /**
     * Verify that the redo shortcut triggers the redo action in the store.
     */
    it("calls redo via shortcut", () => {
      // Arrange: Mock the availability of a redo history.
      (useAnnotationStore as unknown as Mock).mockImplementation(
        (selector: (state: AnnotationState) => unknown) => {
          return selector({
            ...defaultStoreState,
            canRedo: () => true,
          } as unknown as AnnotationState);
        }
      );
      renderHook(() => useEditorToolbar({}));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.REDO);

      // Act: Execute redo shortcut.
      act(() => handler());

      // Assert: Verify redo logic was triggered.
      expect(mockRedo).toHaveBeenCalled();
    });
  });

  /**
   * Group of tests covering shortcuts that filter the visibility of annotations on the canvas.
   */
  describe("Display Filter Shortcuts", () => {
    /**
     * Verify that the shortcut sets the visibility filter to show all annotations.
     */
    it("sets filter to 'all'", () => {
      // Act: Trigger the shortcut for showing all items.
      renderHook(() => useEditorToolbar({}));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.SHOW_ALL_ANNOTATIONS);

      act(() => handler());

      // Assert: Verify store filter update.
      expect(mockSetDisplayFilter).toHaveBeenCalledWith("all");
    });

    /**
     * Verify that the shortcut sets the visibility filter to show only confirmed annotations.
     */
    it("sets filter to 'verified'", () => {
      // Act: Trigger the shortcut for showing verified items.
      renderHook(() => useEditorToolbar({}));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.SHOW_VERIFIED_ONLY);

      act(() => handler());

      // Assert: Verify store filter update.
      expect(mockSetDisplayFilter).toHaveBeenCalledWith("verified");
    });

    /**
     * Verify that the shortcut sets the visibility filter to show only unconfirmed annotations.
     */
    it("sets filter to 'unverified'", () => {
      // Act: Trigger the shortcut for showing unverified items.
      renderHook(() => useEditorToolbar({}));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.SHOW_UNVERIFIED_ONLY);

      act(() => handler());

      // Assert: Verify store filter update.
      expect(mockSetDisplayFilter).toHaveBeenCalledWith("unverified");
    });
  });
});
