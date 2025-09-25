import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useResultsStore } from "@/features/results/store/results-store";

/**
 * Test suite for the results global state management store.
 */
describe("useResultsStore", () => {
  // Reset the global store state before each test to ensure test isolation and predictable starting conditions.
  beforeEach(() => {
    act(() => {
      useResultsStore.setState({
        viewMode: "grid",
        sortOption: "date-modified-desc",
        searchTerm: "",
        renamingCaseId: null,
        pendingRecalculations: new Set(),
      });
    });
  });

  /**
   * Test case to verify that the store provides the expected initial state upon first access.
   */
  it("initializes with default values", () => {
    // Arrange: Render the hook to access the current store state.
    const { result } = renderHook(() => useResultsStore());

    // Assert: Verify that all state properties match their defined default values.
    expect(result.current.viewMode).toBe("grid");
    expect(result.current.sortOption).toBe("date-modified-desc");
    expect(result.current.searchTerm).toBe("");
    expect(result.current.renamingCaseId).toBeNull();
    expect(result.current.pendingRecalculations.size).toBe(0);
  });

  /**
   * Test case to verify that the view mode can toggle between supported layouts.
   */
  it("updates view mode", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useResultsStore());

    // Act: Change the `viewMode` to list.
    act(() => {
      result.current.setViewMode("list");
    });

    // Assert: Check that the `viewMode` reflects the update.
    expect(result.current.viewMode).toBe("list");

    // Act: Revert the `viewMode` to grid.
    act(() => {
      result.current.setViewMode("grid");
    });

    // Assert: Verify the state has successfully toggled back.
    expect(result.current.viewMode).toBe("grid");
  });

  /**
   * Test case to verify that the sorting preference is updated correctly.
   */
  it("updates sort option", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useResultsStore());

    // Act: Set a new `sortOption` value.
    act(() => {
      result.current.setSortOption("name-asc");
    });

    // Assert: Verify the `sortOption` state has been updated.
    expect(result.current.sortOption).toBe("name-asc");
  });

  /**
   * Test case to verify that the search term state is properly captured.
   */
  it("updates search term", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useResultsStore());

    // Act: Provide a new value for the `searchTerm`.
    act(() => {
      result.current.setSearchTerm("test case");
    });

    // Assert: Verify the state contains the updated search string.
    expect(result.current.searchTerm).toBe("test case");
  });

  /**
   * Test case to verify that the store correctly tracks which case is currently being renamed.
   */
  it("updates renaming case id", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useResultsStore());

    // Act: Set the `renamingCaseId` to a specific string.
    act(() => {
      result.current.setRenamingCaseId("case-123");
    });

    // Assert: Verify the ID is stored correctly.
    expect(result.current.renamingCaseId).toBe("case-123");

    // Act: Reset the `renamingCaseId` to null.
    act(() => {
      result.current.setRenamingCaseId(null);
    });

    // Assert: Verify the state is cleared.
    expect(result.current.renamingCaseId).toBeNull();
  });

  /**
   * Sub-suite for testing the logic associated with pending recalculation flags.
   */
  describe("Recalculation Flags", () => {
    /**
     * Test case to verify that new case IDs can be added to the pending set.
     */
    it("adds a case to pending recalculations", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useResultsStore());

      // Act: Add a case ID using the `markForRecalculation` method.
      act(() => {
        result.current.markForRecalculation("case-1");
      });

      // Assert: Verify the `Set` contains the ID and the size has increased.
      expect(result.current.pendingRecalculations.has("case-1")).toBe(true);
      expect(result.current.pendingRecalculations.size).toBe(1);
    });

    /**
     * Test case to ensure the store maintains uniqueness within the pending set.
     */
    it("does not duplicate existing cases in pending set", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useResultsStore());

      // Act: Attempt to add the same case ID twice.
      act(() => {
        result.current.markForRecalculation("case-1");
      });
      act(() => {
        result.current.markForRecalculation("case-1");
      });

      // Assert: Verify that the `pendingRecalculations` set size remains one.
      expect(result.current.pendingRecalculations.size).toBe(1);
    });

    /**
     * Test case to verify that individual flags can be removed from the pending set.
     */
    it("clears a recalculation flag for a specific case", () => {
      // Arrange: Render the hook and populate the set with multiple IDs.
      const { result } = renderHook(() => useResultsStore());

      act(() => {
        result.current.markForRecalculation("case-1");
        result.current.markForRecalculation("case-2");
      });

      // Assert: Confirm the initial population.
      expect(result.current.pendingRecalculations.size).toBe(2);

      // Act: Clear the flag for one specific case.
      act(() => {
        result.current.clearRecalculationFlag("case-1");
      });

      // Assert: Verify that the target ID is removed while others remain.
      expect(result.current.pendingRecalculations.has("case-1")).toBe(false);
      expect(result.current.pendingRecalculations.has("case-2")).toBe(true);
      expect(result.current.pendingRecalculations.size).toBe(1);
    });
  });
});
