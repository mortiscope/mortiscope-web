import { act, renderHook } from "@testing-library/react";
import { useHotkeys } from "react-hotkeys-hook";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { useEditorSidebar } from "@/features/annotation/hooks/use-editor-sidebar";
import { KEYBOARD_SHORTCUTS } from "@/lib/constants";

// Mock the hotkeys hook to verify that keyboard shortcuts are registered correctly.
vi.mock("react-hotkeys-hook", () => ({
  useHotkeys: vi.fn(),
}));

/**
 * Test suite for the `useEditorSidebar` hook which manages the state and visibility of the editor sidebar panels.
 */
describe("useEditorSidebar", () => {
  const onPanelStateChange = vi.fn();

  // Reset all mocks and define a default window.matchMedia implementation before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  /**
   * Verify that the sidebar starts in a closed state with no active selection.
   */
  it("initializes with no selected item (closed)", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useEditorSidebar({ onPanelStateChange }));

    // Assert: Verify that the selected item is null and the parent is notified that the panel is closed.
    expect(result.current.selectedItem).toBeNull();
    expect(onPanelStateChange).toHaveBeenCalledWith(false);
  });

  /**
   * Verify that clicking a sidebar button opens the corresponding panel and notifies the parent component.
   */
  it("toggles sidebar item open and notifies parent", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useEditorSidebar({ onPanelStateChange }));

    // Act: Simulate clicking the annotation button.
    act(() => {
      result.current.handleButtonClick("annotation");
    });

    // Assert: Verify the selection state and parent notification.
    expect(result.current.selectedItem).toBe("annotation");
    expect(onPanelStateChange).toHaveBeenCalledWith(true);
  });

  /**
   * Verify that clicking an already active sidebar button closes the panel.
   */
  it("toggles sidebar item closed and notifies parent", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useEditorSidebar({ onPanelStateChange }));

    // Act: Toggle the annotation panel on and then off.
    act(() => {
      result.current.handleButtonClick("annotation");
    });
    act(() => {
      result.current.handleButtonClick("annotation");
    });

    // Assert: Verify the state returns to null and the parent is notified.
    expect(result.current.selectedItem).toBeNull();
    expect(onPanelStateChange).toHaveBeenCalledWith(false);
  });

  /**
   * Verify that clicking a different sidebar button switches the active panel directly.
   */
  it("switches between sidebar items", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useEditorSidebar({ onPanelStateChange }));

    // Act: Open annotation and then switch to settings.
    act(() => {
      result.current.handleButtonClick("annotation");
    });

    expect(result.current.selectedItem).toBe("annotation");

    act(() => {
      result.current.handleButtonClick("settings");
    });

    // Assert: Verify the selection reflects the most recent click.
    expect(result.current.selectedItem).toBe("settings");
  });

  /**
   * Verify that the explicit close handler resets the selected item.
   */
  it("closes the panel explicitly", () => {
    // Arrange: Open a panel.
    const { result } = renderHook(() => useEditorSidebar({ onPanelStateChange }));

    act(() => {
      result.current.handleButtonClick("annotation");
    });

    expect(result.current.selectedItem).toBe("annotation");

    // Act: Call the close panel function.
    act(() => {
      result.current.handleClosePanel();
    });

    // Assert: Verify selection is cleared.
    expect(result.current.selectedItem).toBeNull();
  });

  /**
   * Verify that the hook returns the correct display titles for different active panels.
   */
  it("returns correct panel titles", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useEditorSidebar({ onPanelStateChange }));

    // Assert: Check titles for each panel type and the empty state.
    expect(result.current.getPanelTitle()).toBe("");

    act(() => {
      result.current.handleButtonClick("annotation");
    });
    expect(result.current.getPanelTitle()).toBe("Annotation");

    act(() => {
      result.current.handleButtonClick("shortcuts");
    });
    expect(result.current.getPanelTitle()).toBe("Keyboard Shortcuts");

    act(() => {
      result.current.handleButtonClick("attributes");
    });
    expect(result.current.getPanelTitle()).toBe("Attributes");

    act(() => {
      result.current.handleButtonClick("settings");
    });
    expect(result.current.getPanelTitle()).toBe("Settings");
  });

  /**
   * Group of tests covering viewport detection and responsive state changes.
   */
  describe("Mobile Detection", () => {
    /**
     * Verify that the hook correctly identifies mobile viewports based on media queries on mount.
     */
    it("detects mobile view correctly on mount", () => {
      // Arrange: Mock matchMedia to simulate a mobile screen width.
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      // Act: Render the hook.
      const { result } = renderHook(() => useEditorSidebar({ onPanelStateChange }));

      // Assert: Verify isMobile flag is true.
      expect(result.current.isMobile).toBe(true);
    });

    /**
     * Verify that the isMobile state updates dynamically when the window is resized.
     */
    it("updates isMobile state on window resize", () => {
      // Arrange: Capture the change handler from the media query listener.
      let changeHandler: ((e: MediaQueryListEvent) => void) | undefined;

      const addEventListener = vi.fn((event, handler) => {
        if (event === "change") changeHandler = handler;
      });

      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener,
        removeEventListener: vi.fn(),
      }));

      const { result } = renderHook(() => useEditorSidebar({ onPanelStateChange }));

      expect(result.current.isMobile).toBe(false);

      // Act: Trigger the captured media query change event.
      act(() => {
        if (changeHandler) {
          changeHandler({ matches: true } as MediaQueryListEvent);
        }
      });

      // Assert: Verify state updated to reflect the new viewport size.
      expect(result.current.isMobile).toBe(true);
    });
  });

  /**
   * Group of tests covering keyboard interaction logic for sidebar controls.
   */
  describe("Keyboard Shortcuts", () => {
    /**
     * Internal helper to retrieve the handler function registered for a specific hotkey string.
     */
    const getShortcutHandler = (key: string) => {
      const calls = (useHotkeys as unknown as Mock).mock.calls;
      const call = calls.find((args) => args[0] === key);
      return call ? call[1] : null;
    };

    /**
     * Verify that the hook registers hotkeys for all primary sidebar panels.
     */
    it("registers keyboard shortcuts correctly", () => {
      // Act: Render the hook.
      renderHook(() => useEditorSidebar({ onPanelStateChange }));

      // Assert: Verify that useHotkeys was called for each defined constant.
      expect(useHotkeys).toHaveBeenCalledWith(
        KEYBOARD_SHORTCUTS.TOGGLE_ANNOTATION_PANEL,
        expect.any(Function),
        expect.any(Object)
      );
      expect(useHotkeys).toHaveBeenCalledWith(
        KEYBOARD_SHORTCUTS.TOGGLE_ATTRIBUTES_PANEL,
        expect.any(Function),
        expect.any(Object)
      );
      expect(useHotkeys).toHaveBeenCalledWith(
        KEYBOARD_SHORTCUTS.TOGGLE_SHORTCUTS_PANEL,
        expect.any(Function),
        expect.any(Object)
      );
      expect(useHotkeys).toHaveBeenCalledWith(
        KEYBOARD_SHORTCUTS.TOGGLE_SETTINGS_PANEL,
        expect.any(Function),
        expect.any(Object)
      );
    });

    /**
     * Verify that triggering the annotation shortcut toggles the annotation panel.
     */
    it("toggles annotation panel via shortcut", () => {
      // Arrange: Render hook and find the shortcut handler.
      const { result } = renderHook(() => useEditorSidebar({ onPanelStateChange }));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.TOGGLE_ANNOTATION_PANEL);

      expect(handler).toBeDefined();

      // Act: Invoke the handler manually.
      act(() => {
        handler();
      });

      // Assert: Verify panel is open.
      expect(result.current.selectedItem).toBe("annotation");

      act(() => {
        handler();
      });

      // Assert: Verify panel is closed.
      expect(result.current.selectedItem).toBeNull();
    });

    /**
     * Verify that triggering the attributes shortcut toggles the attributes panel.
     */
    it("toggles attributes panel via shortcut", () => {
      // Arrange: Render hook and find the shortcut handler.
      const { result } = renderHook(() => useEditorSidebar({ onPanelStateChange }));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.TOGGLE_ATTRIBUTES_PANEL);

      // Act: Toggle the panel via hotkey.
      act(() => {
        handler();
      });

      // Assert: Verify state change.
      expect(result.current.selectedItem).toBe("attributes");

      act(() => {
        handler();
      });

      expect(result.current.selectedItem).toBeNull();
    });

    /**
     * Verify that triggering the shortcuts help shortcut toggles the shortcuts panel.
     */
    it("toggles shortcuts panel via shortcut", () => {
      // Arrange: Render hook and find the shortcut handler.
      const { result } = renderHook(() => useEditorSidebar({ onPanelStateChange }));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.TOGGLE_SHORTCUTS_PANEL);

      // Act: Toggle the panel via hotkey.
      act(() => {
        handler();
      });

      // Assert: Verify state change.
      expect(result.current.selectedItem).toBe("shortcuts");

      act(() => {
        handler();
      });

      expect(result.current.selectedItem).toBeNull();
    });

    /**
     * Verify that triggering the settings shortcut toggles the settings panel.
     */
    it("toggles settings panel via shortcut", () => {
      // Arrange: Render hook and find the shortcut handler.
      const { result } = renderHook(() => useEditorSidebar({ onPanelStateChange }));
      const handler = getShortcutHandler(KEYBOARD_SHORTCUTS.TOGGLE_SETTINGS_PANEL);

      // Act: Toggle the panel via hotkey.
      act(() => {
        handler();
      });

      // Assert: Verify state change.
      expect(result.current.selectedItem).toBe("settings");

      act(() => {
        handler();
      });

      expect(result.current.selectedItem).toBeNull();
    });
  });
});
