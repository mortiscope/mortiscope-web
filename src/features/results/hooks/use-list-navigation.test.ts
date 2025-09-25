import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useListNavigation } from "@/features/results/hooks/use-list-navigation";

/**
 * Test suite for the `useListNavigation` custom hook.
 */
describe("useListNavigation", () => {
  // Arrange: Define a standard set of mock items to be used as the navigation context.
  const items = [
    { id: "1", name: "Item 1" },
    { id: "2", name: "Item 2" },
    { id: "3", name: "Item 3" },
  ];

  /**
   * Test case to verify that an empty list results in no available navigation directions.
   */
  it("returns all false when list is empty", () => {
    // Act: Render the hook with an empty array and no active item.
    const { result } = renderHook(() => useListNavigation([], null));

    // Assert: Check that both `hasNext` and `hasPrevious` are false.
    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrevious).toBe(false);
  });

  /**
   * Test case to verify that navigation is disabled when no item in the list is currently active.
   */
  it("returns all false when no item is active", () => {
    // Act: Render the hook with a populated list but a null active item.
    const { result } = renderHook(() => useListNavigation(items, null));

    // Assert: Verify that navigation states remain false.
    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrevious).toBe(false);
  });

  /**
   * Test case to verify that an active item not present in the provided list disables navigation.
   */
  it("returns all false when active item is not found in the list", () => {
    // Arrange: Define an item that does not exist in the `items` array.
    const activeItem = { id: "999", name: "Non-existent" };

    // Act: Render the hook with the missing item.
    const { result } = renderHook(() => useListNavigation(items, activeItem));

    // Assert: Verify that the hook cannot determine a relative position and returns false for both directions.
    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrevious).toBe(false);
  });

  /**
   * Test case to verify that the first item in the list allows forward navigation only.
   */
  it("identifies the first item (has next, no previous)", () => {
    // Arrange: Select the item at index 0.
    const activeItem = items[0];

    // Act: Render the hook.
    const { result } = renderHook(() => useListNavigation(items, activeItem));

    // Assert: Check that `hasNext` is true while `hasPrevious` is false.
    expect(result.current.hasNext).toBe(true);
    expect(result.current.hasPrevious).toBe(false);
  });

  /**
   * Test case to verify that items between the first and last allow navigation in both directions.
   */
  it("identifies a middle item (has next and previous)", () => {
    // Arrange: Select the item at index 1.
    const activeItem = items[1];

    // Act: Render the hook.
    const { result } = renderHook(() => useListNavigation(items, activeItem));

    // Assert: Check that both navigation directions are enabled.
    expect(result.current.hasNext).toBe(true);
    expect(result.current.hasPrevious).toBe(true);
  });

  /**
   * Test case to verify that the final item in the list allows backward navigation only.
   */
  it("identifies the last item (no next, has previous)", () => {
    // Arrange: Select the item at index 2.
    const activeItem = items[2];

    // Act: Render the hook.
    const { result } = renderHook(() => useListNavigation(items, activeItem));

    // Assert: Check that `hasNext` is false while `hasPrevious` is true.
    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrevious).toBe(true);
  });

  /**
   * Test case to verify that a list containing only one item permits no navigation.
   */
  it("handles a single-item list correctly (no next, no previous)", () => {
    // Arrange: Create a list with exactly one entry and set it as active.
    const singleList = [{ id: "1", name: "Only Item" }];
    const activeItem = singleList[0];

    // Act: Render the hook.
    const { result } = renderHook(() => useListNavigation(singleList, activeItem));

    // Assert: Verify that neither forward nor backward navigation is possible.
    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrevious).toBe(false);
  });
});
