import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { useSelectionNavigator } from "@/features/cases/hooks/use-selection-navigator";
import { useResultsImages } from "@/features/images/hooks/use-results-images";

// Mock the analyze store to control sorting state.
vi.mock("@/features/analyze/store/analyze-store", () => ({
  useAnalyzeStore: vi.fn(),
}));

// Mock the selection navigator to verify integration.
vi.mock("@/features/cases/hooks/use-selection-navigator", () => ({
  useSelectionNavigator: vi.fn(),
}));

interface MockInitialImage {
  id: string;
  name: string;
  url: string;
  size: number;
  createdAt: Date;
  detections: unknown[];
  [key: string]: unknown;
}

interface MockSelectionNavigator {
  isOpen: boolean;
  selectedItem: unknown | null;
  open: (item: unknown) => void;
  close: () => void;
  next: () => void;
  previous: () => void;
  selectById: (id: string) => void;
}

// Define mock data for initial images with varied attributes for sorting tests.
const mockInitialImages: MockInitialImage[] = [
  {
    id: "1",
    name: "image-3",
    url: "http://example.com/image-3",
    size: 100,
    createdAt: new Date("2025-01-03T00:00:00Z"),
    detections: [],
  },
  {
    id: "2",
    name: "image-1",
    url: "http://example.com/image-1",
    size: 200,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    detections: [],
  },
  {
    id: "3",
    name: "image-2",
    url: "http://example.com/image-2",
    size: 150,
    createdAt: new Date("2025-01-02T00:00:00Z"),
    detections: [],
  },
];

// Define default mock implementation for the selection navigator.
const mockPreviewModal: MockSelectionNavigator = {
  isOpen: false,
  selectedItem: null,
  open: vi.fn(),
  close: vi.fn(),
  next: vi.fn(),
  previous: vi.fn(),
  selectById: vi.fn(),
};

// Groups tests for the results images management hook.
describe("useResultsImages", () => {
  let mockSortOption = "date-uploaded-desc";
  const mockSetSortOption = vi.fn((newOption: string) => {
    mockSortOption = newOption;
  });

  // Reset mocks and configure the analyze store mock with dynamic state before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    mockSortOption = "date-uploaded-desc";

    vi.mocked(useAnalyzeStore).mockImplementation((selector) => {
      const currentMockState = {
        sortOption: mockSortOption,
        setSortOption: mockSetSortOption,
      };

      return (selector as unknown as (state: typeof currentMockState) => unknown)(currentMockState);
    });

    vi.mocked(useSelectionNavigator).mockReturnValue(
      mockPreviewModal as unknown as ReturnType<typeof useSelectionNavigator>
    );
  });

  type HookProps = Parameters<typeof useResultsImages>[0];

  /**
   * Test case to verify that the hook initializes with default state and mapped images.
   */
  it("initializes with default state and mapped images", () => {
    // Arrange: Render the hook with mock images.
    const { result } = renderHook(() =>
      useResultsImages(mockInitialImages as unknown as HookProps)
    );

    // Assert: Verify total count, default search term, sorting order, and modal states.
    expect(result.current.totalImages).toBe(3);
    expect(result.current.searchTerm).toBe("");
    expect(result.current.sortedFiles[0].id).toBe("1");
    expect(result.current.sortedFiles[1].id).toBe("3");
    expect(result.current.sortedFiles[2].id).toBe("2");
    expect(result.current.isExportModalOpen).toBe(false);
  });

  /**
   * Test case to verify that the file list updates when the initialImages prop changes.
   */
  it("updates files when initialImages prop changes", () => {
    // Arrange: Render the hook with an empty list.
    const { result, rerender } = renderHook((props) => useResultsImages(props), {
      initialProps: [] as unknown as HookProps,
    });

    // Assert: Verify initial count is zero.
    expect(result.current.totalImages).toBe(0);

    // Act: Rerender the hook with populated mock images.
    rerender(mockInitialImages as unknown as HookProps);

    // Assert: Verify the count reflects the new images.
    expect(result.current.totalImages).toBe(3);
  });

  /**
   * Test case to verify that files are filtered based on the search term.
   */
  it("filters files by search term", () => {
    // Arrange: Render the hook with mock images.
    const { result } = renderHook(() =>
      useResultsImages(mockInitialImages as unknown as HookProps)
    );

    // Act: Set the search term to a specific image name.
    act(() => {
      result.current.setSearchTerm("image-1");
    });

    // Assert: Verify that only the matching file remains.
    expect(result.current.sortedFiles).toHaveLength(1);
    expect(result.current.sortedFiles[0].name).toBe("image-1");
  });

  /**
   * Test case to verify that search filtering is case-insensitive.
   */
  it("is case-insensitive when filtering", () => {
    // Arrange: Render the hook with mock images.
    const { result } = renderHook(() =>
      useResultsImages(mockInitialImages as unknown as HookProps)
    );

    // Act: Set the search term with different casing.
    act(() => {
      result.current.setSearchTerm("image-3");
    });

    // Assert: Verify that the matching file is found despite case differences.
    expect(result.current.sortedFiles).toHaveLength(1);
    expect(result.current.sortedFiles[0].name).toBe("image-3");
  });

  // Groups tests related to file sorting functionality.
  describe("sorting", () => {
    /**
     * Test case to verify that files are sorted by name in ascending order.
     */
    it("sorts by name ascending", () => {
      // Arrange: Set sort option to name-asc and render the hook.
      mockSortOption = "name-asc";
      const { result } = renderHook(() =>
        useResultsImages(mockInitialImages as unknown as HookProps)
      );

      // Assert: Verify the order of file names.
      const names = result.current.sortedFiles.map((f) => f.name);
      expect(names).toEqual(["image-1", "image-2", "image-3"]);
    });

    /**
     * Test case to verify that files are sorted by name in descending order.
     */
    it("sorts by name descending", () => {
      // Arrange: Set sort option to name-desc and render the hook.
      mockSortOption = "name-desc";
      const { result } = renderHook(() =>
        useResultsImages(mockInitialImages as unknown as HookProps)
      );

      // Assert: Verify the order of file names.
      const names = result.current.sortedFiles.map((f) => f.name);
      expect(names).toEqual(["image-3", "image-2", "image-1"]);
    });

    /**
     * Test case to verify that files are sorted by size in ascending order.
     */
    it("sorts by size ascending", () => {
      // Arrange: Set sort option to size-asc and render the hook.
      mockSortOption = "size-asc";
      const { result } = renderHook(() =>
        useResultsImages(mockInitialImages as unknown as HookProps)
      );

      // Assert: Verify the order of file sizes.
      const sizes = result.current.sortedFiles.map((f) => f.size);
      expect(sizes).toEqual([100, 150, 200]);
    });

    /**
     * Test case to verify that files are sorted by size in descending order.
     */
    it("sorts by size descending", () => {
      // Arrange: Set sort option to size-desc and render the hook.
      mockSortOption = "size-desc";
      const { result } = renderHook(() =>
        useResultsImages(mockInitialImages as unknown as HookProps)
      );

      // Assert: Verify the order of file sizes.
      const sizes = result.current.sortedFiles.map((f) => f.size);
      expect(sizes).toEqual([200, 150, 100]);
    });

    /**
     * Test case to verify that files are sorted by date uploaded in ascending order.
     */
    it("sorts by date uploaded ascending", () => {
      // Arrange: Set sort option to date-uploaded-asc and render the hook.
      mockSortOption = "date-uploaded-asc";
      const { result } = renderHook(() =>
        useResultsImages(mockInitialImages as unknown as HookProps)
      );

      // Assert: Verify the order of upload dates.
      const dates = result.current.sortedFiles.map((f) => f.dateUploaded.toISOString());
      expect(dates).toEqual([
        "2025-01-01T00:00:00.000Z",
        "2025-01-02T00:00:00.000Z",
        "2025-01-03T00:00:00.000Z",
      ]);
    });

    /**
     * Test case to verify that the sort option updater calls the store action.
     */
    it("calls setSortOption when updated", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() =>
        useResultsImages(mockInitialImages as unknown as HookProps)
      );

      // Act: Call the sort option setter.
      act(() => {
        result.current.setSortOption("name-asc");
      });

      // Assert: Verify the store mock was called with the new option.
      expect(mockSetSortOption).toHaveBeenCalledWith("name-asc");
    });
  });

  // Groups tests related to modal state management.
  describe("modals", () => {
    /**
     * Test case to verify the opening and closing of the export modal.
     */
    it("handles export modal state", () => {
      // Arrange: Render the hook and select a target image.
      const { result } = renderHook(() =>
        useResultsImages(mockInitialImages as unknown as HookProps)
      );
      const targetImage = result.current.sortedFiles[0];

      // Act: Open the export modal for the target image.
      act(() => {
        result.current.handleOpenExportModal(targetImage);
      });

      // Assert: Verify modal open state and active image.
      expect(result.current.isExportModalOpen).toBe(true);
      expect(result.current.imageToExport).toBe(targetImage);

      // Act: Close the export modal.
      act(() => {
        result.current.setIsExportModalOpen(false);
      });

      // Assert: Verify modal is closed.
      expect(result.current.isExportModalOpen).toBe(false);
    });

    /**
     * Test case to verify the opening and closing of the edit modal.
     */
    it("handles edit modal state", () => {
      // Arrange: Render the hook and select a target image.
      const { result } = renderHook(() =>
        useResultsImages(mockInitialImages as unknown as HookProps)
      );
      const targetImage = result.current.sortedFiles[0];

      // Act: Open the edit modal.
      act(() => {
        result.current.handleOpenEditModal(targetImage);
      });

      // Assert: Verify modal open state and active image.
      expect(result.current.isEditModalOpen).toBe(true);
      expect(result.current.imageToEdit).toBe(targetImage);

      // Act: Close the edit modal.
      act(() => {
        result.current.setIsEditModalOpen(false);
      });

      // Assert: Verify modal is closed.
      expect(result.current.isEditModalOpen).toBe(false);
    });

    /**
     * Test case to verify the opening and closing of the delete modal.
     */
    it("handles delete modal state", () => {
      // Arrange: Render the hook and select a target image.
      const { result } = renderHook(() =>
        useResultsImages(mockInitialImages as unknown as HookProps)
      );
      const targetImage = result.current.sortedFiles[0];

      // Act: Open the delete modal.
      act(() => {
        result.current.handleOpenDeleteModal(targetImage);
      });

      // Assert: Verify modal open state and active image.
      expect(result.current.isDeleteModalOpen).toBe(true);
      expect(result.current.imageToDelete).toBe(targetImage);

      // Act: Close the delete modal.
      act(() => {
        result.current.setIsDeleteModalOpen(false);
      });

      // Assert: Verify modal is closed.
      expect(result.current.isDeleteModalOpen).toBe(false);
    });
  });

  /**
   * Test case to verify that sorted files are passed to the selection navigator hook.
   */
  it("passes sorted files to useSelectionNavigator", () => {
    // Arrange: Render the hook.
    renderHook(() => useResultsImages(mockInitialImages as unknown as HookProps));

    // Assert: Verify useSelectionNavigator was initialized with the correct items.
    expect(useSelectionNavigator).toHaveBeenCalledWith({
      items: expect.any(Array),
    });

    const lastCall = vi.mocked(useSelectionNavigator).mock.lastCall;
    const args = lastCall?.[0] as { items: unknown[] };
    expect(args?.items).toHaveLength(3);
  });
});
