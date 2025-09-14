import { useMutation } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type UploadableFile, useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { createUpload } from "@/features/upload/actions/create-upload";
import { saveUpload } from "@/features/upload/actions/save-upload";
import { useFileProcessor } from "@/features/upload/hooks/use-file-processor";

// Mock the `sonner` toast library to spy on success and error notifications.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the state management store dependency.
vi.mock("@/features/analyze/store/analyze-store");

// Mock the server actions for generating presigned URLs and saving upload metadata.
vi.mock("@/features/upload/actions/create-upload", () => ({
  createUpload: vi.fn(),
}));

vi.mock("@/features/upload/actions/save-upload", () => ({
  saveUpload: vi.fn(),
}));

// Mock the `react-query` hook to control mutation behavior and responses.
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useMutation: vi.fn(),
  };
});

// Mock `URL.createObjectURL` and `URL.revokeObjectURL` for file handling without side effects.
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

// Mock the global `Image` constructor to simulate image loading success, failure, and dimension extraction.
class MockImage {
  onload: () => void = () => {};
  onerror: () => void = () => {};
  private _src = "";
  naturalWidth = 1920;
  naturalHeight = 1080;

  set src(value: string) {
    this._src = value;
    // Simulate async loading process.
    setTimeout(() => {
      if (value.includes("fail")) {
        this.onerror();
      } else {
        this.onload();
      }
    }, 10);
  }

  get src() {
    return this._src;
  }
}
global.Image = MockImage as unknown as typeof Image;

// Mock the global `XMLHttpRequest` to simulate the S3 file upload network request.
class MockXHR {
  open = vi.fn();
  send = vi.fn();
  setRequestHeader = vi.fn();
  upload = { onprogress: vi.fn() };
  onload = vi.fn();
  onerror = vi.fn();
  status = 200;
  responseText = "";

  // Helper to manually trigger the upload progress event.
  __simulateProgress(loaded: number, total: number) {
    if (this.upload.onprogress) {
      this.upload.onprogress({ lengthComputable: true, loaded, total } as ProgressEvent);
    }
  }

  // Helper to manually trigger the upload completion (load) event.
  __simulateLoad(status = 200) {
    this.status = status;
    if (this.onload) this.onload({} as ProgressEvent);
  }

  // Helper to manually trigger a network error event.
  __simulateError() {
    if (this.onerror) this.onerror({} as ProgressEvent);
  }
}

/**
 * Test suite for the `useFileProcessor` hook.
 */
describe("useFileProcessor", () => {
  // Mocks for store functions to track updates to file status and progress.
  const mockUpdateFileProgress = vi.fn();
  const mockSetUploadStatus = vi.fn();
  const mockSetUploadKey = vi.fn();
  const mockSetUploadUrl = vi.fn();

  // Array to hold mock files and track their state changes within the hook.
  let mockFiles: UploadableFile[] = [];
  // Variable to hold the currently active mock XHR instance for direct control of upload events.
  let activeXHR: MockXHR | null = null;

  // Mocks for the react-query mutation functions.
  const mockPresignedMutateAsync = vi.fn();
  const mockSaveMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Arrange: Define the default mock file content.
    mockFiles = [
      {
        id: "file-1",
        name: "test.jpg",
        size: 1024,
        type: "image/jpeg",
        status: "pending",
        key: "",
        url: "",
        progress: 0,
        source: "upload",
        dateUploaded: new Date(),
        version: 123,
        file: new File(["content"], "test.jpg", { type: "image/jpeg" }),
      },
    ];

    // Arrange: Implement mock store functions to update the local `mockFiles` array, simulating the store's behavior.
    mockSetUploadKey.mockImplementation((id: string, key: string) => {
      const f = mockFiles.find((x) => x.id === id);
      if (f) f.key = key;
    });

    mockSetUploadStatus.mockImplementation((id: string, status: UploadableFile["status"]) => {
      const f = mockFiles.find((x) => x.id === id);
      if (f) f.status = status;
    });

    // Arrange: Mock the `useAnalyzeStore` return value with the mock functions.
    vi.mocked(useAnalyzeStore).mockReturnValue({
      updateFileProgress: mockUpdateFileProgress,
      setUploadStatus: mockSetUploadStatus,
      setUploadKey: mockSetUploadKey,
      setUploadUrl: mockSetUploadUrl,
    } as unknown as ReturnType<typeof useAnalyzeStore>);

    // Arrange: Mock `useAnalyzeStore.getState` to return the current `mockFiles` state.
    (
      useAnalyzeStore as unknown as { getState: () => { data: { files: UploadableFile[] } } }
    ).getState = vi.fn(() => ({
      data: {
        files: mockFiles,
      },
    }));

    activeXHR = null;
    // Arrange: Stub global `XMLHttpRequest` to return a controlled `MockXHR` instance.
    vi.stubGlobal(
      "XMLHttpRequest",
      class {
        constructor() {
          // Ensure only one active XHR exists for the current test run.
          if (!activeXHR) {
            const xhr = new MockXHR();
            activeXHR = xhr;
            return xhr;
          }
          return activeXHR;
        }
      }
    );

    // Arrange: Mock `useMutation` to return the appropriate mock async/sync mutate functions based on the action being called.
    vi.mocked(useMutation).mockImplementation((options: { mutationFn?: unknown }) => {
      if (options.mutationFn === createUpload) {
        return {
          mutateAsync: mockPresignedMutateAsync,
        } as unknown as ReturnType<typeof useMutation>;
      }
      if (options.mutationFn === saveUpload) {
        return {
          mutate: (vars: unknown) => {
            mockSaveMutate(vars);
          },
        } as unknown as ReturnType<typeof useMutation>;
      }
      return {} as unknown as ReturnType<typeof useMutation>;
    });
  });

  afterEach(() => {
    // Arrange: Restore global mocks after tests.
    vi.unstubAllGlobals();
  });

  // Helper function to retrieve the options passed to the `saveUpload` mutation setup for testing callbacks.
  const getSaveMutationOptions = () => {
    const calls = vi.mocked(useMutation).mock.calls;
    const saveCall = calls.find((call) => {
      const options = call[0] as { mutationFn?: unknown };
      return options.mutationFn === saveUpload;
    });

    return saveCall
      ? (saveCall[0] as {
          onSuccess?: (data: unknown, variables: unknown, context: unknown) => void;
          onError?: (error: unknown, variables: unknown, context: unknown) => void;
        })
      : null;
  };

  /**
   * Test case to verify that the processing logic is skipped when no files are in the "pending" state.
   */
  it("does nothing if no pending files are present", () => {
    // Arrange: Define files as already "success" and render the hook.
    const files = [{ ...mockFiles[0], status: "success" } as UploadableFile];
    renderHook(() => useFileProcessor({ files, caseId: "case-123" }));

    // Assert: Check that none of the upload actions were initiated.
    expect(createUpload).not.toHaveBeenCalled();
    expect(mockPresignedMutateAsync).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the processing logic is skipped when the required `caseId` is missing.
   */
  it("does nothing if caseId is missing", () => {
    // Arrange: Render the hook with a null `caseId`.
    renderHook(() => useFileProcessor({ files: mockFiles, caseId: null }));
    // Assert: Check that the presigned URL generation was not attempted.
    expect(mockPresignedMutateAsync).not.toHaveBeenCalled();
  });

  /**
   * Test case for the full successful file upload workflow: presigned URL generation, S3 upload, progress tracking, and metadata saving.
   */
  it("handles successful upload flow", async () => {
    // Arrange: Mock successful presigned URL generation.
    mockPresignedMutateAsync.mockResolvedValue({
      success: true,
      data: { key: "s3-key-123", url: "https://s3-upload-url.com" },
    });

    // Act: Render the hook.
    renderHook(() => useFileProcessor({ files: mockFiles, caseId: "case-123" }));

    // Assert (Step 1: Presigned URL Request): Wait for the status to change to "uploading".
    await waitFor(() => {
      expect(mockSetUploadStatus).toHaveBeenCalledWith("file-1", "uploading");
    });

    // Assert: Check that `createUpload` (presigned URL generation) was called with correct file metadata and `caseId`.
    expect(mockPresignedMutateAsync).toHaveBeenCalledWith({
      fileName: "test.jpg",
      fileSize: 7, // Size of "content" file buffer
      fileType: "image/jpeg",
      caseId: "case-123",
    });

    // Assert (Step 2: S3 Upload Initiation): Wait for the XHR to be initialized and sent.
    await waitFor(() => {
      expect(mockSetUploadKey).toHaveBeenCalledWith("file-1", "s3-key-123");
      expect(activeXHR).not.toBeNull();
      expect(activeXHR?.open).toHaveBeenCalledWith("PUT", "https://s3-upload-url.com", true);
      expect(activeXHR?.send).toHaveBeenCalled();
    });

    // Act (Step 3: Progress Update): Simulate a progress event (50% complete).
    activeXHR!.__simulateProgress(512, 1024);
    // Assert: Check that the store received the progress update.
    expect(mockUpdateFileProgress).toHaveBeenCalledWith("file-1", 50);

    // Act (Step 4: S3 Upload Completion): Simulate XHR success (status 200).
    activeXHR!.__simulateLoad(200);

    // Assert (Step 5: Metadata Save Initiation): Wait for the `saveUpload` mutation to be called.
    await waitFor(() => {
      expect(mockSaveMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "file-1",
          key: "s3-key-123",
          width: 1920, // Mocked dimension
          height: 1080, // Mocked dimension
        })
      );
    });

    // Arrange (Step 6: Metadata Save Completion): Get the `onSuccess` callback for `saveUpload`.
    const options = getSaveMutationOptions();
    if (!options?.onSuccess) throw new Error("Save mutation onSuccess not found");

    // Act: Manually call the `onSuccess` callback with final successful save data.
    options.onSuccess(
      { success: true, data: { url: "final-url" } },
      { id: "file-1", name: "test.jpg" },
      undefined
    );

    // Assert: Check that the final status is set to "success", the final URL is set, and a success toast is shown.
    expect(mockSetUploadStatus).toHaveBeenCalledWith("file-1", "success");
    expect(mockSetUploadUrl).toHaveBeenCalledWith("file-1", "final-url");
    expect(toast.success).toHaveBeenCalledWith("test.jpg uploaded.");
  });

  /**
   * Test case to handle failure during the initial step of obtaining the presigned S3 URL.
   */
  it("handles errors during presigned URL generation", async () => {
    // Arrange: Mock presigned URL generation to return a server error.
    mockPresignedMutateAsync.mockResolvedValue({ success: false, error: "Server Error" });

    // Act: Render the hook.
    renderHook(() => useFileProcessor({ files: mockFiles, caseId: "case-123" }));

    // Assert: Wait for the status to change to "error" and an error toast to appear.
    await waitFor(() => {
      expect(mockSetUploadStatus).toHaveBeenCalledWith("file-1", "error");
    });
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("failed to upload"));
  });

  /**
   * Test case to handle network errors during the S3 file upload (XHR `onerror`).
   */
  it("handles S3 upload network error", async () => {
    // Arrange: Mock successful presigned URL but simulate XHR network failure.
    mockPresignedMutateAsync.mockResolvedValue({
      success: true,
      data: { key: "key", url: "url" },
    });

    // Act: Render the hook.
    renderHook(() => useFileProcessor({ files: mockFiles, caseId: "case-123" }));

    // Act: Wait for XHR to be ready, then simulate network error.
    await waitFor(() => expect(activeXHR).not.toBeNull());
    activeXHR!.__simulateError();

    // Assert: Check that the file status is updated to "error" and a general error toast is shown.
    expect(mockSetUploadStatus).toHaveBeenCalledWith("file-1", "error");
    expect(toast.error).toHaveBeenCalledWith("An error occurred while uploading test.jpg.");
  });

  /**
   * Test case to handle non-successful HTTP status codes during the S3 file upload (XHR `onload`).
   */
  it("handles S3 upload non-200 status", async () => {
    // Arrange: Mock successful presigned URL but simulate XHR load with 403 status.
    mockPresignedMutateAsync.mockResolvedValue({
      success: true,
      data: { key: "key", url: "url" },
    });

    // Act: Render the hook.
    renderHook(() => useFileProcessor({ files: mockFiles, caseId: "case-123" }));

    // Act: Wait for XHR to be ready, then simulate load with a 403 forbidden status.
    await waitFor(() => expect(activeXHR).not.toBeNull());
    activeXHR!.__simulateLoad(403);

    // Assert: Check that the file status is updated to "error" and an upload failed toast is shown.
    expect(mockSetUploadStatus).toHaveBeenCalledWith("file-1", "error");
    expect(toast.error).toHaveBeenCalledWith("test.jpg upload failed.");
  });

  /**
   * Test case to handle failure during the extraction of image dimensions using the mocked `Image` constructor.
   */
  it("handles image dimension extraction failure", async () => {
    // Arrange: Mock successful presigned URL generation.
    mockPresignedMutateAsync.mockResolvedValue({
      success: true,
      data: { key: "key", url: "url" },
    });

    // Arrange: Temporarily replace the global `Image` mock to simulate an `onerror` event.
    const OriginalImage = global.Image;
    class FailImage extends MockImage {
      set src(_v: string) {
        setTimeout(() => this.onerror(), 0);
      }
    }
    global.Image = FailImage as unknown as typeof Image;

    // Act: Render the hook.
    renderHook(() => useFileProcessor({ files: mockFiles, caseId: "case-123" }));

    // Act: Wait for XHR to be ready and simulate a successful S3 upload.
    await waitFor(() => expect(activeXHR).not.toBeNull());
    activeXHR!.__simulateLoad(200);

    // Assert: Wait for file status to be set to "error" due to image loading failure and check the error toast content.
    await waitFor(() => {
      expect(mockSetUploadStatus).toHaveBeenCalledWith("file-1", "error");
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Could not extract dimensions")
      );
    });

    // Arrange: Restore the original Image mock.
    global.Image = OriginalImage;
  });

  /**
   * Test case to handle failure when saving file metadata to the database after the S3 upload is complete.
   */
  it("handles metadata save failure logic", async () => {
    // Arrange: Mock successful presigned URL generation.
    mockPresignedMutateAsync.mockResolvedValue({
      success: true,
      data: { key: "key", url: "url" },
    });

    // Act: Render the hook.
    renderHook(() => useFileProcessor({ files: mockFiles, caseId: "case-123" }));

    // Act: Wait for XHR to be ready and simulate a successful S3 upload.
    await waitFor(() => expect(activeXHR).not.toBeNull());
    activeXHR!.__simulateLoad(200);

    // Assert: Wait for the `saveUpload` mutation to be called.
    await waitFor(() => expect(mockSaveMutate).toHaveBeenCalled());

    // Arrange: Get the `onSuccess` callback for `saveUpload`.
    const options = getSaveMutationOptions();
    if (!options?.onSuccess) throw new Error("Save mutation onSuccess not found");

    // Act: Manually call the `onSuccess` callback with a server-side DB error response.
    options.onSuccess(
      { success: false, error: "DB Error" },
      { id: "file-1", name: "test.jpg" },
      undefined
    );

    // Assert: Check that file status is set to "error" and the specific DB error is shown in a toast.
    expect(mockSetUploadStatus).toHaveBeenCalledWith("file-1", "error");
    expect(toast.error).toHaveBeenCalledWith("Failed to save test.jpg: DB Error");
  });

  /**
   * Test case to handle network errors during the metadata save process (mutation `onError`).
   */
  it("handles network error during metadata save", async () => {
    // Arrange: Mock successful presigned URL generation.
    mockPresignedMutateAsync.mockResolvedValue({
      success: true,
      data: { key: "key", url: "url" },
    });

    // Act: Render the hook, simulate S3 upload completion, and wait for `saveUpload` initiation.
    renderHook(() => useFileProcessor({ files: mockFiles, caseId: "case-123" }));
    await waitFor(() => expect(activeXHR).not.toBeNull());
    activeXHR!.__simulateLoad(200);
    await waitFor(() => expect(mockSaveMutate).toHaveBeenCalled());

    // Arrange: Get the `onError` callback for `saveUpload`.
    const options = getSaveMutationOptions();
    if (!options?.onError) throw new Error("Save mutation onError not found");

    // Act: Manually call the `onError` callback with a network error instance.
    options.onError(new Error("Net Error"), { id: "file-1", name: "test.jpg" }, undefined);

    // Assert: Check that file status is set to "error" and a general save error toast is displayed.
    expect(mockSetUploadStatus).toHaveBeenCalledWith("file-1", "error");
    expect(toast.error).toHaveBeenCalledWith("An error occurred while saving test.jpg.");
  });

  /**
   * Test case to verify error handling when the S3 key is unexpectedly missing after a successful S3 upload.
   */
  it("raises error if key is missing after upload completes", async () => {
    // Arrange: Mock successful presigned URL generation.
    mockPresignedMutateAsync.mockResolvedValue({
      success: true,
      data: { key: "temp-key", url: "https://url.com" },
    });

    // Act: Render the hook.
    renderHook(() => useFileProcessor({ files: mockFiles, caseId: "case-123" }));

    // Arrange: Wait for XHR to be ready and intentionally reset the file's `key` to simulate a missing key state.
    await waitFor(() => expect(activeXHR).not.toBeNull());
    const file = mockFiles.find((f) => f.id === "file-1");
    if (file) {
      file.key = "";
    }

    // Act: Simulate successful S3 upload completion.
    activeXHR!.__simulateLoad(200);

    // Assert: Wait for the status update to "error" and check for the specific missing key error message.
    await waitFor(() => {
      expect(mockSetUploadStatus).toHaveBeenCalledWith("file-1", "error");
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("S3 key is missing"));
    });
  });
});
