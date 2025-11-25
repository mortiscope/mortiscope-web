import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { renderHook } from "@/__tests__/setup/test-utils";
import { type UploadableFile, useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { usePreviewActions } from "@/features/images/hooks/use-preview-actions";
import { usePreviewMutations } from "@/features/images/hooks/use-preview-mutations";
import { useClientFileProcessor } from "@/features/upload/hooks/use-client-file-processor";

// Mock the analyze store to control global state during tests.
vi.mock("@/features/analyze/store/analyze-store", () => ({
  useAnalyzeStore: vi.fn(),
}));

// Mock preview mutations to simulate server interactions.
vi.mock("@/features/images/hooks/use-preview-mutations", () => ({
  usePreviewMutations: vi.fn(),
}));

// Mock client file processor to avoid actual file manipulation.
vi.mock("@/features/upload/hooks/use-client-file-processor", () => ({
  useClientFileProcessor: vi.fn(),
}));

// Mock toast notifications to verify user feedback.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Creates a wrapper component with QueryClientProvider for React Query hooks.
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return TestWrapper;
};

// Define a standard file object to be used as the active file in tests.
const mockActiveFile: UploadableFile = {
  id: "file-1",
  key: "test-key.jpg",
  url: "http://example.com/image.jpg",
  name: "image.jpg",
  type: "image/jpeg",
  size: 1024,
  file: new File([""], "image.jpg", { type: "image/jpeg" }),
  progress: 100,
  status: "success",
  source: "upload",
  dateUploaded: new Date(),
  version: 1,
};

// Define default mock actions for the analyze store.
const mockStoreActions = {
  caseId: "case-123",
  updateFile: vi.fn(),
  removeFile: vi.fn(),
  setUploadStatus: vi.fn(),
};

// Define default mock actions for the file processor.
const mockProcessorActions = {
  ensureFileBlob: vi.fn(),
  processRotation: vi.fn(),
  downloadFile: vi.fn(),
};

// Helper to create a mock mutation object with standard properties.
const createMockMutation = () => ({
  mutateAsync: vi.fn(),
  mutate: vi.fn(),
  isPending: false,
});

// Group all mutation mocks for easy reference.
const mockMutations = {
  presignedUrlMutation: createMockMutation(),
  renameMutation: createMockMutation(),
  updateUploadMutation: createMockMutation(),
  deleteMutation: createMockMutation(),
};

// Test suite verifying the functionality of the file preview actions hook.
describe("usePreviewActions", () => {
  // Reset mocks and establish default behaviors before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAnalyzeStore).mockReturnValue(mockStoreActions);
    vi.mocked(useClientFileProcessor).mockReturnValue(mockProcessorActions);

    vi.mocked(usePreviewMutations).mockReturnValue(
      mockMutations as unknown as ReturnType<typeof usePreviewMutations>
    );

    mockProcessorActions.ensureFileBlob.mockResolvedValue(mockActiveFile.file);
    // FIX: Provide a default return value for processRotation to avoid "cannot read 'name' of undefined"
    mockProcessorActions.processRotation.mockResolvedValue(
      new File(["rotated"], "rotated.jpg", { type: "image/jpeg" })
    );

    global.fetch = vi.fn();
    (global.fetch as Mock).mockResolvedValue({ ok: true });
  });

  // Default properties passed to the hook during tests.
  const defaultProps = {
    activeFile: mockActiveFile,
    previewUrl: "blob:url",
    rotation: 0,
    isRotationDirty: false,
    newName: null,
    onSuccess: vi.fn(),
    onClose: vi.fn(),
  };

  /**
   * Test case to confirm the hook exposes expected methods and state upon initialization.
   */
  it("initializes correctly", () => {
    // Arrange: Render the hook within the test wrapper.
    const { result } = renderHook(() => usePreviewActions(defaultProps), {
      wrapper: createWrapper(),
    });

    // Assert: Check that save, remove, and download functions are present.
    expect(result.current.save).toBeDefined();
    expect(result.current.remove).toBeDefined();
    expect(result.current.download).toBeDefined();
    expect(result.current.isSaving).toBe(false);
  });

  // Test suite for the save operation, including renaming and rotation handling.
  describe("save", () => {
    /**
     * Test case to verify save aborts if no file is active.
     */
    it("returns early if no activeFile", async () => {
      // Arrange: Initialize hook with activeFile set to null.
      const { result } = renderHook(
        () => usePreviewActions({ ...defaultProps, activeFile: null }),
        { wrapper: createWrapper() }
      );
      // Act: Attempt to save without a file.
      await result.current.save();
      // Assert: Ensure status update was not called.
      expect(mockStoreActions.setUploadStatus).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify validation error when caseId is absent.
     */
    it("errors if caseId is missing", async () => {
      // Arrange: Mock the store to return null caseId.
      vi.mocked(useAnalyzeStore).mockReturnValue({
        ...mockStoreActions,
        caseId: null,
      });
      const { result } = renderHook(() => usePreviewActions(defaultProps), {
        wrapper: createWrapper(),
      });

      // Act: Trigger the save operation.
      await result.current.save();

      // Assert: Confirm error toast is shown and status remains unchanged.
      expect(toast.error).toHaveBeenCalledWith("Cannot save changes. Case ID is missing.");
      expect(mockStoreActions.setUploadStatus).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify the complete rename process including API calls and state updates.
     */
    it("handles rename flow", async () => {
      // Arrange: Configure mocks for successful rename and metadata update.
      const newName = "renamed.jpg";
      mockMutations.renameMutation.mutateAsync.mockResolvedValue({
        success: true,
        data: { newKey: "new-key", newUrl: "new-url" },
      });
      mockMutations.updateUploadMutation.mutateAsync.mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => usePreviewActions({ ...defaultProps, newName }), {
        wrapper: createWrapper(),
      });

      // Act: Execute save with a new filename.
      await result.current.save();

      // Assert: Verify mutations, store updates, and success toast.
      expect(mockStoreActions.setUploadStatus).toHaveBeenCalledWith(mockActiveFile.id, "uploading");
      expect(mockMutations.renameMutation.mutateAsync).toHaveBeenCalledWith({
        oldKey: mockActiveFile.key,
        newFileName: newName,
      });
      expect(mockMutations.updateUploadMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "new-key",
          name: newName,
        })
      );
      // The `url` field should NOT be passed to prevent storing presigned URLs in the database.
      expect(mockMutations.updateUploadMutation.mutateAsync).toHaveBeenCalledWith(
        expect.not.objectContaining({ url: expect.anything() })
      );
      expect(mockStoreActions.updateFile).toHaveBeenCalled();
      expect(mockStoreActions.setUploadStatus).toHaveBeenCalledWith(mockActiveFile.id, "success");
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
    });

    /**
     * Test case to verify the rotation process including image processing and re-upload.
     */
    it("handles rotation flow", async () => {
      // Arrange: Mock rotation processing and presigned URL generation.
      const rotatedFile = new File(["rotated"], "image.jpg", {
        type: "image/jpeg",
      });
      mockProcessorActions.processRotation.mockResolvedValue(rotatedFile);

      mockMutations.presignedUrlMutation.mutateAsync.mockResolvedValue({
        success: true,
        data: { url: "http://upload-url" },
      });
      mockMutations.updateUploadMutation.mutateAsync.mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(
        () =>
          usePreviewActions({
            ...defaultProps,
            isRotationDirty: true,
            rotation: 90,
          }),
        { wrapper: createWrapper() }
      );

      // Act: Execute save with modified rotation state.
      await result.current.save();

      // Assert: Verify image processing, HTTP upload, and database update.
      expect(mockProcessorActions.processRotation).toHaveBeenCalledWith(expect.any(File), 90);
      expect(mockMutations.presignedUrlMutation.mutateAsync).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        "http://upload-url",
        expect.objectContaining({ method: "PUT" })
      );
      expect(mockMutations.updateUploadMutation.mutateAsync).toHaveBeenCalled();
      expect(mockStoreActions.setUploadStatus).toHaveBeenCalledWith(mockActiveFile.id, "success");
    });

    /**
     * Test case to verify error handling when the rename mutation fails.
     */
    it("handles failure during rename", async () => {
      // Arrange: Mock the rename mutation to return an error.
      mockMutations.renameMutation.mutateAsync.mockResolvedValue({
        success: false,
        error: "Rename error",
      });

      const { result } = renderHook(
        () => usePreviewActions({ ...defaultProps, newName: "new.jpg" }),
        { wrapper: createWrapper() }
      );

      // Act: Attempt to save with a new name.
      await result.current.save();

      // Assert: Confirm error toast is displayed and status is set to error.
      expect(toast.error).toHaveBeenCalledWith("Rename error");
      expect(mockStoreActions.setUploadStatus).toHaveBeenCalledWith(mockActiveFile.id, "error");
    });

    /**
     * Test case to verify error handling when presigned URL generation fails.
     */
    it("handles failure during upload (presign)", async () => {
      // Arrange: Mock presigned URL mutation to return failure.
      mockMutations.presignedUrlMutation.mutateAsync.mockResolvedValue({
        success: false,
      });

      const { result } = renderHook(
        () => usePreviewActions({ ...defaultProps, isRotationDirty: true }),
        { wrapper: createWrapper() }
      );

      // Act: Attempt to save a rotated image.
      await result.current.save();

      // Assert: Check for specific error message regarding re-upload preparation.
      expect(toast.error).toHaveBeenCalledWith("Failed to prepare re-upload for rotated image.");
      expect(mockStoreActions.setUploadStatus).toHaveBeenCalledWith(mockActiveFile.id, "error");
    });

    /**
     * Test case to verify error handling when the actual file upload fails.
     */
    it("handles failure during upload (fetch)", async () => {
      // Arrange: Mock successful presign but failed fetch request.
      mockMutations.presignedUrlMutation.mutateAsync.mockResolvedValue({
        success: true,
        data: { url: "url" },
      });
      (global.fetch as Mock).mockResolvedValue({ ok: false });

      const { result } = renderHook(
        () => usePreviewActions({ ...defaultProps, isRotationDirty: true }),
        { wrapper: createWrapper() }
      );

      // Act: Trigger the save operation.
      await result.current.save();

      // Assert: Verify error toast for upload failure.
      expect(toast.error).toHaveBeenCalledWith("Failed to upload rotated image.");
      expect(mockStoreActions.setUploadStatus).toHaveBeenCalledWith(mockActiveFile.id, "error");
    });

    /**
     * Test case to verify error handling when database update fails after successful rename.
     */
    it("handles failure during db update after save", async () => {
      // Arrange: Mock successful rename but failed DB update.
      // Mock successful rename
      mockMutations.renameMutation.mutateAsync.mockResolvedValue({
        success: true,
        data: { newKey: "new-key", newUrl: "new-url" },
      });
      // Mock failed DB update
      mockMutations.updateUploadMutation.mutateAsync.mockResolvedValue({
        success: false,
        error: "DB Error",
      });

      const { result } = renderHook(
        () => usePreviewActions({ ...defaultProps, newName: "new.jpg" }),
        {
          wrapper: createWrapper(),
        }
      );

      // Act: Execute the save flow.
      await result.current.save();

      // Assert: Confirm error feedback is provided.
      expect(toast.error).toHaveBeenCalledWith("DB Error");
      expect(toast.error).toHaveBeenCalledWith("DB Error");
      expect(mockStoreActions.setUploadStatus).toHaveBeenCalledWith(mockActiveFile.id, "error");
    });

    /**
     * Test case to verify validation prevents renaming files without an S3 key.
     */
    it("errors if renaming validation fails (missing key)", async () => {
      // Arrange: Create a file object missing the key property.
      const fileWithoutKey = { ...mockActiveFile, key: undefined } as unknown as UploadableFile;
      const { result } = renderHook(
        () =>
          usePreviewActions({ ...defaultProps, activeFile: fileWithoutKey, newName: "new.jpg" }),
        { wrapper: createWrapper() }
      );

      // Act: Attempt to save a rename operation.
      await result.current.save();

      // Assert: Verify immediate validation error toast.
      expect(toast.error).toHaveBeenCalledWith("Cannot rename file: S3 key is missing.");
    });

    /**
     * Test case to verify validation prevents rotating files without an S3 key.
     */
    it("errors if rotation validation fails (missing key)", async () => {
      // Arrange: Create a file object missing the key property.
      const fileWithoutKey = { ...mockActiveFile, key: undefined } as unknown as UploadableFile;
      const { result } = renderHook(
        () =>
          usePreviewActions({
            ...defaultProps,
            activeFile: fileWithoutKey,
            isRotationDirty: true,
          }),
        { wrapper: createWrapper() }
      );

      // Act: Attempt to save a rotation operation.
      await result.current.save();

      // Assert: Verify immediate validation error toast.
      expect(toast.error).toHaveBeenCalledWith("Cannot save rotation: S3 key is missing.");
    });

    /**
     * Test case to verify handling of malformed server responses during rename.
     */
    it("handles rename mutation missing data payload", async () => {
      // Arrange: Mock rename success but return undefined data.
      mockMutations.renameMutation.mutateAsync.mockResolvedValue({
        success: true,
        data: undefined,
      });

      const { result } = renderHook(
        () => usePreviewActions({ ...defaultProps, newName: "new.jpg" }),
        { wrapper: createWrapper() }
      );

      // Act: Trigger the save operation.
      await result.current.save();

      // Assert: Confirm generic failure toast.
      expect(toast.error).toHaveBeenCalledWith("Rename failed on server.");
    });

    /**
     * Test case to verify that save is skipped when a deletion is already pending.
     */
    it("returns early if deletion is pending", async () => {
      // Arrange: Mock the delete mutation to be in a pending state.
      vi.mocked(usePreviewMutations).mockReturnValue({
        ...mockMutations,
        deleteMutation: { ...mockMutations.deleteMutation, isPending: true },
      } as unknown as ReturnType<typeof usePreviewMutations>);

      const { result } = renderHook(() => usePreviewActions(defaultProps), {
        wrapper: createWrapper(),
      });

      // Act: Attempt to save while deletion is pending.
      await result.current.save();

      // Assert: Ensure status update was not called.
      expect(mockStoreActions.setUploadStatus).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that a non-Error thrown during save is handled with a fallback message.
     */
    it("handles non-Error thrown during save with fallback message", async () => {
      // Arrange: Mock `ensureFileBlob` to reject with a non-Error value.
      mockProcessorActions.ensureFileBlob.mockRejectedValue("string-error");

      const { result } = renderHook(() => usePreviewActions(defaultProps), {
        wrapper: createWrapper(),
      });

      // Act: Attempt to save.
      await result.current.save();

      // Assert: Verify the fallback error message.
      expect(toast.error).toHaveBeenCalledWith("An unknown error occurred during save.");
      expect(mockStoreActions.setUploadStatus).toHaveBeenCalledWith(mockActiveFile.id, "error");
    });
  });

  // Test suite for file removal operations.
  describe("remove", () => {
    /**
     * Test case to verify removal is skipped if no file is active.
     */
    it("returns early if no activeFile", async () => {
      // Arrange: Initialize hook with activeFile set to null.
      const { result } = renderHook(
        () => usePreviewActions({ ...defaultProps, activeFile: null }),
        { wrapper: createWrapper() }
      );

      // Act: Attempt to remove.
      await result.current.remove();

      // Assert: Ensure no store removal or mutation was called.
      expect(mockStoreActions.removeFile).not.toHaveBeenCalled();
      expect(mockMutations.deleteMutation.mutateAsync).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify removal of local-only files skips server mutations.
     */
    it("removes local file immediately without key", async () => {
      // Arrange: Initialize hook with a local file missing a key.
      const localFile = { ...mockActiveFile, key: undefined } as unknown as UploadableFile;
      const { result } = renderHook(
        () => usePreviewActions({ ...defaultProps, activeFile: localFile }),
        { wrapper: createWrapper() }
      );

      // Act: Call the remove function.
      await result.current.remove();

      // Assert: Verify store removal is called without invoking server delete.
      expect(mockStoreActions.removeFile).toHaveBeenCalledWith(localFile.id);
      expect(mockMutations.deleteMutation.mutateAsync).not.toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    /**
     * Test case to verify server deletion is invoked for uploaded files.
     */
    it("calls delete mutation for server files", async () => {
      // Arrange: Mock delete mutation to execute success callback.
      type MutationOptions = { onSuccess: (data: { success: boolean; error?: string }) => void };

      mockMutations.deleteMutation.mutateAsync.mockImplementation(
        async (_vars: unknown, options: MutationOptions) => {
          options.onSuccess({ success: true });
        }
      );

      const { result } = renderHook(() => usePreviewActions(defaultProps), {
        wrapper: createWrapper(),
      });

      // Act: Call the remove function.
      await result.current.remove();

      // Assert: Verify mutation call and subsequent store removal.
      expect(mockMutations.deleteMutation.mutateAsync).toHaveBeenCalledWith(
        { key: mockActiveFile.key },
        expect.any(Object)
      );
      expect(mockStoreActions.removeFile).toHaveBeenCalledWith(mockActiveFile.id);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    /**
     * Test case to verify error handling when server deletion fails.
     */
    it("handles delete mutation failure", async () => {
      // Arrange: Mock delete mutation to execute success callback with failure status.
      type MutationOptions = { onSuccess: (data: { success: boolean; error?: string }) => void };

      mockMutations.deleteMutation.mutateAsync.mockImplementation(
        async (_vars: unknown, options: MutationOptions) => {
          options.onSuccess({ success: false, error: "Delete failed" });
        }
      );

      const { result } = renderHook(() => usePreviewActions(defaultProps), {
        wrapper: createWrapper(),
      });

      // Act: Attempt to remove the file.
      await result.current.remove();

      // Assert: Confirm error toast and ensure local file is not removed.
      expect(toast.error).toHaveBeenCalledWith("Delete failed");
      expect(mockStoreActions.removeFile).not.toHaveBeenCalled();
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify exception handling during the delete mutation execution.
     */
    it("handles mutation execution error during remove", async () => {
      // Arrange: Mock delete mutation to throw an error.
      type MutationOptions = { onError: (error: Error) => void };

      mockMutations.deleteMutation.mutateAsync.mockImplementation(
        async (_vars: unknown, options: MutationOptions) => {
          options.onError(new Error("Network Error"));
        }
      );

      const { result } = renderHook(() => usePreviewActions(defaultProps), {
        wrapper: createWrapper(),
      });

      // Act: Attempt to remove the file.
      await result.current.remove();

      // Assert: Verify exception is caught and displayed as an error toast.
      expect(toast.error).toHaveBeenCalledWith("Network Error");
      expect(mockStoreActions.removeFile).not.toHaveBeenCalled();
    });
  });

  // Test suite for file download functionality.
  describe("download", () => {
    /**
     * Test case to verify the download action delegates to the file processor.
     */
    it("calls downloadFile processor", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => usePreviewActions(defaultProps), {
        wrapper: createWrapper(),
      });

      // Act: Invoke the download function.
      result.current.download();

      // Assert: Check that the processor's download method was called with correct arguments.
      expect(mockProcessorActions.downloadFile).toHaveBeenCalledWith(
        mockActiveFile,
        defaultProps.previewUrl,
        defaultProps.rotation
      );
    });

    /**
     * Test case to verify that download is skipped when no file is active.
     */
    it("returns early if no activeFile", () => {
      // Arrange: Render the hook with null activeFile.
      const { result } = renderHook(
        () => usePreviewActions({ ...defaultProps, activeFile: null }),
        { wrapper: createWrapper() }
      );

      // Act: Invoke the download function.
      result.current.download();

      // Assert: Ensure the processor's download method was not called.
      expect(mockProcessorActions.downloadFile).not.toHaveBeenCalled();
    });
  });
});
