import { act, renderHook } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { useEditorNavigation } from "@/features/annotation/hooks/use-editor-navigation";
import { useNavigationGuard } from "@/features/annotation/hooks/use-navigation-guard";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";

// Mock the Next.js router to intercept and verify navigation calls.
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock the navigation guard to simulate the presence or absence of unsaved annotation changes.
vi.mock("@/features/annotation/hooks/use-navigation-guard", () => ({
  useNavigationGuard: vi.fn(),
}));

// Mock the annotation store to control editor state and track state updates during navigation.
vi.mock("@/features/annotation/store/annotation-store", () => ({
  useAnnotationStore: vi.fn(),
}));

type ExtractState<T> = T extends (selector: (state: infer S) => unknown) => unknown ? S : never;
type AnnotationState = ExtractState<typeof useAnnotationStore>;

/**
 * Test suite for the `useEditorNavigation` hook which manages routing and state cleanup between images.
 */
describe("useEditorNavigation", () => {
  const mockPush = vi.fn();
  const mockSetIsLocked = vi.fn();
  const mockClearSelection = vi.fn();
  const mockSetDrawMode = vi.fn();
  const mockSetSelectMode = vi.fn();

  const mockResultsId = "case-123";
  const mockImages = [
    { id: "img-1", name: "Image 1" },
    { id: "img-2", name: "Image 2" },
    { id: "img-3", name: "Image 3" },
  ];

  // Initialize all mocks and default store values before each test case.
  beforeEach(() => {
    vi.clearAllMocks();

    (useRouter as Mock).mockReturnValue({ push: mockPush });

    (useNavigationGuard as Mock).mockReturnValue({ hasUnsavedChanges: false });

    (useAnnotationStore as unknown as Mock).mockImplementation(
      (selector: (state: AnnotationState) => unknown) => {
        const state = {
          isLocked: false,
          setIsLocked: mockSetIsLocked,
          clearSelection: mockClearSelection,
          setDrawMode: mockSetDrawMode,
          setSelectMode: mockSetSelectMode,
          detections: [],
          originalDetections: [],
        } as unknown as AnnotationState;
        return selector(state);
      }
    );
  });

  /**
   * Group of tests covering navigation back to the results overview page.
   */
  describe("Back Navigation", () => {
    /**
     * Verify that navigation occurs immediately when no changes are detected.
     */
    it("navigates back immediately if no unsaved changes", () => {
      // Arrange: Render the hook with mock context.
      const { result } = renderHook(() => useEditorNavigation(mockResultsId, mockImages, 0));

      // Act: Trigger the back navigation handler.
      act(() => {
        result.current.handleBackNavigation();
      });

      // Assert: Verify that the router was called with the correct results path.
      expect(mockPush).toHaveBeenCalledWith(`/results/${mockResultsId}`);
      expect(result.current.isUnsavedChangesModalOpen).toBe(false);
    });

    /**
     * Verify that the hook blocks navigation and prompts the user if unsaved changes exist.
     */
    it("opens modal and blocks navigation if unsaved changes exist", () => {
      // Arrange: Force the navigation guard to report unsaved changes.
      (useNavigationGuard as Mock).mockReturnValue({ hasUnsavedChanges: true });

      const { result } = renderHook(() => useEditorNavigation(mockResultsId, mockImages, 0));

      // Act: Attempt to navigate back.
      act(() => {
        result.current.handleBackNavigation();
      });

      // Assert: Verify that navigation is blocked and the confirmation modal is flagged to open.
      expect(mockPush).not.toHaveBeenCalled();
      expect(result.current.isUnsavedChangesModalOpen).toBe(true);
      expect(result.current.pendingNavigation).toBeDefined();
    });
  });

  /**
   * Group of tests covering the progression to the next image in the set.
   */
  describe("Next Image Navigation", () => {
    /**
     * Verify that the hook correctly calculates and navigates to the next image index.
     */
    it("navigates to next image if available and no changes", () => {
      // Arrange: Initialize at the first image index.
      const { result } = renderHook(() => useEditorNavigation(mockResultsId, mockImages, 0));

      // Act: Trigger next image navigation.
      act(() => {
        result.current.handleNextImage();
      });

      // Assert: Verify that the path for the second image is targeted.
      expect(mockPush).toHaveBeenCalledWith(
        `/results/${mockResultsId}/image/${mockImages[1].id}/edit`
      );
    });

    /**
     * Ensure that navigation is ignored when attempting to move past the end of the array.
     */
    it("does nothing if currently at the last image", () => {
      // Arrange: Initialize at the final image index.
      const lastIndex = mockImages.length - 1;
      const { result } = renderHook(() =>
        useEditorNavigation(mockResultsId, mockImages, lastIndex)
      );

      // Act: Attempt to go to the next image.
      act(() => {
        result.current.handleNextImage();
      });

      // Assert: Verify that no navigation action was performed.
      expect(mockPush).not.toHaveBeenCalled();
    });

    /**
     * Verify that unsaved changes trigger the confirmation modal during next image navigation.
     */
    it("opens modal if unsaved changes exist", () => {
      // Arrange: Mock active unsaved changes.
      (useNavigationGuard as Mock).mockReturnValue({ hasUnsavedChanges: true });

      const { result } = renderHook(() => useEditorNavigation(mockResultsId, mockImages, 0));

      // Act: Attempt to move to the next image.
      act(() => {
        result.current.handleNextImage();
      });

      // Assert: Ensure the modal is triggered and navigation is held.
      expect(mockPush).not.toHaveBeenCalled();
      expect(result.current.isUnsavedChangesModalOpen).toBe(true);
    });
  });

  /**
   * Group of tests covering the progression to the previous image in the set.
   */
  describe("Previous Image Navigation", () => {
    /**
     * Verify that the hook correctly calculates and navigates to the preceding image index.
     */
    it("navigates to previous image if available and no changes", () => {
      // Arrange: Initialize at the second image.
      const { result } = renderHook(() => useEditorNavigation(mockResultsId, mockImages, 1));

      // Act: Trigger previous image navigation.
      act(() => {
        result.current.handlePreviousImage();
      });

      // Assert: Verify that the path for the first image is targeted.
      expect(mockPush).toHaveBeenCalledWith(
        `/results/${mockResultsId}/image/${mockImages[0].id}/edit`
      );
    });

    /**
     * Ensure that navigation is ignored when attempting to move before the first image.
     */
    it("does nothing if currently at the first image", () => {
      // Arrange: Initialize at index `0`.
      const { result } = renderHook(() => useEditorNavigation(mockResultsId, mockImages, 0));

      // Act: Attempt to go to the previous image.
      act(() => {
        result.current.handlePreviousImage();
      });

      // Assert: Verify that no navigation was triggered.
      expect(mockPush).not.toHaveBeenCalled();
    });

    /**
     * Verify that unsaved changes trigger the confirmation modal during previous image navigation.
     */
    it("opens modal if unsaved changes exist", () => {
      // Arrange: Mock active unsaved changes.
      (useNavigationGuard as Mock).mockReturnValue({ hasUnsavedChanges: true });

      const { result } = renderHook(() => useEditorNavigation(mockResultsId, mockImages, 1));

      // Act: Attempt to move to the previous image.
      act(() => {
        result.current.handlePreviousImage();
      });

      // Assert: Ensure the modal is triggered and navigation is held.
      expect(mockPush).not.toHaveBeenCalled();
      expect(result.current.isUnsavedChangesModalOpen).toBe(true);
    });
  });

  /**
   * Group of tests covering the editor locking mechanism and its side effects on interaction modes.
   */
  describe("Lock Toggle", () => {
    /**
     * Verify that enabling the lock also resets interaction modes to prevent edits.
     */
    it("toggles lock on and resets editor state when locking", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useEditorNavigation(mockResultsId, mockImages, 0));

      // Act: Trigger the lock toggle.
      act(() => {
        result.current.handleToggleLock();
      });

      // Assert: Verify the lock state is updated and active tools are disabled.
      expect(mockSetIsLocked).toHaveBeenCalledWith(true);

      expect(mockClearSelection).toHaveBeenCalled();
      expect(mockSetDrawMode).toHaveBeenCalledWith(false);
      expect(mockSetSelectMode).toHaveBeenCalledWith(false);
    });

    /**
     * Verify that disabling the lock does not trigger an unnecessary editor state reset.
     */
    it("toggles lock off without resetting editor state", () => {
      // Arrange: Initialize the store mock in an already locked state.
      (useAnnotationStore as unknown as Mock).mockImplementation(
        (selector: (state: AnnotationState) => unknown) => {
          const state = {
            isLocked: true,
            setIsLocked: mockSetIsLocked,
            clearSelection: mockClearSelection,
            setDrawMode: mockSetDrawMode,
            setSelectMode: mockSetSelectMode,
            detections: [],
            originalDetections: [],
          } as unknown as AnnotationState;
          return selector(state);
        }
      );

      const { result } = renderHook(() => useEditorNavigation(mockResultsId, mockImages, 0));

      // Act: Trigger the lock toggle to unlock the editor.
      act(() => {
        result.current.handleToggleLock();
      });

      // Assert: Verify only the lock state changes without resetting selection or modes.
      expect(mockSetIsLocked).toHaveBeenCalledWith(false);

      expect(mockClearSelection).not.toHaveBeenCalled();
      expect(mockSetDrawMode).not.toHaveBeenCalled();
      expect(mockSetSelectMode).not.toHaveBeenCalled();
    });
  });

  /**
   * Group of tests covering the deferred execution of navigation after user confirmation.
   */
  describe("Pending Navigation Execution", () => {
    /**
     * Verify that a stored navigation function can be successfully executed after being blocked.
     */
    it("allows executing the pending navigation function", () => {
      // Arrange: Trigger a blocked navigation attempt.
      (useNavigationGuard as Mock).mockReturnValue({ hasUnsavedChanges: true });

      const { result } = renderHook(() => useEditorNavigation(mockResultsId, mockImages, 0));

      act(() => {
        result.current.handleBackNavigation();
      });

      // Assert: Verify the pending function exists and execute it.
      expect(result.current.pendingNavigation).toBeInstanceOf(Function);

      act(() => {
        if (result.current.pendingNavigation) {
          result.current.pendingNavigation();
        }
      });

      // Assert: Verify the deferred navigation finally triggered the router.
      expect(mockPush).toHaveBeenCalledWith(`/results/${mockResultsId}`);
    });
  });
});
