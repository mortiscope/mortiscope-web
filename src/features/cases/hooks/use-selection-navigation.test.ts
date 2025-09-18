import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook } from "@/__tests__/setup/test-utils";
import { useSelectionNavigator } from "@/features/cases/hooks/use-selection-navigator";

// Arrange: Define a mock list of items used for testing navigation.
const mockItems = [
  { id: "1", name: "Item 1" },
  { id: "2", name: "Item 2" },
  { id: "3", name: "Item 3" },
];

/**
 * Test suite for the `useSelectionNavigator` hook.
 */
describe("useSelectionNavigator", () => {
  // Setup to use fake timers for controlling and testing delayed actions.
  beforeEach(() => {
    // Arrange: Replace real timers with mock functions.
    vi.useFakeTimers();
  });

  /**
   * Test case to verify that the initial state is closed and no item is selected.
   */
  it("initializes with default state (closed, no selection)", () => {
    // Act: Render the hook.
    const { result } = renderHook(() => useSelectionNavigator({ items: mockItems }));

    // Assert: Check the default `isOpen` state.
    expect(result.current.isOpen).toBe(false);
    // Assert: Check the default `selectedItem` state.
    expect(result.current.selectedItem).toBeNull();
  });

  /**
   * Test suite for the `open()` function.
   */
  describe("open()", () => {
    /**
     * Test case to verify that the selection interface opens and sets the specified item as selected.
     */
    it("opens and selects the given item", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useSelectionNavigator({ items: mockItems }));

      // Act: Call `open()` with a specific item.
      act(() => {
        result.current.open(mockItems[1]);
      });

      // Assert: Verify that the `isOpen` state is true.
      expect(result.current.isOpen).toBe(true);
      // Assert: Verify that the correct item is set as `selectedItem`.
      expect(result.current.selectedItem).toEqual(mockItems[1]);
    });
  });

  /**
   * Test suite for the `close()` function.
   */
  describe("close()", () => {
    /**
     * Test case to verify that `isOpen` closes immediately but `selectedItem` is reset after a delay.
     */
    it("closes immediately but delays resetting selection", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useSelectionNavigator({ items: mockItems }));

      // Act: Open the navigator and select an item.
      act(() => {
        result.current.open(mockItems[0]);
      });
      // Assert: Confirm the navigator is open.
      expect(result.current.isOpen).toBe(true);

      // Act: Call `close()`.
      act(() => {
        result.current.close();
      });

      // Assert: Check that `isOpen` immediately changes to false.
      expect(result.current.isOpen).toBe(false);
      // Assert: Check that `selectedItem` is still set before the timer runs.
      expect(result.current.selectedItem).toEqual(mockItems[0]);

      // Act: Advance all fake timers to trigger the delayed reset.
      act(() => {
        vi.runAllTimers();
      });

      // Assert: Check that `selectedItem` is now reset to null.
      expect(result.current.selectedItem).toBeNull();
    });
  });

  /**
   * Test suite for the `next()` and `previous()` navigation functions.
   */
  describe("Navigation (next/previous)", () => {
    /**
     * Test case to verify sequential navigation to the next item in the list.
     */
    it("navigates to next item correctly", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useSelectionNavigator({ items: mockItems }));

      // Act: Start by selecting the first item.
      act(() => {
        result.current.open(mockItems[0]);
      });

      // Act: Navigate to the next item.
      act(() => {
        result.current.next();
      });
      // Assert: Check that the second item is now selected.
      expect(result.current.selectedItem).toEqual(mockItems[1]);

      // Act: Navigate again.
      act(() => {
        result.current.next();
      });
      // Assert: Check that the third item is now selected.
      expect(result.current.selectedItem).toEqual(mockItems[2]);
    });

    /**
     * Test case to ensure `next()` does nothing when the last item in the list is already selected.
     */
    it("does nothing if already at the last item", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useSelectionNavigator({ items: mockItems }));

      // Act: Select the last item.
      act(() => {
        result.current.open(mockItems[2]);
      });

      // Act: Attempt to navigate past the end of the list.
      act(() => {
        result.current.next();
      });

      // Assert: Check that the selected item remains the last item.
      expect(result.current.selectedItem).toEqual(mockItems[2]);
    });

    /**
     * Test case to verify sequential navigation to the previous item in the list.
     */
    it("navigates to previous item correctly", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useSelectionNavigator({ items: mockItems }));

      // Act: Start by selecting the second item.
      act(() => {
        result.current.open(mockItems[1]);
      });

      // Act: Navigate to the previous item.
      act(() => {
        result.current.previous();
      });
      // Assert: Check that the first item is now selected.
      expect(result.current.selectedItem).toEqual(mockItems[0]);
    });

    /**
     * Test case to ensure `previous()` does nothing when the first item in the list is already selected.
     */
    it("does nothing if already at the first item", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useSelectionNavigator({ items: mockItems }));

      // Act: Select the first item.
      act(() => {
        result.current.open(mockItems[0]);
      });

      // Act: Attempt to navigate before the start of the list.
      act(() => {
        result.current.previous();
      });

      // Assert: Check that the selected item remains the first item.
      expect(result.current.selectedItem).toEqual(mockItems[0]);
    });
  });

  /**
   * Test suite for the `selectById()` function.
   */
  describe("selectById()", () => {
    /**
     * Test case to verify that an item is selected if its ID exists in the list.
     */
    it("selects an item if ID exists", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useSelectionNavigator({ items: mockItems }));

      // Act: Select an item by its ID.
      act(() => {
        result.current.selectById("2");
      });

      // Assert: Check that the item with ID "2" is selected.
      expect(result.current.selectedItem).toEqual(mockItems[1]);
    });

    /**
     * Test case to ensure `selectById()` does not change the current selection if the provided ID is not found.
     */
    it("does NOT change selection if ID does not exist", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useSelectionNavigator({ items: mockItems }));

      // Act: Select an initial item.
      act(() => {
        result.current.open(mockItems[0]);
      });

      // Act: Attempt to select an item with a non-existent ID.
      act(() => {
        result.current.selectById("999");
      });

      // Assert: Check that the selected item is still the initially opened item.
      expect(result.current.selectedItem).toEqual(mockItems[0]);
    });
  });

  /**
   * Test suite for handling changes to the external `items` prop.
   */
  describe("Reactivity", () => {
    /**
     * Test case to ensure that when the `items` array changes, the `selectedItem` state is updated to reflect the corresponding item with the matching ID in the new array.
     */
    it("updates selectedItem if the items array prop changes", () => {
      // Arrange: Render the hook and capture the `rerender` function.
      const { result, rerender } = renderHook((props) => useSelectionNavigator(props), {
        initialProps: { items: mockItems },
      });

      // Act: Select an item from the initial list.
      act(() => {
        result.current.open(mockItems[0]);
      });

      // Arrange: Define a new list of items where the item with the selected ID has updated properties.
      const newItems = [
        { id: "1", name: "Item 1 Updated" },
        { id: "2", name: "Item 2" },
      ];

      // Act: Rerender the hook with the new `items` array.
      rerender({ items: newItems });

      // Assert: Check that the selected item object has been updated to the corresponding object from the `newItems` array.
      expect(result.current.selectedItem).toEqual(newItems[0]);
      // Assert: Verify that the updated property (`name`) is reflected in the selected item.
      expect(result.current.selectedItem?.name).toBe("Item 1 Updated");
    });
  });
});
