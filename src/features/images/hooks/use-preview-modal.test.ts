import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { usePreviewActions } from "@/features/images/hooks/use-preview-actions";
import { usePreviewEditing } from "@/features/images/hooks/use-preview-editing";
import { usePreviewFileState } from "@/features/images/hooks/use-preview-file-state";
import { usePreviewImage } from "@/features/images/hooks/use-preview-image";
import { usePreviewModal } from "@/features/images/hooks/use-preview-modal";
import { usePreviewNavigation } from "@/features/images/hooks/use-preview-navigation";
import { usePreviewRotation } from "@/features/images/hooks/use-preview-rotation";
import { usePreviewTransform } from "@/features/images/hooks/use-preview-transform";
import { useIsMobile } from "@/hooks/use-mobile";

// Mock the mobile detection hook to control responsive behavior.
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(),
}));

// Mock the file state hook to isolate state management logic.
vi.mock("@/features/images/hooks/use-preview-file-state", () => ({
  usePreviewFileState: vi.fn(),
}));

// Mock the image hook to simulate image loading and dimension handling.
vi.mock("@/features/images/hooks/use-preview-image", () => ({
  usePreviewImage: vi.fn(),
}));

// Mock the rotation hook to control rotation state and logic.
vi.mock("@/features/images/hooks/use-preview-rotation", () => ({
  usePreviewRotation: vi.fn(),
}));

// Mock the editing hook to simulate renaming and editing modes.
vi.mock("@/features/images/hooks/use-preview-editing", () => ({
  usePreviewEditing: vi.fn(),
}));

// Mock the transform hook to simulate zoom and pan state.
vi.mock("@/features/images/hooks/use-preview-transform", () => ({
  usePreviewTransform: vi.fn(),
}));

// Mock the navigation hook to simulate file traversal.
vi.mock("@/features/images/hooks/use-preview-navigation", () => ({
  usePreviewNavigation: vi.fn(),
}));

// Mock the actions hook to capture save, delete, and download calls.
vi.mock("@/features/images/hooks/use-preview-actions", () => ({
  usePreviewActions: vi.fn(),
}));

// Define a standard mock file object for testing.
const mockFile: UploadableFile = {
  id: "1",
  name: "test.jpg",
  key: "test-key",
  url: "blob:url",
  type: "image/jpeg",
  size: 1000,
  file: new File([], "test.jpg"),
  progress: 100,
  status: "success",
  source: "upload",
  dateUploaded: new Date(),
  version: 1,
};

// Define default return values for the file state hook.
const mockFileState = {
  activeFile: mockFile,
  setActiveFile: vi.fn(),
  fileNameBase: "test",
  setFileNameBase: vi.fn(),
  fileExtension: "jpg",
  displayFileName: "test.jpg",
  setDisplayFileName: vi.fn(),
};

// Define default return values for the image hook.
const mockImageState = {
  previewUrl: "blob:preview-url",
  imageDimensions: { width: 800, height: 600 },
};

// Define default return values for the rotation hook.
const mockRotationState = {
  rotation: 0,
  isRotationDirty: false,
  setIsRotationDirty: vi.fn(),
  handleRotate: vi.fn(),
  resetRotation: vi.fn(),
};

// Define default return values for the editing hook.
const mockEditingState = {
  isNameDirty: false,
  setIsNameDirty: vi.fn(),
  isRenaming: false,
  setIsRenaming: vi.fn(),
  titleInputRef: { current: null },
  handleNameChange: vi.fn(),
  isSaving: false,
  setIsSaving: vi.fn(),
  isDeleting: false,
  setIsDeleting: vi.fn(),
};

// Define default return values for the transform hook.
const mockTransformState = {
  transformState: { scale: 1, positionX: 0, positionY: 0, previousScale: 1 },
  setTransformState: vi.fn(),
  viewingBox: { width: 100, height: 100, x: 0, y: 0 },
  setViewingBox: vi.fn(),
};

// Define default return values for the navigation hook.
const mockNavigationState = {
  sortedFiles: [mockFile],
  currentIndex: 0,
  hasNext: true,
  hasPrevious: false,
};

// Define default return values for the actions hook.
const mockActionsState = {
  save: vi.fn(),
  remove: vi.fn(),
  download: vi.fn(),
  isSaving: false,
  isDeleting: false,
  renameMutation: { mutate: vi.fn() },
};

// Test suite for the `usePreviewModal` hook, which orchestrates image preview interactions.
describe("usePreviewModal", () => {
  // Reset all mock functions and establish default return values for dependent hooks.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useIsMobile).mockReturnValue(false);
    vi.mocked(usePreviewFileState).mockReturnValue(mockFileState);
    vi.mocked(usePreviewImage).mockReturnValue(mockImageState);
    vi.mocked(usePreviewRotation).mockReturnValue(mockRotationState);

    vi.mocked(usePreviewEditing).mockReturnValue(
      mockEditingState as unknown as ReturnType<typeof usePreviewEditing>
    );
    vi.mocked(usePreviewTransform).mockReturnValue(
      mockTransformState as unknown as ReturnType<typeof usePreviewTransform>
    );
    vi.mocked(usePreviewNavigation).mockReturnValue(
      mockNavigationState as unknown as ReturnType<typeof usePreviewNavigation>
    );
    vi.mocked(usePreviewActions).mockReturnValue(
      mockActionsState as unknown as ReturnType<typeof usePreviewActions>
    );
  });

  // Default props passed to the hook during tests.
  const defaultProps = {
    file: mockFile,
    isOpen: true,
    onClose: vi.fn(),
    onNext: vi.fn(),
    onPrevious: vi.fn(),
  };

  /**
   * Test case to verify that the hook correctly combines state from all sub-hooks.
   */
  it("aggregates state from all child hooks correctly", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => usePreviewModal(defaultProps));

    // Assert: Verify that the returned state matches the mocked sub-hook states.
    expect(result.current.activeFile).toBe(mockFile);
    expect(result.current.previewUrl).toBe(mockImageState.previewUrl);
    expect(result.current.rotation).toBe(mockRotationState.rotation);
    expect(result.current.isRenaming).toBe(mockEditingState.isRenaming);
    expect(result.current.transformState).toEqual(mockTransformState.transformState);
    expect(result.current.hasNext).toBe(mockNavigationState.hasNext);
    expect(result.current.isSaving).toBe(mockActionsState.isSaving);
  });

  /**
   * Test case to ensure no new name is passed to actions when no renaming has occurred.
   */
  it("passes correct derived name to usePreviewActions when clean", () => {
    // Arrange: Render the hook with default (clean) state.
    renderHook(() => usePreviewModal(defaultProps));

    // Assert: Check that usePreviewActions received a null newName.
    expect(usePreviewActions).toHaveBeenCalledWith(
      expect.objectContaining({
        newName: null,
      })
    );
  });

  /**
   * Test case to ensure the new file name is passed to actions when renaming is active.
   */
  it("passes correct derived name to usePreviewActions when dirty", () => {
    // Arrange: Simulate a dirty name state in the editing hook.
    vi.mocked(usePreviewEditing).mockReturnValue({
      ...mockEditingState,
      isNameDirty: true,
    } as unknown as ReturnType<typeof usePreviewEditing>);

    // Act: Render the hook.
    renderHook(() => usePreviewModal(defaultProps));

    // Assert: Verify that usePreviewActions received the constructed filename.
    expect(usePreviewActions).toHaveBeenCalledWith(
      expect.objectContaining({
        newName: "test.jpg",
      })
    );
  });

  // Group of tests verifying event handler functions exposed by the hook.
  describe("handlers", () => {
    /**
     * Test case to verify save is triggered when the file name is modified.
     */
    it("handleSave calls save action if name is dirty", () => {
      // Arrange: Set dirty state for name.
      vi.mocked(usePreviewEditing).mockReturnValue({
        ...mockEditingState,
        isNameDirty: true,
      } as unknown as ReturnType<typeof usePreviewEditing>);

      const { result } = renderHook(() => usePreviewModal(defaultProps));

      // Act: Trigger the handleSave function.
      act(() => {
        result.current.handleSave();
      });

      // Assert: Ensure the save action was called.
      expect(mockActionsState.save).toHaveBeenCalled();
    });

    /**
     * Test case to verify save is triggered when the image rotation is modified.
     */
    it("handleSave calls save action if rotation is dirty", () => {
      // Arrange: Set dirty state for rotation.
      vi.mocked(usePreviewRotation).mockReturnValue({
        ...mockRotationState,
        isRotationDirty: true,
      });

      const { result } = renderHook(() => usePreviewModal(defaultProps));

      // Act: Trigger the handleSave function.
      act(() => {
        result.current.handleSave();
      });

      // Assert: Ensure the save action was called.
      expect(mockActionsState.save).toHaveBeenCalled();
    });

    /**
     * Test case to verify save is ignored when no changes exist.
     */
    it("handleSave does nothing if no changes", () => {
      // Arrange: Render the hook with default clean state.
      const { result } = renderHook(() => usePreviewModal(defaultProps));

      // Act: Trigger the handleSave function.
      act(() => {
        result.current.handleSave();
      });

      // Assert: Ensure the save action was not called.
      expect(mockActionsState.save).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that input changes are delegated to the editing hook.
     */
    it("handleNameChange calls base handler with setter", () => {
      // Arrange: Render the hook and create a mock event.
      const { result } = renderHook(() => usePreviewModal(defaultProps));
      const mockEvent = { target: { value: "new" } } as React.ChangeEvent<HTMLInputElement>;

      // Act: Trigger the name change handler.
      act(() => {
        result.current.handleNameChange(mockEvent);
      });

      // Assert: Verify delegation to the editing hook.
      expect(mockEditingState.handleNameChange).toHaveBeenCalledWith(
        mockEvent,
        mockFileState.setFileNameBase
      );
    });

    /**
     * Test case to verify that delete requests are forwarded to the actions hook.
     */
    it("handleDelete calls remove action", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => usePreviewModal(defaultProps));

      // Act: Trigger the delete handler.
      act(() => {
        result.current.handleDelete();
      });

      // Assert: Ensure the remove action was called.
      expect(mockActionsState.remove).toHaveBeenCalled();
    });

    /**
     * Test case to verify that download requests are forwarded to the actions hook.
     */
    it("handleDownload calls download action", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => usePreviewModal(defaultProps));

      // Act: Trigger the download handler.
      act(() => {
        result.current.handleDownload();
      });

      // Assert: Ensure the download action was called.
      expect(mockActionsState.download).toHaveBeenCalled();
    });
  });

  // Group of tests verifying the behavior of the success callback provided to actions.
  describe("onSuccess callback passed to usePreviewActions", () => {
    /**
     * Test case to verify that state is reset after a successful save operation.
     */
    it("resets all dirty states when triggered", () => {
      // Arrange: Set up dirty states and render hook.
      vi.mocked(usePreviewEditing).mockReturnValue({
        ...mockEditingState,
        isNameDirty: true,
      } as unknown as ReturnType<typeof usePreviewEditing>);
      vi.mocked(usePreviewRotation).mockReturnValue({
        ...mockRotationState,
        isRotationDirty: true,
      });

      renderHook(() => usePreviewModal(defaultProps));

      // Arrange: Retrieve the props passed to usePreviewActions.
      const passedProps = vi.mocked(usePreviewActions).mock.lastCall?.[0];

      expect(passedProps).toHaveProperty("onSuccess");
      const onSuccess = passedProps?.onSuccess as () => void;

      // Act: Manually invoke the onSuccess callback passed to the actions hook.
      act(() => {
        onSuccess();
      });

      // Assert: Verify that dirty flags and renaming mode are reset.
      expect(mockEditingState.setIsNameDirty).toHaveBeenCalledWith(false);
      expect(mockRotationState.setIsRotationDirty).toHaveBeenCalledWith(false);
      expect(mockEditingState.setIsRenaming).toHaveBeenCalledWith(false);

      // Assert: Verify that the display name is updated.
      expect(mockFileState.setDisplayFileName).toHaveBeenCalledWith("test.jpg");
    });

    /**
     * Test case to verify that the display name remains unchanged if only rotation was saved.
     */
    it("does not update display name if name was not dirty", () => {
      // Arrange: Render the hook with default name state (not dirty).
      renderHook(() => usePreviewModal(defaultProps));

      const passedProps = vi.mocked(usePreviewActions).mock.lastCall?.[0];
      const onSuccess = passedProps?.onSuccess as () => void;

      // Act: Invoke the success callback.
      act(() => {
        onSuccess();
      });

      // Assert: Verify that renaming state is reset but display name is untouched.
      expect(mockEditingState.setIsNameDirty).toHaveBeenCalledWith(false);
      expect(mockFileState.setDisplayFileName).not.toHaveBeenCalled();
    });
  });
});
