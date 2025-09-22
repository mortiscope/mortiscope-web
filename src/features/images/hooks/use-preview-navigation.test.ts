import { renderHook } from "@/__tests__/setup/test-utils";
import { type UploadableFile, useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { usePreviewNavigation } from "@/features/images/hooks/use-preview-navigation";

// Define a base file object to serve as a template for test data.
const mockBaseFile: UploadableFile = {
  id: "1",
  key: "test-1.jpg",
  name: "image-1.jpg",
  url: "http://example.com/1.jpg",
  size: 100,
  type: "image/jpeg",
  status: "success",
  progress: 100,
  source: "upload",
  dateUploaded: new Date("2025-01-01T10:00:00Z"),
  version: 1,
};

// Create specific file instances with distinct properties for sorting verification.
const firstFile = {
  ...mockBaseFile,
  id: "1",
  name: "image-1.jpg",
  size: 100,
  dateUploaded: new Date("2025-01-01T10:00:00Z"),
};
const secondFile = {
  ...mockBaseFile,
  id: "2",
  name: "image-2.jpg",
  size: 200,
  dateUploaded: new Date("2025-01-02T10:00:00Z"),
};
const thirdFile = {
  ...mockBaseFile,
  id: "3",
  name: "image-3.jpg",
  size: 300,
  dateUploaded: new Date("2025-01-03T10:00:00Z"),
};

// Test suite for the `usePreviewNavigation` hook, verifying file sorting and navigation logic.
describe("usePreviewNavigation", () => {
  // Reset the store with a known set of files and default sort order before each test.
  beforeEach(() => {
    useAnalyzeStore.setState({
      data: { files: [firstFile, secondFile, thirdFile] },
      sortOption: "date-uploaded-desc",
    });
  });

  /**
   * Test case to verify navigation state when the active file is at the beginning of the list.
   */
  it("calculates navigation state correctly for the first file (default sort)", () => {
    // Arrange: Render the hook with the third file (newest, so first in desc sort).
    const { result } = renderHook(() => usePreviewNavigation(thirdFile));

    // Assert: Verify index is 0 and previous navigation is disabled.
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.hasPrevious).toBe(false);
    expect(result.current.hasNext).toBe(true);
    expect(result.current.sortedFiles[0].id).toBe("3");
  });

  /**
   * Test case to verify navigation state when the active file is in the middle of the list.
   */
  it("calculates navigation state correctly for the middle file (default sort)", () => {
    // Arrange: Render the hook with the second file.
    const { result } = renderHook(() => usePreviewNavigation(secondFile));

    // Assert: Verify index is 1 and both directions are enabled.
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.hasPrevious).toBe(true);
    expect(result.current.hasNext).toBe(true);
  });

  /**
   * Test case to verify navigation state when the active file is at the end of the list.
   */
  it("calculates navigation state correctly for the last file (default sort)", () => {
    // Arrange: Render the hook with the first file (oldest, so last in desc sort).
    const { result } = renderHook(() => usePreviewNavigation(firstFile));

    // Assert: Verify index is 2 and next navigation is disabled.
    expect(result.current.currentIndex).toBe(2);
    expect(result.current.hasPrevious).toBe(true);
    expect(result.current.hasNext).toBe(false);
  });

  /**
   * Test case to verify behavior when no active file is selected.
   */
  it("handles null active file gracefully", () => {
    // Arrange: Render the hook with null.
    const { result } = renderHook(() => usePreviewNavigation(null));

    // Assert: Verify index is -1 and state is handled gracefully.
    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.hasPrevious).toBe(false);
    expect(result.current.hasNext).toBe(true);
  });

  /**
   * Test case to verify that files are sorted by name in ascending order.
   */
  it("sorts by name ascending", () => {
    // Arrange: Set store sort option to name-asc and render hook.
    useAnalyzeStore.setState({ sortOption: "name-asc" });
    const { result } = renderHook(() => usePreviewNavigation(firstFile));

    // Assert: Check the order of filenames in the sorted list.
    expect(result.current.sortedFiles.map((f) => f.name)).toEqual([
      "image-1.jpg",
      "image-2.jpg",
      "image-3.jpg",
    ]);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.hasNext).toBe(true);
  });

  /**
   * Test case to verify that files are sorted by name in descending order.
   */
  it("sorts by name descending", () => {
    // Arrange: Set store sort option to name-desc and render hook.
    useAnalyzeStore.setState({ sortOption: "name-desc" });
    const { result } = renderHook(() => usePreviewNavigation(thirdFile));

    // Assert: Check the order of filenames in the sorted list.
    expect(result.current.sortedFiles.map((f) => f.name)).toEqual([
      "image-3.jpg",
      "image-2.jpg",
      "image-1.jpg",
    ]);
    expect(result.current.currentIndex).toBe(0);
  });

  /**
   * Test case to verify that files are sorted by size in ascending order.
   */
  it("sorts by size ascending", () => {
    // Arrange: Set store sort option to size-asc and render hook.
    useAnalyzeStore.setState({ sortOption: "size-asc" });
    const { result } = renderHook(() => usePreviewNavigation(firstFile));

    // Assert: Check the order of file sizes in the sorted list.
    expect(result.current.sortedFiles.map((f) => f.size)).toEqual([100, 200, 300]);
    expect(result.current.currentIndex).toBe(0);
  });

  /**
   * Test case to verify that files are sorted by size in descending order.
   */
  it("sorts by size descending", () => {
    // Arrange: Set store sort option to size-desc and render hook.
    useAnalyzeStore.setState({ sortOption: "size-desc" });
    const { result } = renderHook(() => usePreviewNavigation(thirdFile));

    // Assert: Check the order of file sizes in the sorted list.
    expect(result.current.sortedFiles.map((f) => f.size)).toEqual([300, 200, 100]);
    expect(result.current.currentIndex).toBe(0);
  });

  /**
   * Test case to verify that files are sorted by date modified in descending order.
   */
  it("sorts by date modified descending", () => {
    // Arrange: Set store sort option to date-modified-desc and render hook.
    useAnalyzeStore.setState({ sortOption: "date-modified-desc" });
    const { result } = renderHook(() => usePreviewNavigation(thirdFile));

    // Assert: Check the order of file IDs in the sorted list.
    expect(result.current.sortedFiles.map((f) => f.id)).toEqual(["3", "2", "1"]);
    expect(result.current.currentIndex).toBe(0);
  });

  /**
   * Test case to verify behavior when the active file does not exist in the store.
   */
  it("returns -1 index if active file is not found in the list", () => {
    // Arrange: Create a file that is not in the store and render hook.
    const alienFile = { ...mockBaseFile, id: "999", name: "Mortiscope.jpg" };
    const { result } = renderHook(() => usePreviewNavigation(alienFile));

    // Assert: Verify index is -1.
    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.sortedFiles).toHaveLength(3);
  });
});
